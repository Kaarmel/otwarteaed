// Test logiki strony: node test_aed.mjs
import {createRequire} from 'module';
import assert from 'assert/strict';
const {availability: a, distanceM, walkingMinutes, closest, shard} = createRequire(import.meta.url)('./public/aed.js');
const sob = new Date('2026-11-21T11:00:00+01:00'), pon = new Date('2026-11-23T09:00:00+01:00'), noc = new Date('2026-11-24T02:00:00+01:00');
assert.equal(a('24/7', sob), 'open');
assert.equal(a(null, sob), 'unknown');
assert.equal(a('Mo-Fr 08:00-16:00', sob), 'closed');
assert.equal(a('Mo-Fr 08:00-16:00', pon), 'open');
assert.equal(a('Mo-Fr 08:00-18:00; Sa 08:00-14:00', sob), 'open');
assert.equal(a('Mo-Fr 08:00-16:00; Sa-Su, PH off', sob), 'closed');
assert.equal(a('Mo 07:00-17:00; Tu-Th 07:00-15:00; Fr 07:00-13:00', pon), 'open');
assert.equal(a('Mo-Su 20:00-04:00', noc), 'open');            // przez północ z poniedziałku
assert.equal(a('Mo-Fr 08:00-18:00; Sa 08:00-14:00 - w czasie otwarcia apteki', sob), 'unknown');
assert.equal(a('Dec-Mar Mo-Fr 08:00-16:00', pon), 'unknown');
assert.equal(a('sunrise-sunset', pon), 'unknown');
assert.ok(Math.abs(distanceM(50.0413, 21.999, 50.0413, 22.0130) - 1000) < 15);
assert.equal(walkingMinutes(350), 5);
const pts = [[22, 50, 3, 'osm:node/1', ''], [22.001, 50, 1, 'osm:node/2', ''], [22.01, 50, 0, 'osm:node/3', '']];
assert.deepEqual(closest(pts, 50, 22, 2).map(x => x.p[3]), ['osm:node/2', 'osm:node/3']); // prywatny pominięty
assert.equal(shard('osm:node/477958354'), '54');
assert.equal(shard('krosno:7'), '07');
console.log('OK aed.js');
