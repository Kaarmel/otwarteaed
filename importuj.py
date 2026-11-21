"""Import lokalnych otwartych danych AED. Python 3, wyłącznie stdlib."""
import argparse
import csv
import io
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from collections import Counter, defaultdict
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
INPUT = ROOT.parent / 'HackNation 2026/11_misja-aed_MC/pobrane'
OUTPUT = ROOT / 'public/dane'
FIELDS = ('aed_id name lat lon address access opening_hours indoor location_description '
          'operator source source_record_id source_url license retrieved_at quality_flags').split()
SOURCES = {
    'osm': dict(name='OpenStreetMap', license='ODbL-1.0',
                attribution='© współtwórcy OpenStreetMap, ODbL',
                source_url='https://www.openstreetmap.org/copyright',
                license_url='https://opendatacommons.org/licenses/odbl/1-0/',
                retrieved_at='2026-11-21T15:55:45Z'),
    'krosno': dict(name='Krosno', license='CC0-1.0', attribution='Urząd Miasta Krosna',
                   source_url='https://api.dane.gov.pl/1.4/resources/54632',
                   license_url='https://creativecommons.org/publicdomain/zero/1.0/',
                   retrieved_at='2026-11-21'),
    'przemysl': dict(name='Przemyśl', license='CC0-1.0', attribution='Urząd Miejski w Przemyślu',
                     source_url='https://api.dane.gov.pl/1.4/resources/62093',
                     license_url='https://creativecommons.org/publicdomain/zero/1.0/',
                     retrieved_at='2026-11-21'),
    'marki': dict(name='Marki', license='CC-BY-4.0', attribution='Urząd Miasta Marki',
                  source_url='https://api.dane.gov.pl/1.4/resources/68353',
                  license_url='https://creativecommons.org/licenses/by/4.0/',
                  retrieved_at='2026-11-21'),
    'legionowo': dict(name='Legionowo', license='CC0-1.0', attribution='Urząd Miasta Legionowo',
                      source_url='https://api.dane.gov.pl/1.4/resources/2625221',
                      license_url='https://creativecommons.org/publicdomain/zero/1.0/',
                      retrieved_at='2026-11-21'),
}
FLAG_DESCRIPTIONS = {
    'coordinates_swapped': 'Zamieniono lat/lon: tylko odwrócona para mieściła się w obwiedni Polski.',
    'outside_poland': 'Współrzędne poza przybliżoną obwiednią Polski (nie jest to test granicy państwa).',
    'missing_coordinates': 'Brak poprawnej liczbowej pary współrzędnych WGS84.',
    'same_coordinates_different_addresses': 'Identyczne współrzędne, różne niepuste adresy.',
    'missing_opening_hours': 'Brak deklaracji godzin dostępności.',
    'restricted_access': 'Źródło deklaruje access=private lub access=no.',
    'duplicate_candidate': 'Inny rekord z innego źródła w odległości poniżej 30 m; bez scalania.',
    'outside_declared_city': 'Rekord Marki ponad 50 km od centrum Marek; wymaga weryfikacji.',
}


def now():
    return datetime.now(timezone.utc).isoformat(timespec='seconds').replace('+00:00', 'Z')


def clean(value):
    value = str(value).strip() if value is not None else ''
    return None if value.lower() in ('', 'unknown', 'null') else value


def number(value):
    try:
        result = float(value)
        return result if math.isfinite(result) else None
    except (TypeError, ValueError):
        return None


def joined(*values):
    return ', '.join(v for v in map(clean, values) if v) or None


def csv_rows(filename):
    with (INPUT / filename).open(encoding='utf-8-sig', newline='') as stream:
        rows = list(csv.reader(stream, skipinitialspace=True, strict=True))
    wrapped = len(rows[0]) == 1
    if wrapped:
        # Marki: zewnętrzny CSV opakowuje każdy właściwy wiersz w jedną komórkę.
        rows = [next(csv.reader(io.StringIO(row[0]), skipinitialspace=True, strict=True))
                for row in rows if row]
    header = [v.strip() for v in rows[0]]
    for row in rows[1:]:
        if not row:
            continue
        if len(row) != len(header):
            raise ValueError(f'{filename}: niezgodna liczba kolumn: {row!r}')
        yield dict(zip(header, row))


def make_record(source, identifier, lat, lon, **values):
    meta = SOURCES[source]
    record = dict.fromkeys(FIELDS)
    record.update(aed_id=f'{source}:{identifier}', lat=number(lat), lon=number(lon),
                  access='unknown', indoor='unknown', source=source,
                  source_record_id=str(identifier), source_url=meta['source_url'],
                  license=meta['license'], retrieved_at=meta['retrieved_at'], quality_flags=[])
    record.update({key: clean(value) for key, value in values.items()})
    record['access'] = (record['access'] or 'unknown').lower()
    record['indoor'] = (record['indoor'] or 'unknown').lower()
    return record


def openaedmap_to_osm(data):
    if data.get('type') != 'FeatureCollection' or not data.get('features'):
        raise ValueError('Pusty lub błędny eksport OpenAEDMap')
    elements = []
    for feature in data['features']:
        geometry = feature.get('geometry') or {}
        tags = feature.get('properties') or {}
        coordinates = geometry.get('coordinates')
        if (geometry.get('type') != 'Point' or not isinstance(coordinates, list) or len(coordinates) < 2
                or tags.get('@osm_type') not in ('node', 'way', 'relation')
                or not isinstance(tags.get('@osm_id'), int) or tags['@osm_id'] <= 0
                or number(coordinates[0]) is None or number(coordinates[1]) is None):
            raise ValueError('Niekompletny obiekt OpenAEDMap; zachowano poprzednie dane')
        elements.append(dict(type=tags['@osm_type'], id=tags['@osm_id'],
                             lon=coordinates[0], lat=coordinates[1], tags=tags))
    if not any(e['tags'].get('emergency') == 'defibrillator' for e in elements):
        raise ValueError('Eksport OpenAEDMap nie zawiera AED')
    return {'elements': elements}


def refresh_osm(openaedmap=False):
    query = ('[out:json][timeout:180];area["ISO3166-1"="PL"]["admin_level"="2"]->.pl;'
             'nwr["emergency"="defibrillator"](area.pl);out meta center;')
    request = urllib.request.Request(
        'https://overpass-api.de/api/interpreter',
        data=urllib.parse.urlencode({'data': query}).encode(),
        headers={'User-Agent': 'otwarteaed.pl-skeleton/0.1 (open AED data import)',
                 'Content-Type': 'application/x-www-form-urlencoded'})
    if openaedmap:
        request = urllib.request.Request('https://openaedmap.org/api/v1/countries/PL.geojson',
                                         headers={'User-Agent': 'otwarteaed.pl/0.2 (open AED data import)'})
    label = 'OpenAEDMap' if openaedmap else 'Overpass'
    for attempt in range(3):
        try:
            with urllib.request.urlopen(request, timeout=240) as response:
                data = json.load(response)
            if openaedmap:
                data = openaedmap_to_osm(data)
            if data.get('remark') or not isinstance(data.get('elements'), list) or not data['elements']:
                raise ValueError('Overpass zwrócił pusty, niepełny lub błędny wynik')
            snapshot = {'retrieved_at': now(), 'data': data}
            if openaedmap:
                snapshot['via'] = 'OpenAEDMap'
            cache = ROOT / '.cache'
            cache.mkdir(exist_ok=True)
            filename = 'openaedmap_pl.json' if openaedmap else 'osm_aed_pl.json'
            temporary = cache / (filename + '.tmp')
            temporary.write_text(json.dumps(snapshot, ensure_ascii=False, allow_nan=False), encoding='utf-8')
            temporary.replace(cache / filename)
            return snapshot
        except (urllib.error.URLError, TimeoutError, OSError, ValueError) as error:
            if attempt == 2:
                raise RuntimeError(f'Nie udało się odświeżyć {label} po 3 próbach: {error}') from error
            print(f'{label}: próba {attempt + 1}/3 nieudana; ponawiam.', file=sys.stderr)
            time.sleep(2 ** (attempt + 1))


def import_records(snapshot=None):
    records = []
    osm = snapshot['data'] if snapshot else json.loads((INPUT / 'osm_aed_pl.json').read_text(encoding='utf-8'))
    if osm.get('remark') or not isinstance(osm.get('elements'), list):
        raise ValueError('Niepoprawny eksport OSM')
    for element in osm['elements']:
        tags = element.get('tags', {})
        if tags.get('emergency') != 'defibrillator':
            continue
        position = element.get('center', element)
        identifier = f"{element['type']}/{element['id']}"
        record = make_record(
            'osm', identifier, position.get('lat'), position.get('lon'),
            name=tags.get('name') or tags.get('description'),
            address=joined(' '.join(filter(None, [tags.get('addr:street') or tags.get('addr:place'),
                                                  tags.get('addr:housenumber')])), tags.get('addr:city')),
            access=tags.get('access'), opening_hours=tags.get('opening_hours'), indoor=tags.get('indoor'),
            location_description=tags.get('defibrillator:location'), operator=tags.get('operator'),
            source_url=f'https://www.openstreetmap.org/{identifier}')
        if snapshot:
            record['retrieved_at'] = snapshot['retrieved_at']
        records.append(record)
    for source, filename in [('krosno', 'dane_resource_54632.csv'), ('marki', 'dane_resource_68353.csv')]:
        for row in csv_rows(filename):
            records.append(make_record(source, row['Numer Id'], row['Szerokość geograficzna'],
                                       row['Długość geograficzna'], name=row['Nazwa'],
                                       address=row['Adres'], location_description=row['Lokalizacja']))
    geojson = json.loads((INPUT / 'dane_resource_62093.geojson').read_text(encoding='utf-8'))
    for feature in geojson['features']:
        props = feature['properties']
        geometry = feature.get('geometry') or {}
        coordinates = geometry.get('coordinates') if geometry.get('type') == 'Point' else None
        lon, lat = coordinates[:2] if coordinates and len(coordinates) >= 2 else (None, None)
        records.append(make_record('przemysl', props['id'], lat, lon, name=props.get('name'),
                                   address=joined(' '.join(filter(None, [props.get('street'),
                                                                        props.get('home_number')])),
                                                  props.get('city'))))
    for index, row in enumerate(csv_rows('dane_resource_2625221.csv'), start=1):
        records.append(make_record('legionowo', index, row['szerokosc_geograficzna'],
                                   row['dlugosc_geograficzna'], name=row['nazwa'],
                                   address=joined(' '.join(filter(None, [row['cecha_ulicy'], row['nazwa_ulicy'],
                                                                        row['nr_budynku']])),
                                                  row['nr_lokalu'], row['miejscowosc'])))
    apply_quality(records)
    return records


def in_poland(lat, lon):
    # shortcut: obwiednia obejmuje też sąsiadów, zastąpić granicą PRG przy dokładnej walidacji.
    return lat is not None and lon is not None and 49.0 <= lat <= 54.84 and 14.12 <= lon <= 24.15


def distance_m(lat1, lon1, lat2, lon2):
    a, b = math.radians(lat1), math.radians(lat2)
    h = math.sin((b - a) / 2) ** 2 + math.cos(a) * math.cos(b) * math.sin(math.radians(lon2 - lon1) / 2) ** 2
    return 6371000 * 2 * math.asin(math.sqrt(min(1, h)))


def apply_quality(records):
    coordinates = defaultdict(list)
    sources = defaultdict(list)
    for record in records:
        flags = record['quality_flags']
        lat, lon = record['lat'], record['lon']
        if not in_poland(lat, lon) and in_poland(lon, lat):
            lat, lon = record['lat'], record['lon'] = lon, lat
            flags.append('coordinates_swapped')
        if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180):
            flags.append('missing_coordinates')
        else:
            if not in_poland(lat, lon):
                flags.append('outside_poland')
            coordinates[lat, lon].append(record)
            sources[record['source']].append(record)
            if record['source'] == 'marki' and distance_m(lat, lon, 52.3267, 21.1076) > 50000:
                flags.append('outside_declared_city')
        if not record['opening_hours']:
            flags.append('missing_opening_hours')
        if record['access'] in ('private', 'no'):
            flags.append('restricted_access')
    for group in coordinates.values():
        addresses = {r['address'].strip().casefold() for r in group if r['address']}
        if len(addresses) > 1:
            for record in group:
                record['quality_flags'].append('same_coordinates_different_addresses')
    groups = list(sources.values())
    for index, group in enumerate(groups):
        for other in groups[index + 1:]:
            for a in group:
                for b in other:
                    # Tani filtr obwiedni przed obliczeniem odległości geodezyjnej.
                    if abs(a['lat'] - b['lat']) > .0003 or abs(a['lon'] - b['lon']) > .0005:
                        continue
                    if distance_m(a['lat'], a['lon'], b['lat'], b['lon']) < 30:
                        for record in (a, b):
                            if 'duplicate_candidate' not in record['quality_flags']:
                                record['quality_flags'].append('duplicate_candidate')


def write_outputs(records, destination=OUTPUT, via=None):
    destination.mkdir(parents=True, exist_ok=True)
    def write_json(filename, data):
        temporary = destination / (filename + '.tmp')
        temporary.parent.mkdir(parents=True, exist_ok=True)
        temporary.write_text(json.dumps(data, ensure_ascii=False, allow_nan=False, separators=(',', ':')) + '\n',
                             encoding='utf-8')
        temporary.replace(destination / filename)

    points = []
    details = defaultdict(dict)
    for record in records:
        if set(record['quality_flags']) & {'missing_coordinates', 'outside_poland', 'outside_declared_city'}:
            continue
        status = (3 if record['access'] in ('private', 'no') else
                  1 if record['opening_hours'] == '24/7' else 2 if record['opening_hours'] else 0)
        points.append([round(record['lon'], 6), round(record['lat'], 6), status,
                       record['aed_id'], (record['name'] or '')[:28]])
        shard = record['source_record_id'].split('/')[-1][-2:].zfill(2)
        details[shard][record['aed_id']] = record
    map_bytes = len((json.dumps(points, ensure_ascii=False, separators=(',', ':')) + '\n').encode('utf-8'))
    if map_bytes >= 1_000_000:
        raise ValueError(f'aed_mapa.json przekracza limit 1 MB ({map_bytes} B); skróć indeks przed eksportem')
    for shard, rows in details.items():
        write_json(f'szczegoly/{shard}.json', rows)
    write_json('aed_mapa.json', points)
    with (destination / 'aed.csv.tmp').open('w', encoding='utf-8', newline='') as stream:
        writer = csv.DictWriter(stream, fieldnames=FIELDS)
        writer.writeheader()
        for record in records:
            writer.writerow({**record, 'quality_flags': ';'.join(record['quality_flags'])})
    (destination / 'aed.csv.tmp').replace(destination / 'aed.csv')
    features = []
    for record in records:
        geometry = None if 'missing_coordinates' in record['quality_flags'] else {
            'type': 'Point', 'coordinates': [record['lon'], record['lat']]}
        features.append(dict(type='Feature', id=record['aed_id'], geometry=geometry, properties=record))
    write_json('aed.geojson', dict(type='FeatureCollection', features=features))
    by_source = {}
    metadata = []
    for source, meta in SOURCES.items():
        group = [r for r in records if r['source'] == source]
        counts = Counter(flag for r in group for flag in r['quality_flags'])
        by_source[source] = dict(records=len(group), flagged_records=sum(bool(r['quality_flags']) for r in group),
                                 flag_occurrences=sum(counts.values()), flags=dict(sorted(counts.items())))
        metadata.append(dict(source=source, **{**meta, 'retrieved_at': group[0]['retrieved_at'] if group else meta['retrieved_at']},
                             records=len(group)))
        if source == 'osm' and via == 'OpenAEDMap':
            metadata[-1].update(attribution='© współtwórcy OpenStreetMap, przez OpenAEDMap',
                                export_url='https://openaedmap.org/api/v1/countries/PL.geojson')
    report = dict(generated_at=now(), records=len(records),
                  flagged_records=sum(bool(r['quality_flags']) for r in records),
                  flag_occurrences=sum(len(r['quality_flags']) for r in records),
                  map_bytes=map_bytes, data_as_of=max(r['retrieved_at'] for r in records),
                  flag_descriptions=FLAG_DESCRIPTIONS, by_source=by_source)
    write_json('jakosc.json', report)
    write_json('zrodla.json', dict(sources=metadata, note='Licencje zachowano per źródło i rekord. '
                                 'Eksport zawiera dane OSM na ODbL; całość nie jest CC0.',
                                 changes='Normalizacja schematu, naprawa osi i dodanie flag jakości; bez scalania.'))
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    options = parser.add_mutually_exclusive_group()
    options.add_argument('--odswiez', action='store_true', help='pobierz OSM z Overpass; kopia tylko w lokalnym .cache/')
    options.add_argument('--zrodlo-openaedmap', action='store_true', help='pobierz dzienny eksport OSM przez OpenAEDMap zamiast Overpass')
    args = parser.parse_args()
    try:
        snapshot = refresh_osm(args.zrodlo_openaedmap) if args.odswiez or args.zrodlo_openaedmap else None
        report = write_outputs(import_records(snapshot), via=snapshot.get('via') if snapshot else None)
    except (OSError, ValueError, KeyError, RuntimeError) as error:
        parser.exit(1, f'Błąd importu: {error}\n')
    for source, stats in report['by_source'].items():
        print(f"{source}: {stats['records']} rekordów, {stats['flag_occurrences']} flag; {stats['flags']}")
    print(f"Razem: {report['records']} rekordów, {report['flag_occurrences']} wystąpień flag.")
    print(f"aed_mapa.json: {report['map_bytes']} B przed gzip (limit < 1 000 000 B).")


if __name__ == '__main__':
    main()
