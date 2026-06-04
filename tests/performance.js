'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const core = fullScript.split('/* ---------------- Canvas renderer')[0];
const elements = new Proxy({}, { get: (target, key) => target[key] ||= { value: '0', style: {}, textContent: '', innerHTML: '' } });
Object.assign(elements.stockW,{value:'1800'});Object.assign(elements.stockH,{value:'1200'});Object.assign(elements.margin,{value:'10'});Object.assign(elements.gap,{value:'5'});Object.assign(elements.rot,{value:'15'});Object.assign(elements.mode,{value:'bottomleft'});Object.assign(elements.wArea,{value:'1.2'});Object.assign(elements.wEdge,{value:'1.4'});Object.assign(elements.wFree,{value:'.8'});Object.assign(elements.wFrag,{value:'.35'});
global.document={querySelector:selector=>elements[selector.replace('#','')]};
const assertions=`
function render(){} function fitView(){} function updateReport(){}
function updateValidation(recomputeFree=true){const W=num('stockW'),H=num('stockH'),m=num('margin'),g=num('gap');state.placements.forEach((p,i)=>p.invalid=!valid(p,state.placements,W,H,m,g,i));if(recomputeFree)state.freeRect=estimateFreeRect()}
const complex=(name,phase)=>{const outer=Array.from({length:360},(_,i)=>{const a=i*TAU/360,r=70+8*Math.sin(5*a+phase)+4*Math.sin(11*a);return{x:80+r*Math.cos(a),y:80+r*Math.sin(a)}}),b=bbox(outer);return{name,outer,holes:[],b,polyArea:Math.abs(area(outer)),warnings:[]}};
(async()=>{state.parts=Array.from({length:16},(_,i)=>complex('complex-'+i,i*.3));const start=nowMs();await nest();const elapsed=nowMs()-start;if(elapsed>60000)throw new Error('16-part nesting exceeded 60 seconds: '+elapsed);if(state.placements.length!==16)throw new Error('not all 16 performance parts placed: '+state.placements.length);if(state.placements.some((p,i)=>!valid(p,state.placements,1800,1200,10,5,i)))throw new Error('performance placement invalid');console.log('Performance: 16 complex 360-point parts, 15° rotations:',elapsed.toFixed(0),'ms')})().catch(e=>{console.error(e);process.exitCode=1});`;
eval(core+assertions);
