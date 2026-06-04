'use strict';
// Executes the parser and nesting core directly from the standalone HTML.
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = fullScript.split('/* ---------------- Canvas renderer')[0];
const elements = new Proxy({}, { get: (target, key) => target[key] ||= { value: '0', style: {}, textContent: '', innerHTML: '' } });
Object.assign(elements.stockW, { value: '500' });
Object.assign(elements.stockH, { value: '300' });
Object.assign(elements.margin, { value: '5' });
Object.assign(elements.gap, { value: '3' });
Object.assign(elements.rot, { value: '90' });
Object.assign(elements.mode, { value: 'bottomleft' });
Object.assign(elements.wArea, { value: '.6' });
Object.assign(elements.wEdge, { value: '1' });
Object.assign(elements.wFree, { value: '.5' });
Object.assign(elements.wFrag, { value: '.15' });
global.document = { querySelector: selector => elements[selector.replace('#', '')] };

const assertions = `
function render() {}
function fitView() {}
function updateReport() {}
function updateValidation() {
  const W=num('stockW'), H=num('stockH'), m=num('margin'), g=num('gap');
  state.placements.forEach((p,i)=>p.invalid=!valid(p,state.placements,W,H,m,g,i));
  state.freeRect=estimateFreeRect();
}
(async () => {
  const dxf=(w,h)=>['0','SECTION','2','ENTITIES','0','LWPOLYLINE','90','4','70','1','10','0','20','0','10',String(w),'20','0','10',String(w),'20',String(h),'10','0','20',String(h),'0','ENDSEC','0','EOF'].join('\\n');
  state.parts=[{name:'rectangle-a',...DXFParser.parse(dxf(200,100),'rectangle-a')},{name:'rectangle-b',...DXFParser.parse(dxf(150,80),'rectangle-b')}];
  if (state.parts[0].b.w !== 200 || state.parts[0].b.h !== 100) throw new Error('Rectangle bbox parse failed');
  await nest();
  if (state.placements.length !== 2 || state.unplaced.length) throw new Error('Nesting failed');
  if (state.placements.some((p,i)=>!valid(p,state.placements,num('stockW'),num('stockH'),num('margin'),num('gap'),i))) throw new Error('Invalid placement');
  if (!state.freeRect || state.freeRect.area <= 0) throw new Error('Free rectangle estimate failed');
  console.log('Parser: 2 sample files OK; Nesting: 2/2 valid; Free rectangle:', state.freeRect.area.toFixed(1), 'mm²');
})().catch(error=>{console.error(error);process.exitCode=1});`;

eval(core + assertions);
