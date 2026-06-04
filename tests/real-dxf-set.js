'use strict';
// Runs the standalone parser/nester against every real DXF committed below tests/.
const fs = require('fs');
const path = require('path');
const dxfFiles = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const file = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(file);
    else if (/\.dxf$/i.test(entry.name)) dxfFiles.push(file);
  }
}
walk('tests');
if (!dxfFiles.length) {
  console.log('Real DXF set: SKIP (tests/ altında DXF dosyası bulunamadı)');
  process.exit(0);
}
const html = fs.readFileSync('index.html', 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = fullScript.split('/* ---------------- Canvas renderer')[0];
const elements = new Proxy({}, { get: (target, key) => target[key] ||= { value: '0', style: {}, textContent: '', innerHTML: '' } });
Object.assign(elements.margin,{value:'5'});Object.assign(elements.gap,{value:'5'});Object.assign(elements.rot,{value:'90'});Object.assign(elements.mode,{value:'bottom'});Object.assign(elements.wArea,{value:'1.2'});Object.assign(elements.wEdge,{value:'1.4'});Object.assign(elements.wFree,{value:'.8'});Object.assign(elements.wFrag,{value:'.35'});
global.document={querySelector:selector=>elements[selector.replace('#','')]};
const assertions = `
function render(){} function fitView(){} function updateReport(){}
function updateValidation(recomputeFree=true){const W=num('stockW'),H=num('stockH'),m=num('margin'),g=num('gap');state.placements.forEach((p,i)=>p.invalid=!valid(p,state.placements,W,H,m,g,i));if(recomputeFree)state.freeRect=estimateFreeRect()}
(async()=>{
 state.parts=dxfFiles.map(file=>({name:file,...prepareImportedPart(DXFParser.parse(fs.readFileSync(file,'utf8'),file))}));
 const cols=Math.ceil(Math.sqrt(state.parts.length)),rows=Math.ceil(state.parts.length/cols),maxW=Math.max(...state.parts.map(p=>p.b.w)),maxH=Math.max(...state.parts.map(p=>p.b.h));
 elements.stockW.value=String(cols*maxW+(cols-1)*5+10);elements.stockH.value=String(rows*maxH+(rows-1)*5+10);
 const start=nowMs();await nest();const elapsed=nowMs()-start;
 if(state.placements.length!==state.parts.length||state.unplaced.length)throw new Error('real DXF completion failed: '+state.placements.length+'/'+state.parts.length);
 if(state.placements.some((p,i)=>!valid(p,state.placements,num('stockW'),num('stockH'),5,5,i)))throw new Error('real DXF placement invalid');
 if(elapsed>60000)throw new Error('real DXF set exceeded 60 seconds: '+elapsed);
 console.log('Real DXF set:',state.placements.length+'/'+state.parts.length,'placed in',elapsed.toFixed(0),'ms');
})().catch(e=>{console.error(e);process.exitCode=1});`;
eval(core + assertions);
