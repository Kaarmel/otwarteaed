"""Małe testy regresji: python3 test_importu.py (bez sieci)."""
import io
import json
import tempfile
import shutil
import subprocess
from pathlib import Path
from unittest.mock import patch

import importuj


def test_importu():
    records = importuj.import_records()
    assert len(records) == 18375
    assert len({r['aed_id'] for r in records}) == len(records)
    marki = [r for r in records if r['source'] == 'marki']
    assert len(marki) == 8
    assert sum('coordinates_swapped' in r['quality_flags'] for r in marki) == 7
    assert (marki[0]['lat'], marki[0]['lon']) == (52.326697, 21.107557)
    assert 'outside_declared_city' in marki[6]['quality_flags']
    assert all(r['opening_hours'] is None for r in marki)
    assert all('missing_opening_hours' in r['quality_flags'] for r in marki)
    assert 'same_coordinates_different_addresses' in marki[4]['quality_flags']
    assert 'duplicate_candidate' in marki[6]['quality_flags']
    with tempfile.TemporaryDirectory(dir=importuj.ROOT) as directory:
        importuj.write_outputs(records, Path(directory))
        data = json.loads((Path(directory) / 'aed.geojson').read_text())
        assert len(data['features']) == len(records)
        for record, feature in zip(records, data['features']):
            if feature['geometry']:
                assert feature['geometry']['coordinates'] == [record['lon'], record['lat']]
        report = json.loads((Path(directory) / 'jakosc.json').read_text())
        assert report['records'] == len(records)
        assert report['flag_occurrences'] == sum(len(r['quality_flags']) for r in records)
        light = Path(directory) / 'aed_mapa.json'
        assert light.stat().st_size < 1_000_000
        points = json.loads(light.read_text())
        expected = [r for r in records if not set(r['quality_flags']) & {
            'missing_coordinates', 'outside_poland', 'outside_declared_city'}]
        assert {p[3] for p in points} == {r['aed_id'] for r in expected}
        shards = {p.stem: json.loads(p.read_text()) for p in (Path(directory) / 'szczegoly').glob('*.json')}
        for point in points:
            assert len(point) == 5 and len(point[4]) <= 28
            detail = shards[point[3].split('/')[-1].split(':')[-1][-2:].zfill(2)]
            assert detail[point[3]]['aed_id'] == point[3]


def test_godzin_js():
    node = shutil.which('node')
    assert node, 'Test godzin wymaga Node.js; parser jest wykonywany na żywo w przeglądarce.'
    subprocess.run([node, '-e', r'''
const assert = require('node:assert/strict');
const {availability, distanceM, walkingMinutes, closest} = require('./public/aed.js');
const sat = new Date('2026-11-21T10:00:00Z');
assert.equal(availability('24/7', sat), 'open');
assert.equal(availability('Mo-Fr 08:00-16:00', sat), 'closed');
assert.equal(availability('Mo-Su 08:00-16:00', sat), 'open');
for (const hours of [null, '', 'dziwny format', '24/7; PH off', 'Mo-Fr 25:00-26:00', 'Mo-Fr 08:00-16:00; PH off'])
  assert.equal(availability(hours, sat), 'unknown');
assert.equal(availability('Mo-Fr 08:00-16:00', new Date('2026-11-20T07:00:00Z')), 'open');
assert.equal(availability('Mo-Fr 08:00-16:00', new Date('2026-11-20T15:00:00Z')), 'closed');
assert.equal(availability('Fr 22:00-02:00', new Date('2026-11-21T00:00:00Z')), 'open');
assert.equal(availability('Fr 22:00-02:00', sat), 'closed');
assert.equal(availability('Mo-Su 08:00-16:00', new Date('2026-07-01T06:00:00Z')), 'open');
assert.equal(availability('Mo-Su 08:00-16:00', new Date('invalid')), 'unknown');
assert.ok(Math.abs(distanceM(52,21,52.001,21)-111.2)<1);
assert.equal(walkingMinutes(1000),16);
assert.deepEqual(closest([[21,52,3,'private',''], [21.001,52,0,'a',''], [21.002,52,0,'b','']],52,21).map(x=>x.point[3]), ['a','b']);
console.log('Parser JS, odległość i wybór AED: OK');
'''], cwd=importuj.ROOT, check=True)


def test_openaedmap():
    payload = {'type': 'FeatureCollection', 'features': [{
        'type': 'Feature', 'geometry': {'type': 'Point', 'coordinates': [22.004, 50.041]},
        'properties': {'@osm_type': 'node', '@osm_id': 123, 'emergency': 'defibrillator',
                       'opening_hours': '24/7', 'defibrillator:location': 'Przy wejściu'}}]}
    normalized = importuj.openaedmap_to_osm(payload)
    assert normalized['elements'][0] == dict(type='node', id=123, lat=50.041, lon=22.004,
                                            tags=payload['features'][0]['properties'])
    for bad in [{'features': []}, {'type': 'FeatureCollection', 'features': [dict(payload['features'][0], geometry=None)]}]:
        try:
            importuj.openaedmap_to_osm(bad)
        except ValueError:
            pass
        else:
            raise AssertionError('Niepełny eksport nie może zastąpić danych')


def test_regul_jakosci():
    def record(identifier, lat, lon, address, source='a', hours=None, access='unknown'):
        return dict(aed_id=identifier, lat=lat, lon=lon, address=address, source=source,
                    opening_hours=hours, access=access, quality_flags=[])

    records = [record('a', 52, 21, 'Adres A', hours='24/7'),
               record('b', 52, 21, 'Adres B', source='b', access='private'),
               record('c', 21, 52, 'Adres C'),
               record('d', 1, 2, None), record('e', None, None, None),
               record('f', 52.001, 21, 'Dalszy', source='b')]
    importuj.apply_quality(records)
    assert 'missing_opening_hours' not in records[0]['quality_flags']
    assert 'restricted_access' in records[1]['quality_flags']
    assert 'coordinates_swapped' in records[2]['quality_flags']
    assert 'outside_poland' in records[3]['quality_flags']
    assert 'missing_coordinates' in records[4]['quality_flags']
    assert 'duplicate_candidate' not in records[5]['quality_flags']
    assert abs(importuj.distance_m(52, 21, 52.001, 21) - 111.2) < 1


def test_odswiezania():
    payload = {'elements': [{'type': 'node', 'id': 1}]}
    with tempfile.TemporaryDirectory(dir=importuj.ROOT) as directory:
        root = Path(directory)
        with patch.object(importuj, 'ROOT', root), patch.object(importuj.time, 'sleep') as sleep:
            responses = [importuj.urllib.error.URLError('chwilowa awaria'),
                         io.BytesIO(json.dumps(payload).encode())]
            with patch.object(importuj.urllib.request, 'urlopen', side_effect=responses) as request:
                snapshot = importuj.refresh_osm()
                assert snapshot['data'] == payload
                assert request.call_count == 2
                assert request.call_args.args[0].get_header('User-agent').startswith('otwarteaed.pl')
                sleep.assert_called_once_with(2)
            cached = root / '.cache/osm_aed_pl.json'
            before = cached.read_bytes()
            with patch.object(importuj.urllib.request, 'urlopen',
                              side_effect=lambda *a, **kw: io.BytesIO(b'{"remark":"timeout","elements":[]}')):
                try:
                    importuj.refresh_osm()
                except RuntimeError:
                    pass
                else:
                    raise AssertionError('Niepełna odpowiedź Overpass musi przerwać odświeżenie')
            assert cached.read_bytes() == before


if __name__ == '__main__':
    test_importu()
    test_regul_jakosci()
    test_odswiezania()
    test_openaedmap()
    test_godzin_js()
    print('OK: import, Marki, braki danych, flagi, odległości, GeoJSON [lon, lat] i retry Overpass (offline).')
