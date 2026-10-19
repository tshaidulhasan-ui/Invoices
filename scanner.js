'use strict';
/* ===== Receipt scanner (v2): finds the 4 real corners, straightens smoothly, live preview. Future scanner fixes go here. ===== */
const fullQ=c=>[[0,0],[c.width,0],[c.width,c.height],[0,c.height]];
function copyCanvas(src,max){const s=Math.min(1,max/Math.max(src.width,src.height)),c=document.createElement('canvas');c.width=Math.max(1,Math.round(src.width*s));c.height=Math.max(1,Math.round(src.height*s));
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(src,0,0,c.width,c.height);return c}
/* Find the paper: largest bright area, then its 4 corners (works for tilted receipts) */
function detectQuad(cv){const sc=Math.min(1,360/Math.max(cv.width,cv.height)),w=Math.max(8,Math.round(cv.width*sc)),h=Math.max(8,Math.round(cv.height*sc)),t=document.createElement('canvas');
 t.width=w;t.height=h;const cx=t.getContext('2d');cx.drawImage(cv,0,0,w,h);const d=cx.getImageData(0,0,w,h).data,n=w*h,g=new Uint8Array(n),hist=new Uint32Array(256);
 for(let i=0;i<n;i++){g[i]=(d[i*4]*299+d[i*4+1]*587+d[i*4+2]*114)/1000;hist[g[i]]++}
 let sum=0;for(let k=0;k<256;k++)sum+=k*hist[k];let sB=0,wB=0,best=0,th=128;
 for(let k=0;k<256;k++){wB+=hist[k];if(!wB)continue;const wF=n-wB;if(!wF)break;sB+=k*hist[k];const v=wB*wF*((sB/wB)-((sum-sB)/wF))**2;if(v>best){best=v;th=k}}
 const lab=new Int32Array(n).fill(-1),q=new Int32Array(n);let bestSize=0,bestId=-1,id=0;
 for(let s0=0;s0<n;s0++){if(g[s0]<=th||lab[s0]>=0)continue;let qh=0,qt=0,size=0;q[qt++]=s0;lab[s0]=id;
  while(qh<qt){const p=q[qh++];size++;const x=p%w,y=(p/w)|0;
   if(x>0&&g[p-1]>th&&lab[p-1]<0){lab[p-1]=id;q[qt++]=p-1}if(x<w-1&&g[p+1]>th&&lab[p+1]<0){lab[p+1]=id;q[qt++]=p+1}
   if(y>0&&g[p-w]>th&&lab[p-w]<0){lab[p-w]=id;q[qt++]=p-w}if(y<h-1&&g[p+w]>th&&lab[p+w]<0){lab[p+w]=id;q[qt++]=p+w}}
  if(size>bestSize){bestSize=size;bestId=id}id++}
 if(bestSize<n*.08||bestSize>n*.96)return null;
 let cTL,cTR,cBR,cBL,mn=1e9,mx=-1e9,md=-1e9,nd=1e9;
 for(let p=0;p<n;p++){if(lab[p]!==bestId)continue;const x=p%w,y=(p/w)|0,s=x+y,df=x-y;if(s<mn){mn=s;cTL=[x,y]}if(s>mx){mx=s;cBR=[x,y]}if(df>md){md=df;cTR=[x,y]}if(df<nd){nd=df;cBL=[x,y]}}
 const k=1/sc,quad=[cTL,cTR,cBR,cBL].map(([x,y])=>[Math.min(cv.width,Math.max(0,x*k)),Math.min(cv.height,Math.max(0,y*k))]);
 let area=0;for(let i=0;i<4;i++){const a=quad[i],b=quad[(i+1)%4];area+=a[0]*b[1]-b[0]*a[1]}
 return Math.abs(area)/2<cv.width*cv.height*.08?null:quad}
detectEdges=detectQuad;
/* Smooth straightening (blends neighbouring pixels so text edges stay clean) */
warp=function(src,q,maxSide){const dd=(p,r)=>Math.hypot(p[0]-r[0],p[1]-r[1]);let W=Math.max(dd(q[0],q[1]),dd(q[3],q[2])),H=Math.max(dd(q[0],q[3]),dd(q[1],q[2]));
 const s=Math.min(1,maxSide/Math.max(W,H));W=Math.max(1,Math.round(W*s));H=Math.max(1,Math.round(H*s));
 const sw=src.width,sh=src.height,sd=src.getContext('2d').getImageData(0,0,sw,sh).data,hm=homography([[0,0],[W,0],[W,H],[0,H]],q);
 const out=document.createElement('canvas');out.width=W;out.height=H;const oc=out.getContext('2d'),od=oc.createImageData(W,H),o=od.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const z=hm[6]*x+hm[7]*y+1;let u=(hm[0]*x+hm[1]*y+hm[2])/z,v=(hm[3]*x+hm[4]*y+hm[5])/z;
  u=Math.min(sw-1.001,Math.max(0,u));v=Math.min(sh-1.001,Math.max(0,v));const x0=u|0,y0=v|0,fx=u-x0,fy=v-y0,i00=(y0*sw+x0)*4,i10=i00+4,i01=i00+sw*4,i11=i01+4,oi=(y*W+x)*4;
  for(let c=0;c<3;c++)o[oi+c]=(sd[i00+c]*(1-fx)+sd[i10+c]*fx)*(1-fy)+(sd[i01+c]*(1-fx)+sd[i11+c]*fx)*fy;o[oi+3]=255}
 oc.putImageData(od,0,0);return out};
/* Step 1: crop */
openScanner=function(file,onDone){const img=new Image();img.onload=()=>{const c=copyCanvas(img,2400);URL.revokeObjectURL(img.src);const shot=/png/i.test(file.type);
 SC={src:c,shot,onDone,mode:shot?'orig':'bw'};SC.q=shot?fullQ(c):(detectQuad(c)||insetQ(c));showCrop()};img.onerror=()=>toast('Could not open that image');img.src=URL.createObjectURL(file)};
function bindHandles(){document.querySelectorAll('.hdl').forEach(h=>{h.onpointerdown=e=>{e.preventDefault();h.setPointerCapture(e.pointerId);const k=+h.dataset.k;
 h.onpointermove=ev=>{const r=$('#sccv').getBoundingClientRect(),s=SC.src.width/r.width;SC.q[k]=[Math.max(0,Math.min(SC.src.width,(ev.clientX-r.left)*s)),Math.max(0,Math.min(SC.src.height,(ev.clientY-r.top)*s))];placeHandles()};
 h.onpointerup=h.onpointercancel=()=>{h.onpointermove=null}}})}
function showCrop(){modal(`<h3>1. Crop the receipt</h3><p class="mu small" style="margin:0 0 10px">${SC.shot?'Screenshot detected: nothing needs straightening. Drag the corners only if you want to crop.':'Drag the blue corners onto the 4 corners of the receipt. The app straightens it for you.'}</p>
 <div style="text-align:center"><div id="scbox" style="position:relative;display:inline-block;touch-action:none;user-select:none;-webkit-user-select:none;max-width:100%"><canvas id="sccv" style="display:block;max-width:100%;max-height:52vh;border-radius:10px"></canvas><svg id="scsvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>${[0,1,2,3].map(k=>`<div class="hdl" data-k="${k}"></div>`).join('')}</div></div>
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px"><button class="btn sm sec" onclick="rotateScan()">Rotate</button><button class="btn sm sec" onclick="SC.q=fullQ(SC.src);placeHandles()">Whole image</button><button class="btn sm sec" onclick="SC.q=detectQuad(SC.src)||insetQ(SC.src);placeHandles()">Auto-detect</button></div>
 <div class="mbtns"><button class="btn ghost" onclick="closeModal();SC=null">Cancel</button><button class="btn" onclick="showPreview()">Next</button></div>`);
 drawScan();bindHandles()}
rotateScan=function(){const s=SC.src,c=document.createElement('canvas');c.width=s.height;c.height=s.width;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(s,0,0);
 SC.src=c;SC.q=SC.shot?fullQ(c):(detectQuad(c)||insetQ(c));drawScan()};
/* Step 2: live preview */
async function showPreview(){toast('Straightening\u2026');await new Promise(r=>setTimeout(r,30));const f=fullQ(SC.src),isFull=SC.q.every((p,k)=>Math.abs(p[0]-f[k][0])<3&&Math.abs(p[1]-f[k][1])<3);
 SC.out=isFull?copyCanvas(SC.src,1700):warp(SC.src,SC.q,1700);renderPreview()}
function processedScan(){const c=copyCanvas(SC.out,1e5);return SC.mode==='orig'?c:enhance(c,SC.mode)}
function renderPreview(){modal(`<h3>2. Check the scan</h3><p class="mu small" style="margin:0 0 10px">Pick the look that's easiest to read. Document suits paper receipts; Original suits screenshots.</p>
 <div class="seg" style="margin-bottom:10px">${[['bw','Document'],['color','Colour'],['orig','Original']].map(([m,l])=>`<button class="${SC.mode===m?'on':''}" onclick="SC.mode='${m}';renderPreview()">${l}</button>`).join('')}</div>
 <div style="text-align:center;background:#eceef1;border-radius:12px;padding:10px"><canvas id="pvcv" style="max-width:100%;max-height:50vh;display:inline-block;border-radius:6px;box-shadow:var(--sh);background:#fff"></canvas></div>
 <div style="display:flex;gap:8px;margin-top:12px"><button class="btn sm sec" onclick="showCrop()">Back to crop</button><button class="btn sm sec" onclick="rotateOut()">Rotate</button></div>
 <div class="mbtns"><button class="btn ghost" onclick="closeModal();SC=null">Cancel</button><button class="btn" onclick="finishScan()">Use this</button></div>`);
 const pv=processedScan(),cv=$('#pvcv');cv.width=pv.width;cv.height=pv.height;cv.getContext('2d').drawImage(pv,0,0)}
function rotateOut(){const s=SC.out,c=document.createElement('canvas');c.width=s.height;c.height=s.width;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(s,0,0);SC.out=c;renderPreview()}
finishScan=async function(){const out=processedScan(),blob=await new Promise(r=>out.toBlob(r,'image/jpeg',SC.mode==='bw'?.78:.88));const cb=SC.onDone;SC=null;closeModal();cb(blob)};
