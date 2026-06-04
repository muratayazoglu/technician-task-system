'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = fullScript.split('/* ---------------- Canvas renderer')[0];
const elements = new Proxy({}, { get: (target, key) => target[key] ||= { value: '0', style: {}, textContent: '', innerHTML: '' } });
Object.assign(elements.stockW, { value: '320' });
Object.assign(elements.stockH, { value: '215' });
Object.assign(elements.margin, { value: '5' });
Object.assign(elements.gap, { value: '5' });
Object.assign(elements.rot, { value: '90' });
Object.assign(elements.mode, { value: 'bottomleft' });
Object.assign(elements.wArea, { value: '1' });
Object.assign(elements.wEdge, { value: '1' });
Object.assign(elements.wFree, { value: '.5' });
Object.assign(elements.wFrag, { value: '.15' });
global.document = { querySelector: selector => elements[selector.replace('#', '')] };

const assertions = `
function render() {}
function fitView() {}
function updateReport() {}
function updateValidation() {
 const W=num('stockW'),H=num('stockH'),m=num('margin'),g=num('gap');
 state.placements.forEach((p,i)=>p.invalid=!valid(p,state.placements,W,H,m,g,i));
 state.freeRect=estimateFreeRect();
}
const rectangle=(name,w,h)=>({name,outer:[{x:0,y:0},{x:w,y:0},{x:w,y:h},{x:0,y:h}],holes:[],b:{minX:0,minY:0,maxX:w,maxY:h,w,h},polyArea:w*h,warnings:[]});
(async()=>{
 // Exact 3x2 packing: usable stock is 310x205 and requires the 5 mm clearance to be included in candidate coordinates.
 state.parts=Array.from({length:6},(_,i)=>rectangle('dense-'+i,100,100));
 for(const mode of ['bottomleft','left','bottom','remainder']){
  elements.mode.value=mode;await nest();
  if(state.placements.length!==6||state.unplaced.length)throw new Error(mode+' dense clearance packing failed: '+state.placements.length+'/6');
  if(state.placements.some((p,i)=>!valid(p,state.placements,320,215,5,5,i)))throw new Error(mode+' produced invalid placement');
 }
 // Strict alignment modes: when one row/column is feasible, no stray opposite-edge part is allowed.
 elements.stockW.value='500';elements.stockH.value='300';elements.margin.value='5';elements.gap.value='5';elements.rot.value='0';elements.mode.value='bottom';
 state.parts=[rectangle('wide-a',120,80),rectangle('wide-b',100,110),rectangle('wide-c',90,60),rectangle('wide-d',70,95)];await nest();
 if(state.placements.some(p=>Math.abs(p.y-5)>1e-6))throw new Error('bottom alignment left a stray upper part');
 const bottomBox=placementBounds(state.placements,5);if(bottomBox.h>110.001)throw new Error('bottom alignment did not achieve known one-row optimum');
 elements.stockW.value='300';elements.stockH.value='500';elements.mode.value='left';await nest();
 if(state.placements.some(p=>Math.abs(p.x-5)>1e-6))throw new Error('left alignment left a stray right-side part');
 const leftBox=placementBounds(state.placements,5);if(leftBox.w>120.001)throw new Error('left alignment did not achieve known one-column optimum');
 // Rotation is required to fit both parts side by side in the usable 300x200 stock.
 elements.stockW.value='310';elements.stockH.value='210';elements.mode.value='bottomleft';elements.rot.value='90';
 state.parts=[rectangle('rot-a',190,110),rectangle('rot-b',190,110)];await nest();
 if(state.placements.length!==2||!state.placements.some(p=>p.rotation===90))throw new Error('rotation-assisted packing failed');
 // Complementary right triangles must share one 100x100 bounding area without polygon overlap.
 elements.stockW.value='100';elements.stockH.value='100';elements.margin.value='0';elements.gap.value='0';elements.rot.value='four';
 const triangle=(name)=>({name,outer:[{x:0,y:0},{x:100,y:0},{x:0,y:100}],holes:[],b:{minX:0,minY:0,maxX:100,maxY:100,w:100,h:100},polyArea:5000,warnings:[]});
 state.parts=[triangle('triangle-a'),triangle('triangle-b')];await nest();
 if(state.placements.length!==2)throw new Error('complementary triangle nesting failed');
 const tb=placementBounds(state.placements,0);if(Math.abs(tb.w*tb.h-10000)>.1)throw new Error('triangles did not share a single square bbox');
 // Empty stock must return the complete usable stock as the largest free rectangle.
 state.placements=[];state.freeRect=estimateFreeRect();if(Math.abs(state.freeRect.area-10000)>.1)throw new Error('empty-stock free rectangle failed: '+state.freeRect.area);
 // A single triangle leaves a real rectangular remainder; bbox-based occupancy incorrectly reported zero.
 state.parts=[triangle('triangle-free-space')];await nest();
 if(!state.freeRect||state.freeRect.area<1500)throw new Error('polygon free rectangle estimate failed: '+(state.freeRect&&state.freeRect.area));
 const fr=state.freeRect,fp=worldPoly(state.placements[0]);for(const corner of [{x:fr.x,y:fr.y},{x:fr.x+fr.w,y:fr.y},{x:fr.x,y:fr.y+fr.h},{x:fr.x+fr.w,y:fr.y+fr.h}])if(pointInPolyStrict(corner,fp))throw new Error('free rectangle intersects part contour');
 console.log('Nesting regressions: clearance packing, rotation, complementary triangles and polygon free rectangle OK');
})().catch(error=>{console.error(error);process.exitCode=1});`;
eval(core + assertions);
