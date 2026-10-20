// Dependency-free logic/render-call checks. Browser layout is not simulated.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const path = require('node:path');
const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.equal(html, fs.readFileSync(path.join(root, 'games.html'), 'utf8'));
const source = html.split('<script>')[1].split('</script>')[0];
new vm.Script(source);
new vm.Script(fs.readFileSync(path.join(root, 'sw.js'), 'utf8'));
JSON.parse(fs.readFileSync(path.join(root, 'manifest.json'), 'utf8'));
assert(html.includes("k!=='daejang-v17'"));
assert(fs.readFileSync(path.join(root, 'sw.js'), 'utf8').includes('daejang-v17'));

for (const [width, height] of [[320, 568], [390, 760], [1440, 900]]) {
  const calls = [];
  const drawing = new Proxy({}, {
    get: (o, key) => key in o ? o[key] : (...args) => calls.push([key, ...args]),
    set: (o, key, value) => (o[key] = value, true)
  });
  const elements = new Map();
  function element(id) {
    if (!elements.has(id)) {
      const node = {
        id, textContent: '', innerHTML: '', children: [], style: {},
        classList: { toggle() {}, add() {}, remove() {} },
        addEventListener() {}, appendChild(child) { this.children.push(child); },
        querySelectorAll() { return this.children; },
        getBoundingClientRect: () => ({ width, height }),
        getContext: () => drawing
      };
      elements.set(id, node);
    }
    return elements.get(id);
  }
  const stored = { best: 180, maxCombo: 12, dex: { '🍰': 40, '🥩': 2, '👾': 1 } };
  const sandbox = {
    console, Math, Image: class { complete = true; naturalWidth = 100; },
    document: {
      getElementById: element, createElement: () => element(Symbol()),
      querySelectorAll: () => [], addEventListener() {},
      documentElement: { clientWidth: width, clientHeight: height }
    },
    localStorage: { getItem: () => JSON.stringify(stored), setItem() {} },
    navigator: {}, location: { href: 'https://example.test/' },
    requestAnimationFrame() {}, addEventListener() {}, setTimeout() {}, clearTimeout() {},
    btoa: text => Buffer.from(text, 'binary').toString('base64'),
    unescape, encodeURIComponent
  };
  sandbox.window = { devicePixelRatio: 3, matchMedia: () => ({ matches: false }) };
  for (const id of ['sc', 'go', 're', 'fs']) sandbox[id] = element(id);
  vm.createContext(sandbox);
  vm.runInContext(source, sandbox);
  assert.equal(element('st-dex').textContent, '2/27', 'retired foods must not inflate collection count');
  const run = code => vm.runInContext(code, sandbox);
  assert.equal(run('G.length+B.length+1'), 27);
  assert(run("!B.includes('🍰') && !B.includes('🍩') && !B.includes('🧁')"));
  assert(run("INFO['🥩'][0].includes('과다섭취')"));
  assert(run("INFO['🌭'][2].includes('50g') && INFO['🌭'][2].includes('상대위험')"));
  run("sndOn=false; startMode('catch'); spawn(); loop(16);");
  // Verify collection scoring still works after the artwork changes.
  run("items=[{e:'🥦',g:true,x:p.x,y:H*.75-45,v:0}];loop(32)");
  assert.equal(run('score'), 5);
  for (const mode of ['shoot', 'sort', 'whack']) {
    run(`startMode('${mode}');loop(64)`);
    if (mode === 'shoot') {
      run("items=[{e:'👾',g:false,polyp:true,hp:1,mhp:1,x:W/2,y:180,v:0}];loop(80)");
      run("bullets=[{x:W/2,y:191,vx:0,vy:-11}];loop(96)");
      assert.equal(run('score'), 15);
    } else if (mode === 'sort') {
      run("sortCur={e:'🥩',g:false,scale:1};loop(80);judgeSort(false)");
      assert.equal(run('score'), 5);
      run("sortCur={e:'👾',g:false,scale:1};loop(96)");
    } else {
      run("holes[0]={e:'👾',g:false,polyp:true,t:1000,max:1000};loop(80)");
      run("(()=>{const a=whackGridGeom();tapWhack(a.gx+a.cell/2,a.gy+a.cell/2)})()");
      assert.equal(run('score'), 10);
    }
  }
  run("renderDex('b')");
  assert(!element('dex-grid').children.some(node => node.innerHTML.includes('👾')));
  for (const em of ['🍺', '🍷', '🥃']) {
    run(`di('${em}',100,100,80);showDexDetail('${em}',true)`);
    assert(element('dex-detail').innerHTML.includes('data:image/svg+xml;base64,'));
  }
  assert(calls.some(([name, value]) => name === 'fillText' && value === '대장용종'));
  assert(!calls.some(([name, value]) => name === 'fillText' && String(value).includes('👾')));
  assert(calls.some(([name]) => name === 'drawImage'));
  assert.equal(run('save.best'), 180);
  console.log(`${width}x${height}: four game modes, scoring, labels, SVG render calls, save compatibility OK`);
}
console.log('Syntax, manifest, entry parity, cache version OK. Browser visual QA still required.');
