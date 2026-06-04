'use strict';
const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const fullScript = html.match(/<script>([\s\S]*?)<\/script>/)[1];
const parserScript = fullScript.split('/* ---------------- Geometry, collision, nesting')[0];
global.document = { querySelector: () => ({ value: '0' }) };

const pair = (code, value) => `${code}\n${value}\n`;
const wrap = entities => pair(0, 'SECTION') + pair(2, 'ENTITIES') + entities + pair(0, 'ENDSEC') + pair(0, 'EOF');
const lw = (points, flag = 0) => pair(0, 'LWPOLYLINE') + pair(90, points.length) + pair(70, flag) + points.map(([x,y]) => pair(10,x) + pair(20,y)).join('');
const line = (a,b) => pair(0,'LINE') + pair(10,a[0]) + pair(20,a[1]) + pair(11,b[0]) + pair(21,b[1]);
const ellipse = pair(0,'ELLIPSE') + pair(10,50) + pair(20,30) + pair(11,50) + pair(21,0) + pair(40,.5) + pair(41,0) + pair(42,Math.PI*2);
const hatch = pair(0,'HATCH') + pair(92,2) + pair(72,0) + pair(73,1) + pair(93,4) + [[0,0],[80,0],[80,40],[0,40]].map(([x,y]) => pair(10,x) + pair(20,y)).join('') + pair(97,0);
const edgeHatch = pair(0,'HATCH') + pair(92,1) + pair(93,4) + [[[0,0],[70,0]],[[70,0],[70,30]],[[70,30],[0,30]],[[0,30],[0,0]]].map(([a,b]) => pair(72,1) + pair(10,a[0]) + pair(20,a[1]) + pair(11,b[0]) + pair(21,b[1])).join('') + pair(97,0);
const spline = pair(0,'SPLINE') + pair(70,1) + [[0,0],[100,0],[100,50],[0,50]].map(([x,y]) => pair(10,x) + pair(20,y)).join('');
const splineEntity = (points, degree=1, flag=0, knots=[0,0,1,1], weights=[]) => pair(0,'SPLINE') + pair(70,flag) + pair(71,degree) + pair(72,knots.length) + pair(73,points.length) + knots.map(k=>pair(40,k)).join('') + weights.map(w=>pair(41,w)).join('') + points.map(([x,y])=>pair(10,x)+pair(20,y)).join('');
const splineOnlyBoundary = splineEntity([[0,0],[100,0]]) + splineEntity([[100,0],[100,60]]) + splineEntity([[100,60],[0,60]]) + splineEntity([[0,60],[0,0]]);
const tenSplinePoints=[[0,0],[20,0],[40,0],[60,0],[80,0],[100,0],[100,60],[75,60],[50,60],[25,60],[0,60],[0,0]],tenSplineBoundary=tenSplinePoints.slice(1).map((point,i)=>splineEntity([tenSplinePoints[i],point])).join('');
const rationalQuarterCircle = splineEntity([[50,0],[50,50],[0,50]],2,0,[0,0,0,1,1,1],[1,Math.SQRT1_2,1]) + line([0,50],[0,0]) + line([0,0],[50,0]);
const cases = [
  ['implicit closed LWPOLYLINE', wrap(lw([[0,0],[100,0],[100,50],[0,50],[0,0]])), 100, 50],
  ['closed flag LWPOLYLINE', wrap(lw([[0,0],[120,0],[120,60],[0,60]], 1)), 120, 60],
  ['missing closed flag fallback', wrap(lw([[0,0],[90,0],[90,45],[0,45]])), 90, 45],
  ['polyline HATCH boundary', wrap(hatch), 80, 40],
  ['edge HATCH boundary', wrap(edgeHatch), 70, 30],
  ['tolerant unordered LINE chain', wrap(line([100,50],[0,50.004])+line([0,0],[100,0])+line([100,0],[100,50])+line([0,50],[0,0])), 100, 50],
  ['full ELLIPSE', wrap(ellipse), 100, 50],
  ['closed SPLINE fallback approximation', wrap(spline), 100, 50],
  ['SPLINE-only joined boundary', wrap(splineOnlyBoundary), 100, 60],
  ['ten open SPLINE entities joined as contour', wrap(tenSplineBoundary), 100, 60],
  ['rational NURBS plus LINE boundary', wrap(rationalQuarterCircle), 50, 50],
];

eval(parserScript + `\nfor (const [name,dxf,w,h] of cases) {\n const parsed=DXFParser.parse(dxf,name);\n if(Math.abs(parsed.b.w-w)>.1||Math.abs(parsed.b.h-h)>.1)throw new Error(name+' bbox failed: '+parsed.b.w+'x'+parsed.b.h);\n console.log(name+': OK ('+parsed.outer.length+' points)');\n}`);
