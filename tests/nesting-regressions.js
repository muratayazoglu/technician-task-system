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
 // Import preparation must find the minimum-area whole-degree bounding box and make it the no-rotation baseline.
 const rawRect=rectangle('pre-rotated',200,40),tilted={...rawRect,outer:rotatedPoly(rawRect.outer,27)};tilted.b=bbox(tilted.outer);const prepared=prepareImportedPart(tilted),preparedVariant=variants(prepared)[0];
 if(prepared.initialRotation!==63)throw new Error('import pre-rotation did not select the first minimum bbox angle: '+prepared.initialRotation);
 if(Math.abs(prepared.b.w*prepared.b.h-8000)>.1||Math.abs(preparedVariant.w*preparedVariant.h-8000)>.1)throw new Error('optimized import bbox was not used as nesting baseline');
 // Reusable largest rectangle is not scrap/fire.
 const wm=wasteMetrics(10000,3000,5000);if(Math.abs(wm.net-2000)>.001||Math.abs(wm.ratio-20)>.001)throw new Error('net fire excludes reusable area incorrectly');
 // Global score must strongly reject a detached upper-left/outlier part.
 const clustered=[{x:0,y:0,w:40,h:40},{x:45,y:0,w:40,h:40},{x:90,y:0,w:40,h:40}],stray=[{x:0,y:0,w:40,h:40},{x:45,y:0,w:40,h:40},{x:0,y:200,w:40,h:40}];if(layoutScore(clustered,500,300,0,'bottom')>=layoutScore(stray,500,300,0,'bottom'))throw new Error('cluster objective does not penalize detached upper part');
 // Exact 3x2 packing: usable stock is 310x205 and requires the 5 mm clearance to be included in candidate coordinates.
 state.parts=Array.from({length:6},(_,i)=>rectangle('dense-'+i,100,100));
 for(const mode of ['bottomleft','left','bottom','remainder']){
  elements.mode.value=mode;await nest();
  if(state.placements.length!==6||state.unplaced.length)throw new Error(mode+' dense clearance packing failed: '+state.placements.length+'/6');
  if(state.placements.some((p,i)=>!valid(p,state.placements,320,215,5,5,i)))throw new Error(mode+' produced invalid placement');
 }
 // Rescue pass must retry an unplaced part against the completed layout.
 const rescueItems=state.parts.map((p,i)=>({p,i,vars:variants(p)})),partial={placed:state.placements.slice(0,5),un:[state.placements[5].part]};const rescued=rescueLayout(partial,rescueItems,320,215,5,5,'bottomleft',nowMs()+3000);if(rescued.placed.length!==6||rescued.un.length)throw new Error('rescue pass failed to insert available part');
 // Strict alignment modes: when one row/column is feasible, no stray opposite-edge part is allowed.
 elements.stockW.value='500';elements.stockH.value='300';elements.margin.value='5';elements.gap.value='5';elements.rot.value='0';elements.mode.value='bottom';
 state.parts=[rectangle('wide-a',120,80),rectangle('wide-b',100,110),rectangle('wide-c',90,60),rectangle('wide-d',70,95)];await nest();
 if(state.placements.some(p=>Math.abs(p.y-5)>1e-6))throw new Error('bottom alignment left a stray upper part');
 const bottomBox=placementBounds(state.placements,5);if(bottomBox.h>110.001)throw new Error('bottom alignment did not achieve known one-row optimum');
 // Bottom compaction must rotate a slender upper outlier horizontally when that lowers the occupied height.
 elements.stockW.value='510';elements.stockH.value='300';elements.margin.value='5';elements.gap.value='5';elements.rot.value='90';elements.mode.value='bottom';
 state.parts=[rectangle('base-a',150,100),rectangle('base-b',150,100),rectangle('slender',30,180)];const bottomItems=state.parts.map((p,i)=>({p,i,vars:variants(p)})),vertical=bottomItems[2].vars.find(v=>v.h>v.w),basePlaced=[{part:0,x:5,y:5,...bottomItems[0].vars[0],invalid:false},{part:1,x:160,y:5,...bottomItems[1].vars[0],invalid:false},{part:2,x:5,y:110,...vertical,invalid:false}],bottomFixed=compactLayout(basePlaced,bottomItems,510,300,5,5,'bottom',nowMs()+3000);
 if(placementBounds(bottomFixed,5).h>100.001||bottomFixed.find(p=>p.part===2).h>bottomFixed.find(p=>p.part===2).w)throw new Error('bottom compaction kept a slender detached upper part vertical');
 await nest();const slenderPlaced=state.placements.find(p=>p.part===2);if(placementBounds(state.placements,5).h>100.001||!slenderPlaced||slenderPlaced.h>slenderPlaced.w)throw new Error('bottom nesting left a slender detached upper part');
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
