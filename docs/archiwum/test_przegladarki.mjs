// Node 22+, Chrome i lokalny http.server: bez bibliotek npm.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
const root = import.meta.dirname, output = path.join(root,'.cache');
fs.mkdirSync(output,{recursive:true});
const profile = path.join(output,'chrome-test');
fs.mkdirSync(profile,{recursive:true});
const activePort = path.join(profile,'DevToolsActivePort');
fs.rmSync(activePort,{force:true});
const chrome = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const browser = spawn(chrome,['--headless=new',`--user-data-dir=${profile}`,'--remote-debugging-port=0','--no-first-run','--no-default-browser-check','about:blank'],{stdio:['ignore','ignore','pipe']});
let startupError='';browser.stderr.on('data',data=>startupError+=data);
const sleep = ms => new Promise(r=>setTimeout(r,ms));
let ws;
const guard = setTimeout(()=>{browser.kill();process.exit(1);},180000);
try {
  for(let i=0;i<100&&!fs.existsSync(activePort);i++) await sleep(100);
  assert.ok(fs.existsSync(activePort),'Nie uruchomiono izolowanego Chrome: '+startupError);
  const port = Number(fs.readFileSync(activePort,'utf8').split('\n')[0]);
  const version = await (await fetch(`http://127.0.0.1:${port}/json/version`)).json();
  ws = new WebSocket(version.webSocketDebuggerUrl);
  await new Promise((r,j)=>{ws.onopen=r;ws.onerror=j;});
  let id=0;const pending=new Map(),errors=[],requests=[];
  ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.id){pending.get(m.id)?.(m);pending.delete(m.id);}else{
    if(m.method==='Runtime.exceptionThrown')errors.push(m.params.exceptionDetails);
    if(m.method==='Network.requestWillBeSent')requests.push(m.params.request.url);
  }};
  const send=(method,params={},sessionId)=>new Promise(resolve=>{const n=++id;pending.set(n,resolve);ws.send(JSON.stringify({id:n,method,params,sessionId}));});
  const {result:{targetId}}=await send('Target.createTarget',{url:'about:blank'});
  const {result:{sessionId}}=await send('Target.attachToTarget',{targetId,flatten:true});
  const cdp=async(method,params={})=>{const r=await send(method,params,sessionId);assert.ok(!r.error,JSON.stringify(r.error));return r.result;};
  const evaluate=async expression=>{const r=await cdp('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});assert.ok(!r.exceptionDetails,JSON.stringify(r.exceptionDetails));return r.result.value;};
  const until=async(expression)=>{for(let i=0;i<200;i++){if(await evaluate(expression))return;await sleep(100);}throw Error('Timeout: '+expression);};
  await cdp('Page.enable');await cdp('Runtime.enable');await cdp('Network.enable');
  await cdp('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  await cdp('Page.navigate',{url:'http://127.0.0.1:8000/#znajdz?lat=50.037334&lon=22.004001'});
  await until(`document.querySelectorAll('#results>li').length===3`);
  assert.equal(await evaluate(`document.querySelectorAll('#results a[href*="travelmode=walking"]').length`),3);
  assert.equal(await evaluate(`document.querySelectorAll('#results a[href*="fossgis_osrm_foot"]').length`),3);
  assert.ok(!requests.some(u=>u.includes('aed.geojson')),'Mapa nie może pobierać pełnego GeoJSON');
  await evaluate(`location.hash='dane'`);
  await until(`!document.getElementById('dane').hidden && document.querySelectorAll('#quality-table tbody tr').length===5`);
  assert.equal(await evaluate(`document.querySelectorAll('#source-list>li').length`),5);
  await evaluate(`location.hash='dla-firm'`);
  await until(`typeof placeMap!=='undefined' && !!placeMap`);
  // Kliknięcie punktu na mapie: nie wymaga geokodowania ani zewnętrznego API wyszukiwarki.
  await evaluate(`placeMap.fire('click',{latlng:L.latLng(50.037334,22.004001)});document.getElementById('place-name').value='Przykładowe biuro, II piętro';document.getElementById('place-address').value='Rynek 1, Rzeszów';document.getElementById('card-form').requestSubmit();`);
  await until(`!document.getElementById('print-card').disabled`);
  assert.equal(await evaluate(`document.querySelectorAll('#printed-aeds>li').length`),3);
  assert.equal(await evaluate(`document.getElementById('notification-email').disabled`),true);
  assert.ok(await evaluate(`document.getElementById('card-live-link').href.includes('#znajdz?lat=50.037334&lon=22.004001')`));
  console.log('Zakładki, 3 AED, trasy piesze, generator, QR i wyłączony e-mail: OK');
  await cdp('Emulation.setEmulatedMedia',{media:'print'});
  await evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
  await until(`!cardTiles.isLoading()`);
  const layout = await evaluate(`(()=>{const c=document.getElementById('printable-card'),m=document.getElementById('card-map'),r=c.getBoundingClientRect();return {width:r.width,height:r.height,mapWidth:m.clientWidth,tiles:[...m.querySelectorAll('.leaflet-tile')].map(i=>({loaded:i.complete&&i.naturalWidth>0})),text:c.innerText}})()`);
  assert.ok(layout.width>710&&layout.width<725,'Szerokość druku 190 mm');
  assert.ok(layout.height<1046,'Treść musi zmieścić się w 277 mm');
  assert.ok(layout.tiles.length&&layout.tiles.every(t=>t.loaded),'Wydruk wymaga załadowanych kafelków');
  assert.ok(layout.text.includes('Podaj dyspozytorowi ten adres'));
  const pdf=await cdp('Page.printToPDF',{printBackground:true,preferCSSPageSize:true,displayHeaderFooter:false});
  fs.writeFileSync(path.join(output,'przyklad_karty.pdf'),Buffer.from(pdf.data,'base64'));
  const rect=await evaluate(`(()=>{const r=document.getElementById('printable-card').getBoundingClientRect();return {x:r.x+scrollX,y:r.y+scrollY,width:r.width,height:r.height,scale:2}})()`);
  const shot=await cdp('Page.captureScreenshot',{format:'png',captureBeyondViewport:true,clip:rect});
  fs.writeFileSync(path.join(root,'public/przyklad_karty.png'),Buffer.from(shot.data,'base64'));
  console.log('Print media: '+JSON.stringify({width:layout.width,height:layout.height,tiles:layout.tiles.length}));
  await cdp('Emulation.setEmulatedMedia',{media:'screen'});
  await cdp('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  for(const tab of ['znajdz','dla-firm','dane']){
    await evaluate(`location.hash=${JSON.stringify(tab)}`);await sleep(200);
    assert.ok(await evaluate(`document.documentElement.scrollWidth<=innerWidth`),'Przepełnienie na telefonie: '+tab);
    const shot=await cdp('Page.captureScreenshot',{format:'png'});
    fs.writeFileSync(path.join(output,`telefon-${tab}.png`),Buffer.from(shot.data,'base64'));
  }
  // Zmiana adresu unieważnia punkt i poprzednią kartę.
  await evaluate(`location.hash='dla-firm';document.getElementById('business-address-search').value='Inny adres';document.getElementById('business-address-search').dispatchEvent(new Event('input',{bubbles:true}));`);
  assert.equal(await evaluate(`document.getElementById('print-card').disabled`),true);
  assert.equal(await evaluate(`place===null`),true);
  assert.deepEqual(errors,[],'Błędy JavaScript');
  console.log('Telefon 390 px, unieważnienie nieaktualnej karty, brak błędów JS: OK');
} finally {clearTimeout(guard);ws?.close();browser.kill();}
