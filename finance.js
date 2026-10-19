'use strict';
/* ===== Finance: expenses, receipts, dashboard, tax, Excel ===== */
const CATS=['Tools and equipment','PPE and workwear','Licences and training','Insurance','Vehicle and fuel','Phone and internet','Home office','Accounting and bank fees','Subscriptions and software','Other'];
const MONTHS=['Jul','Aug','Sep','Oct','Nov','Dec','Jan','Feb','Mar','Apr','May','Jun'];
const PAL=['#1f3a5f','#f59e0b','#10b981','#ef4444','#8b5cf6','#06b6d4','#ec4899','#84cc16','#64748b','#a16207'];
const liveExp=()=>(S.expenses||[]).filter(x=>!x.deleted);
const findExp=id=>S.expenses.find(x=>x.id===id);
const deductible=x=>Math.round((+x.amount||0)*(+x.pct||0))/100;
const round2=n=>Math.round((+n||0)*100)/100;
Object.assign(VIEWS,{expenses:renderExpenses,expEdit:renderExpEdit,dash:renderDash,tax:renderTax});
function loadScript(src){return new Promise((res,rej)=>{if(document.querySelector(`script[src="${src}"]`))return res();const s=document.createElement('script');s.src=src;s.onload=res;s.onerror=()=>rej(new Error('load'));document.head.appendChild(s)})}
function fySelect(){const cur=fy(today());if(curFY==null)curFY=cur;const ys=new Set([cur,...live().map(i=>fy(i.date)),...liveExp().map(x=>fy(x.date))]);
 return `<select class="fy" onchange="curFY=+this.value;render()">${[...ys].sort((a,b)=>b-a).map(y=>`<option value="${y}" ${y===curFY?'selected':''}>${fyLabel(y)}</option>`).join('')}</select>`}
const topBar=t=>`<div class="top"><h1>${t}</h1><div style="display:flex;gap:10px;align-items:center">${fySelect()}<button class="link mlock" onclick="lock()">Lock</button></div></div>`;

/* ===== Expenses list ===== */
function renderExpenses(){if(curFY==null)curFY=fy(today());const y=curFY;
 const list=liveExp().filter(x=>fy(x.date)===y).sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
 const spent=list.reduce((s,x)=>s+(+x.amount||0),0),ded=list.reduce((s,x)=>s+deductible(x),0),noRec=list.filter(x=>!x.receipts||!x.receipts.length).length;
 const groups={};list.forEach(x=>(groups[x.date.slice(0,7)]=groups[x.date.slice(0,7)]||[]).push(x));
 let h=`<div class="wrap">${topBar('Expenses')}
 <div class="stats"><div class="stat"><div class="mu small">Spent this FY</div><b>$${money(spent)}</b></div><div class="stat"><div class="mu small">Tax deductible</div><b style="color:var(--gr)">$${money(ded)}</b></div>
 <div class="stat"><div class="mu small">Expenses</div><b>${list.length}</b></div><div class="stat"><div class="mu small">Missing receipts</div><b style="color:${noRec?'var(--am)':'inherit'}">${noRec}</b></div></div>`;
 if(!list.length)h+=`<div class="empty">No expenses in ${fyLabel(y)} yet.<br>Tap <b>+ New expense</b> and snap a receipt.</div>`;
 Object.keys(groups).sort().reverse().forEach(k=>{const g=groups[k];
  h+=`<div class="mhead"><span class="cap">${D(k+'-01').toLocaleDateString('en-AU',{month:'long',year:'numeric'})}</span><span class="cap">$${money(g.reduce((s,x)=>s+deductible(x),0))} deductible</span></div><div class="card">${g.map(x=>`<div class="rc" style="border-bottom:1px solid var(--ln)" onclick="editExp('${x.id}')"><div class="av">${esc(initials(x.category.replace(' and ',' ')))}</div><div class="grow"><b>${esc(x.supplier||x.category)}</b><div class="mu small">${esc(x.category)} \u00b7 ${fmtD(x.date)}${+x.pct<100?` \u00b7 ${x.pct}% business`:''}</div></div><div class="amt">$${money(x.amount)}<br>${x.receipts&&x.receipts.length?'<span class="pill p-paid">Receipt</span>':'<span class="pill p-over">No receipt</span>'}</div></div>`).join('')}</div>`});
 app.innerHTML=h+`</div><button class="btn fab" onclick="newExp()">+ New expense</button>`}

/* ===== Expense editor ===== */
function newExp(){X={id:uid(),date:today(),supplier:'',category:CATS[0],amount:0,pct:100,notes:'',receipts:[],created:Date.now()};XFROM=null;go('expEdit')}
function editExp(id){X=clone(findExp(id));X.receipts=X.receipts||[];XFROM=id;go('expEdit')}
function expSum(){return `<div class="tot"><span class="mu">Amount paid</span><span>$${money(X.amount)}</span></div><div class="tot"><span class="mu">Business use</span><span>${X.pct}%</span></div><div class="tot big"><span>Tax deductible</span><span>$${money(deductible(X))}</span></div>`}
function updExp(){const e=$('#expsum');if(e)e.innerHTML=expSum()}
function setPct(p){X.pct=p;$('#pctl').textContent=`Business use: ${p}%`;$('#pctr').value=p;document.querySelectorAll('#pctq button').forEach(b=>b.classList.toggle('on',+b.textContent.replace('%','')===p));updExp()}
function renderExpEdit(){const x=X;
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="cancelExp()">Cancel</button><b>${XFROM?'Edit expense':'New expense'}</b><button class="btn sm" onclick="saveExp()">Save</button></div>
 <div class="edgrid"><div>
 <h2 class="sec">Receipt</h2><div class="card"><div class="pad">${x.receipts.length?`<div class="thumbs">${x.receipts.map(id=>`<div class="thumb" data-id="${id}" onclick="viewFile('${id}')"><span>\u2026</span><button class="x" onclick="event.stopPropagation();removeRec('${id}')">\u00d7</button></div>`).join('')}</div>`:''}
 <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:${x.receipts.length?12:0}px"><button class="btn sm" onclick="pickRec(true)">Take photo</button><button class="btn sm sec" onclick="pickRec(false)">Choose photo, scan or PDF</button>${x.receipts.length?'<button class="btn sm sec" onclick="readReceipt()">Auto-fill from receipt</button>':''}</div>
 <p class="mu small" style="margin-bottom:0">Sharpest result: scan with the iPhone Notes or Files app (Scan Documents), then choose it here.</p></div></div>
 <h2 class="sec">Details</h2><div class="card"><div class="fgrid two">
 <div class="fld"><label>Date</label><input id="x_date" class="inp" type="date" value="${x.date}" onchange="X.date=this.value"></div>
 <div class="fld"><label>Supplier</label><input id="x_sup" class="inp" value="${esc(x.supplier)}" placeholder="e.g. Bunnings" onchange="X.supplier=this.value"></div>
 <div class="fld"><label>Category</label><select class="inp" onchange="X.category=this.value">${CATS.map(c=>`<option ${c===x.category?'selected':''}>${c}</option>`).join('')}</select></div>
 <div class="fld"><label>Amount paid ($)</label><input id="x_amt" class="inp" type="number" inputmode="decimal" step="0.01" value="${x.amount||''}" placeholder="0.00" oninput="X.amount=this.valueAsNumber||0;updExp()"></div>
 <div class="fld" style="grid-column:1/-1"><label id="pctl">Business use: ${x.pct}%</label><input id="pctr" type="range" min="0" max="100" step="5" value="${x.pct}" style="width:100%;accent-color:var(--ac)" oninput="setPct(+this.value)">
 <div class="qc" id="pctq">${[100,80,60,50].map(p=>`<button class="${+x.pct===p?'on':''}" onclick="setPct(${p})">${p}%</button>`).join('')}</div></div>
 <div class="fld" style="grid-column:1/-1"><label>Notes</label><input class="inp" value="${esc(x.notes)}" placeholder="What was it for?" onchange="X.notes=this.value"></div></div></div></div>
 <div class="side"><h2 class="sec">Tax deduction</h2><div class="card" style="padding:8px 0" id="expsum">${expSum()}</div>
 <h2 class="sec">ATO calculators</h2><div class="stack"><button class="btn sec full" onclick="calcCar()">Car: cents per km</button><button class="btn sec full" onclick="calcHome()">Home office: fixed rate</button></div>
 ${XFROM?`<h2 class="sec">Actions</h2><button class="btn dan full" onclick="delExp('${XFROM}')">Delete expense</button>`:''}
 <p class="mu small" style="margin:12px 4px">Keep receipts for 5 years. Large purchases such as tools or equipment may need to be depreciated, so check those with your tax agent.</p></div></div></div>`;
 loadThumbs()}
async function loadThumbs(){for(const el of document.querySelectorAll('.thumb[data-id]')){try{const b=await loadFile(el.dataset.id),sp=el.querySelector('span');if(!b){sp.textContent='Missing';continue}
 if(b.type.startsWith('image/')){const img=document.createElement('img');img.src=URL.createObjectURL(b);img.alt='Receipt';sp.replaceWith(img)}else sp.textContent='PDF'}catch(e){}}}
async function viewFile(id){const b=await loadFile(id);if(!b)return toast('File not found');
 if(b.type.startsWith('image/'))modal(`<img src="${URL.createObjectURL(b)}" style="width:100%;border-radius:10px;display:block"><div class="mbtns"><button class="btn sec" onclick="closeModal()">Close</button></div>`);
 else deliver(new File([b],'receipt.pdf',{type:b.type}),'Receipt downloaded')}
function pickRec(cam){const inp=document.createElement('input');inp.type='file';inp.accept=cam?'image/*':'image/*,application/pdf';if(cam)inp.setAttribute('capture','environment');
 inp.onchange=()=>{const f=inp.files[0];if(!f)return;if(f.type==='application/pdf'){if(f.size>8e6)return toast('PDF is too large (max 8 MB)');addRec(f)}else openScanner(f,addRec)};inp.click()}
async function addRec(blob){const id=await saveFile(blob);X.receipts.push(id);(X._new=X._new||[]).push(id);renderExpEdit();toast('Receipt added')}
function removeRec(id){X.receipts=X.receipts.filter(r=>r!==id);(X._removed=X._removed||[]).push(id);renderExpEdit()}
async function saveExp(){const x=X;if(!(+x.amount>0))return toast('Enter the amount paid');if(!x.date)return toast('Enter a date');
 if(!x.receipts.length&&!await ask('No receipt','The ATO expects a receipt or record for most expenses. Save without one?','Save anyway'))return;
 const removed=(x._removed||[]).filter(id=>!(x._new||[]).includes(id)||true);delete x._new;delete x._removed;
 const old=XFROM?findExp(XFROM):null;if(old)Object.assign(old,clone(x));else S.expenses.push(clone(x));
 addLog(`Expense ${old?'updated':'added'}: ${x.supplier||x.category} $${money(x.amount)}`);await save();
 for(const id of removed)await fdel(id).catch(()=>{});
 curFY=fy(x.date);X=null;XFROM=null;toast('Expense saved');go('expenses')}
async function cancelExp(){for(const id of (X&&X._new)||[])await fdel(id).catch(()=>{});X=null;XFROM=null;go('expenses')}
async function delExp(id){if(!await ask('Delete expense?','It moves to Recently deleted in Settings, and its receipt is kept.','Delete',true))return;
 findExp(id).deleted=Date.now();addLog('Expense deleted');await save();X=null;XFROM=null;toast('Expense deleted');go('expenses')}
async function restoreExp(id){delete findExp(id).deleted;addLog('Expense restored');await save();toast('Expense restored');render()}
function calcCar(){const R=ratesFor(fy(X.date||today()));
 modal(`<h3>Car expenses: cents per km</h3><p class="mu small">${R.label}: ${Math.round(R.carKm*100)} cents per business km, up to 5,000 km per car per year. The rate covers all running costs, so don't also claim fuel or servicing for this car. Keep a record of how you worked out your kilometres.</p>
 <label class="lbl">Business kilometres</label><input id="ck" class="inp" type="number" inputmode="numeric" placeholder="e.g. 3200"><div class="mbtns"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="applyCar()">Use this amount</button></div>`)}
function applyCar(){const R=ratesFor(fy(X.date||today())),km=Math.min(5000,+$('#ck').value||0);if(!km)return toast('Enter kilometres');
 Object.assign(X,{amount:round2(km*R.carKm),pct:100,category:'Vehicle and fuel',supplier:X.supplier||'Car (cents per km)',notes:`${km} business km at ${Math.round(R.carKm*100)}c/km`});closeModal();renderExpEdit()}
function calcHome(){const R=ratesFor(fy(X.date||today()));
 modal(`<h3>Home office: fixed rate</h3><p class="mu small">${R.label}: ${Math.round(R.homeHr*100)} cents per hour worked from home. It covers electricity, gas, phone, internet and stationery, so don't claim those separately. Keep a record of your hours.</p>
 <label class="lbl">Hours worked from home</label><input id="hh" class="inp" type="number" inputmode="numeric" placeholder="e.g. 120"><div class="mbtns"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="applyHome()">Use this amount</button></div>`)}
function applyHome(){const R=ratesFor(fy(X.date||today())),h=+$('#hh').value||0;if(!h)return toast('Enter hours');
 Object.assign(X,{amount:round2(h*R.homeHr),pct:100,category:'Home office',supplier:X.supplier||'Home office (fixed rate)',notes:`${h} hours at ${Math.round(R.homeHr*100)}c/hour`});closeModal();renderExpEdit()}

/* ===== Receipt scanner: crop, straighten, clean up ===== */
function openScanner(file,onDone){const img=new Image();img.onload=()=>{const s=Math.min(1,2400/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);c.getContext('2d').drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(img.src);
 SC={src:c,mode:'bw',onDone};SC.q=detectEdges(c)||insetQ(c);showScanner()};img.onerror=()=>toast('Could not read that image');img.src=URL.createObjectURL(file)}
const insetQ=c=>{const a=c.width*.05,b=c.height*.05;return[[a,b],[c.width-a,b],[c.width-a,c.height-b],[a,c.height-b]]};
function showScanner(){modal(`<h3>Adjust receipt</h3><p class="mu small" style="margin:0 0 10px">Drag the blue corners to the edges of the receipt.</p>
 <div style="text-align:center"><div id="scbox" style="position:relative;display:inline-block;touch-action:none;user-select:none;-webkit-user-select:none;max-width:100%"><canvas id="sccv" style="display:block;max-width:100%;max-height:56vh;border-radius:10px"></canvas><svg id="scsvg" style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none"></svg>${[0,1,2,3].map(k=>`<div class="hdl" data-k="${k}"></div>`).join('')}</div></div>
 <div class="seg" style="margin-top:12px">${[['bw','Document'],['color','Colour'],['orig','Original']].map(([m,l])=>`<button class="${SC.mode===m?'on':''}" onclick="SC.mode='${m}';this.parentNode.querySelectorAll('button').forEach(b=>b.classList.remove('on'));this.classList.add('on')">${l}</button>`).join('')}</div>
 <div class="mbtns"><button class="btn sec" onclick="rotateScan()">Rotate</button><button class="btn sec" onclick="SC.q=insetQ(SC.src);placeHandles()">Whole photo</button><button class="btn ghost" onclick="closeModal();SC=null">Cancel</button><button class="btn" onclick="finishScan()">Use scan</button></div>`);
 drawScan();document.querySelectorAll('.hdl').forEach(h=>{h.onpointerdown=e=>{e.preventDefault();h.setPointerCapture(e.pointerId);const k=+h.dataset.k;
  h.onpointermove=ev=>{const r=$('#sccv').getBoundingClientRect(),s=SC.src.width/r.width;SC.q[k]=[Math.max(0,Math.min(SC.src.width,(ev.clientX-r.left)*s)),Math.max(0,Math.min(SC.src.height,(ev.clientY-r.top)*s))];placeHandles()};
  h.onpointerup=h.onpointercancel=()=>{h.onpointermove=null}}})}
function drawScan(){const cv=$('#sccv');cv.width=SC.src.width;cv.height=SC.src.height;cv.getContext('2d').drawImage(SC.src,0,0);requestAnimationFrame(placeHandles)}
function placeHandles(){const cv=$('#sccv');if(!cv||!SC)return;const r=cv.getBoundingClientRect(),s=r.width/SC.src.width;
 document.querySelectorAll('.hdl').forEach(h=>{const p=SC.q[+h.dataset.k];h.style.left=p[0]*s+'px';h.style.top=p[1]*s+'px'});
 $('#scsvg').innerHTML=`<polygon points="${SC.q.map(p=>p[0]*s+','+p[1]*s).join(' ')}" fill="rgba(37,99,235,.12)" stroke="#2563eb" stroke-width="2"/>`}
function rotateScan(){const s=SC.src,c=document.createElement('canvas');c.width=s.height;c.height=s.width;const x=c.getContext('2d');x.translate(c.width,0);x.rotate(Math.PI/2);x.drawImage(s,0,0);SC.src=c;SC.q=detectEdges(c)||insetQ(c);drawScan()}
async function finishScan(){toast('Processing\u2026');await new Promise(r=>setTimeout(r,30));const out=enhance(warp(SC.src,SC.q,1700),SC.mode);
 const blob=await new Promise(r=>out.toBlob(r,'image/jpeg',SC.mode==='bw'?.72:.8));const cb=SC.onDone;SC=null;closeModal();cb(blob)}
function detectEdges(cv){const s=Math.min(1,320/Math.max(cv.width,cv.height)),w=Math.max(1,Math.round(cv.width*s)),h=Math.max(1,Math.round(cv.height*s));
 const t=document.createElement('canvas');t.width=w;t.height=h;const c=t.getContext('2d');c.drawImage(cv,0,0,w,h);const d=c.getImageData(0,0,w,h).data,g=new Uint8Array(w*h),hist=new Uint32Array(256);
 for(let i=0;i<w*h;i++){g[i]=(d[i*4]*299+d[i*4+1]*587+d[i*4+2]*114)/1000;hist[g[i]]++}
 let sum=0;for(let k=0;k<256;k++)sum+=k*hist[k];let sB=0,wB=0,best=0,th=128;
 for(let k=0;k<256;k++){wB+=hist[k];if(!wB)continue;const wF=w*h-wB;if(!wF)break;sB+=k*hist[k];const v=wB*wF*((sB/wB)-((sum-sB)/wF))**2;if(v>best){best=v;th=k}}
 const rows=[],cols=new Array(w).fill(0);for(let y=0;y<h;y++){let r=0;for(let x=0;x<w;x++)if(g[y*w+x]>th){r++;cols[x]++}rows.push(r/w)}
 const cf=cols.map(v=>v/h),first=a=>a.findIndex(v=>v>.25),last=a=>{for(let i=a.length-1;i>=0;i--)if(a[i]>.25)return i;return -1};
 const y0=first(rows),y1=last(rows),x0=first(cf),x1=last(cf);
 if(y0<0||x0<0||x1-x0<w*.2||y1-y0<h*.2||(x1-x0>w*.97&&y1-y0>h*.97))return null;const k=1/s,p=4*k;
 return[[Math.max(0,x0*k-p),Math.max(0,y0*k-p)],[Math.min(cv.width,x1*k+p),Math.max(0,y0*k-p)],[Math.min(cv.width,x1*k+p),Math.min(cv.height,y1*k+p)],[Math.max(0,x0*k-p),Math.min(cv.height,y1*k+p)]]}
function solve8(A,b){const n=8;for(let i=0;i<n;i++){let p=i;for(let r=i+1;r<n;r++)if(Math.abs(A[r][i])>Math.abs(A[p][i]))p=r;[A[i],A[p]]=[A[p],A[i]];[b[i],b[p]]=[b[p],b[i]];
 for(let r=i+1;r<n;r++){const f=A[r][i]/A[i][i];for(let c=i;c<n;c++)A[r][c]-=f*A[i][c];b[r]-=f*b[i]}}const x=new Array(n);for(let i=n-1;i>=0;i--){let s=b[i];for(let c=i+1;c<n;c++)s-=A[i][c]*x[c];x[i]=s/A[i][i]}return x}
function homography(from,to){const A=[],b=[];for(let i=0;i<4;i++){const[x,y]=from[i],[u,v]=to[i];A.push([x,y,1,0,0,0,-u*x,-u*y]);b.push(u);A.push([0,0,0,x,y,1,-v*x,-v*y]);b.push(v)}return solve8(A,b)}
function warp(src,q,maxSide){const dd=(p,r)=>Math.hypot(p[0]-r[0],p[1]-r[1]);let W=Math.max(dd(q[0],q[1]),dd(q[3],q[2])),H=Math.max(dd(q[0],q[3]),dd(q[1],q[2]));
 const s=Math.min(1,maxSide/Math.max(W,H));W=Math.max(1,Math.round(W*s));H=Math.max(1,Math.round(H*s));
 const sw=src.width,sh=src.height,sd=src.getContext('2d').getImageData(0,0,sw,sh).data,h=homography([[0,0],[W,0],[W,H],[0,H]],q);
 const out=document.createElement('canvas');out.width=W;out.height=H;const oc=out.getContext('2d'),od=oc.createImageData(W,H),o=od.data;
 for(let y=0;y<H;y++)for(let x=0;x<W;x++){const z=h[6]*x+h[7]*y+1,u=(h[0]*x+h[1]*y+h[2])/z,v=(h[3]*x+h[4]*y+h[5])/z;
  const xi=Math.min(sw-1,Math.max(0,u|0)),yi=Math.min(sh-1,Math.max(0,v|0)),si=(yi*sw+xi)*4,oi=(y*W+x)*4;o[oi]=sd[si];o[oi+1]=sd[si+1];o[oi+2]=sd[si+2];o[oi+3]=255}
 oc.putImageData(od,0,0);return out}
function enhance(cv,mode){if(mode==='orig')return cv;const c=cv.getContext('2d'),im=c.getImageData(0,0,cv.width,cv.height),d=im.data,n=d.length/4,hist=new Uint32Array(256);
 for(let i=0;i<d.length;i+=4)hist[(d[i]*299+d[i+1]*587+d[i+2]*114)/1000|0]++;
 const pct=p=>{let a=0;for(let k=0;k<256;k++){a+=hist[k];if(a>=n*p)return k}return 255};const lo=pct(.03),hi=Math.max(lo+10,pct(.85));
 for(let i=0;i<d.length;i+=4){if(mode==='bw'){let v=((d[i]*299+d[i+1]*587+d[i+2]*114)/1000-lo)/(hi-lo);v=v>=1?1:v<=0?0:Math.pow(v,1.6);d[i]=d[i+1]=d[i+2]=v*255}
  else for(let k=0;k<3;k++)d[i+k]=Math.max(0,Math.min(255,(d[i+k]-lo)/(hi-lo)*255))}
 c.putImageData(im,0,0);return cv}

/* ===== Auto-fill: reads the receipt on this device ===== */
async function readReceipt(){let blob=null;for(const id of X.receipts){const b=await loadFile(id);if(b&&b.type.startsWith('image/')){blob=b;break}}
 if(!blob)return toast('Auto-fill works with photos, not PDFs');toast('Reading receipt\u2026 (10\u201330 seconds)');
 try{await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');const r=await Tesseract.recognize(blob,'eng');const p=parseReceipt(r.data.text||'');
  if(!X)return;const got=[];if(p.total){X.amount=p.total;got.push('amount')}if(p.date){X.date=p.date;got.push('date')}if(p.supplier&&!X.supplier){X.supplier=p.supplier;got.push('supplier')}
  renderExpEdit();toast(got.length?`Filled in ${got.join(', ')}. Please check.`:'Could not find details. Enter them by hand.')}
 catch(e){toast('Could not read the receipt. Check internet for the first use.')}}
function parseReceipt(t){const lines=t.split('\n').map(s=>s.trim()).filter(Boolean),re=/(\d{1,3}(?:,\d{3})*\.\d{2})/g;let total=null;
 for(const l of lines)if(/total|amount due|balance|eftpos|card|paid/i.test(l)&&!/sub\s*-?total|gst|tax|change|saving/i.test(l)){const m=l.match(re);if(m)total=+m[m.length-1].replace(/,/g,'')}
 if(total==null){const all=(t.match(re)||[]).map(v=>+v.replace(/,/g,''));if(all.length)total=Math.max(...all)}
 let date=null;const dm=t.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);
 if(dm){const d=+dm[1],m=+dm[2],y=+dm[3]<100?2000+(+dm[3]):+dm[3];if(m>=1&&m<=12&&d>=1&&d<=31)date=`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
 const supplier=(lines.find(l=>/[a-z]{3,}/i.test(l))||'').replace(/[^\w &'.-]/g,'').trim().slice(0,40);return{total,date,supplier}}

/* ===== Tax engine (ATO method) ===== */
function taxProfile(y){S.taxp=S.taxp||{};return S.taxp[y]=Object.assign({wages:0,withheld:0,other:0,payg:0,superDed:0,help:false,phi:true,saved:0},S.taxp[y]||{})}
function fyFigures(y){const inv=live().filter(i=>i.status!=='draft'&&fy(i.date)===y),ex=liveExp().filter(x=>fy(x.date)===y);
 const income=inv.reduce((s,i)=>s+totals(i).sub,0),ded=ex.reduce((s,x)=>s+deductible(x),0);
 const start=D(`${y}-07-01`),end=D(`${y+1}-06-30`),now=D(today());let factor=1;
 if(now>=start&&now<end){const firstWk=inv.length?D(inv.map(i=>i.weekStart).sort()[0]):start,base=firstWk>start?firstWk:start;
  const elapsed=Math.max(14,Math.round((now-base)/864e5)+1),remaining=Math.round((end-base)/864e5)+1;factor=Math.max(1,remaining/elapsed)}
 return{inv,ex,income,ded,factor}}
function incomeTax(ti,R){let t=0,prev=0;for(const[top,r]of R.brackets){if(ti>prev)t+=(Math.min(ti,top)-prev)*r;prev=top}return t}
function litoFor(ti,R){const L=R.lito;if(ti<=L.t1)return L.max;if(ti<=L.t2)return L.max-(ti-L.t1)*L.r1;if(ti<=L.t3)return Math.max(0,L.max-(L.t2-L.t1)*L.r1-(ti-L.t2)*L.r2);return 0}
function medicareFor(ti,R){const M=R.medicare;if(ti<=M.low)return 0;if(ti<=M.high)return(ti-M.low)*.1;return ti*M.rate}
function mlsFor(ti,R){let r=0;for(const[top,rate]of R.mls){r=rate;if(ti<=top)break}return ti*r}
function helpFor(ti,R){const H=R.help;if(ti<=H.t)return 0;if(ti<=H.b2)return(ti-H.t)*H.r1;if(ti<H.b3)return(H.b2-H.t)*H.r1+(ti-H.b2)*H.r2;return ti*H.flat}
function taxRun(netBiz,R,P){const ti=Math.max(0,netBiz+(+P.wages||0)+(+P.other||0)-(+P.superDed||0)),basic=incomeTax(ti,R);
 const lito=Math.min(basic,litoFor(ti,R)),sbRaw=netBiz>0&&ti>0?Math.min(R.sbto.max,basic*Math.min(1,netBiz/ti)*R.sbto.rate):0,sbto=Math.min(basic-lito,sbRaw);
 const after=basic-lito-sbto,med=medicareFor(ti,R),mls=P.phi?0:mlsFor(ti,R),help=P.help?helpFor(ti,R):0;
 return{ti,basic,lito,sbto,after,med,mls,help,total:after+med+mls+help}}
function calcTax(y,mode){const R=ratesFor(y),P=taxProfile(y),F=fyFigures(y),k=mode==='ytd'?1:F.factor;
 const biz=F.income*k,ded=F.ded*k,net=biz-ded,a=taxRun(net,R,P),b=taxRun(0,R,P);
 const credits=(+P.withheld||0)+(+P.payg||0),bizTax=Math.max(0,a.total-b.total);
 return{R,P,F,k,biz,ded,net,a,bizTax,rate:biz>0?bizTax/biz:0,credits,due:a.total-credits}}
function setAsideFor(i){const y=fy(i.date),c=calcTax(y,'proj'),sub=totals(i).sub;if(c.biz>0)return sub*c.rate;
 const R=ratesFor(y),P=taxProfile(y),biz=sub*52;return biz>0?sub*((taxRun(biz,R,P).total-taxRun(0,R,P).total)/biz):0}
function clientShares(inv){const m={},tot=inv.reduce((s,i)=>s+totals(i).sub,0);inv.forEach(i=>{const n=client(i).name;m[n]=(m[n]||0)+totals(i).sub});
 return Object.entries(m).map(([name,amt])=>({name,amt,pct:tot?amt/tot*100:0})).sort((a,b)=>b.amt-a.amt)}
function taxRows(c){const a=c.a,P=c.P,r=[],push=(l,v,b)=>r.push([l,v,b]);
 push('Business income (invoices, excl. GST)',c.biz);push('Less: deductible business expenses',-c.ded);push('Net business income',c.net,1);
 if(+P.wages)push('Plus: wages / salary',+P.wages);if(+P.other)push('Plus: interest and other income',+P.other);if(+P.superDed)push('Less: personal super contributions claimed',-P.superDed);
 push('Taxable income',a.ti,1);push(`Income tax (${c.R.label} rates)`,a.basic);push('Less: Low Income Tax Offset',-a.lito);push('Less: Small Business Income Tax Offset',-a.sbto);push('Plus: Medicare levy',a.med);
 if(!P.phi)push('Plus: Medicare levy surcharge',a.mls);if(P.help)push('Plus: HELP / HECS repayment',a.help);
 push('Total estimated tax',a.total,1);if(+P.withheld)push('Less: tax withheld from wages',-P.withheld);if(+P.payg)push('Less: PAYG instalments paid',-P.payg);
 push(c.due>=0?'Estimated amount to pay':'Estimated refund',Math.abs(c.due),1);return r}
async function setTP(y,k,v){taxProfile(y)[k]=v;await save();render()}
const exportsCard=y=>`<h2 class="sec">Excel reports</h2><div class="card pad"><p class="mu small" style="margin-top:0">For ${fyLabel(y)}. On iPhone, choose Google Drive, email or WhatsApp in the share sheet.</p><div class="stack"><button class="btn full" onclick="exportAgent(${y})">Download for tax agent</button><button class="btn sec full" onclick="exportMine(${y})">Download my report (with charts)</button></div></div>`;

/* ===== Tax page ===== */
function renderTax(){if(curFY==null)curFY=fy(today());const y=curFY,mode=S.settings.taxMode||'proj',c=calcTax(y,mode),P=c.P,R=c.R;
 const N=(k,l,h='')=>`<div class="fld"><label>${l}</label><input class="inp" type="number" inputmode="decimal" step="0.01" value="${+P[k]||''}" placeholder="0" onchange="setTP(${y},'${k}',this.valueAsNumber||0)">${h?`<div class="mu small" style="margin-top:4px">${h}</div>`:''}</div>`;
 const TT=(k,l,h)=>`<div class="tg"><div><div style="font-weight:600">${l}</div><div class="mu small">${h}</div></div><label class="sw"><input type="checkbox" ${P[k]?'checked':''} onchange="setTP(${y},'${k}',this.checked)"><span></span></label></div>`;
 const cp=calcTax(y,'proj'),shares=clientShares(c.F.inv),top=shares[0],should=c.F.income*cp.rate,sp=should>0?Math.min(100,(+P.saved||0)/should*100):0;
 app.innerHTML=`<div class="wrap">${topBar('Tax')}
 <div class="seg" style="max-width:440px;margin-top:8px"><button class="${mode==='proj'?'on':''}" onclick="S.settings.taxMode='proj';save();render()">Full-year estimate</button><button class="${mode==='ytd'?'on':''}" onclick="S.settings.taxMode='ytd';save();render()">Income so far</button></div>
 <div class="stats"><div class="stat"><div class="mu small">Estimated tax ${mode==='proj'?'for the year':'so far'}</div><b>$${money(c.a.total)}</b></div>
 <div class="stat"><div class="mu small">Put aside from each invoice</div><b>${(cp.rate*100).toFixed(1)}%</b></div>
 <div class="stat"><div class="mu small">${c.due>=0?'Still to pay at tax time':'Estimated refund'}</div><b style="color:${c.due>0?'var(--rd)':'var(--gr)'}">$${money(Math.abs(c.due))}</b></div>
 <div class="stat"><div class="mu small">Taxable income</div><b>$${money(c.a.ti)}</b></div></div>
 ${mode==='proj'&&c.k>1.01?'<p class="mu small" style="margin:10px 4px 0">The full-year estimate assumes you keep earning and spending at the same pace as so far this year.</p>':''}
 <div class="sgrid"><div>
 <h2 class="sec">How it's worked out</h2><div class="card"><table class="steps">${taxRows(c).map(([l,v,b])=>`<tr class="${b?'tot':''}"><td>${esc(l)}</td><td>${v<0?'\u2212':''}$${money(Math.abs(v))}</td></tr>`).join('')}</table></div>
 <h2 class="sec">Tax savings</h2><div class="card pad"><div style="display:flex;justify-content:space-between;gap:10px"><span class="mu">Should be put aside by now</span><b>$${money(should)}</b></div><div class="prog"><i style="width:${sp}%"></i></div>
 <div style="margin-top:14px">${N('saved','Amount you have put aside so far ($)')}</div></div>
 ${exportsCard(y)}</div><div>
 <h2 class="sec">Your other details for ${fyLabel(y)}</h2><div class="card"><div class="fgrid two">${N('wages','Wages from a job ($)')}${N('withheld','Tax withheld from wages ($)')}${N('other','Interest and other income ($)')}${N('payg','PAYG instalments paid ($)','Only if the ATO has asked you to pay instalments')}<div style="grid-column:1/-1">${N('superDed','Personal super contributions to claim ($)','Only after giving your fund a notice of intent')}</div></div>
 ${TT('help','HELP / HECS debt','Adds the compulsory repayment')}${TT('phi','Private hospital cover','Without it, the Medicare levy surcharge may apply on higher incomes')}</div>
 <h2 class="sec">Personal services income check</h2><div class="card pad ${top&&top.pct>=80?'warn':''}">${top?`<b>${esc(top.name)}: ${top.pct.toFixed(0)}% of your income</b>
 <p class="small" style="margin:6px 0 10px">${top.pct>=80?'80% or more of your income comes from one client, so the PSI rules may apply. They can limit some deductions (such as rent, or paying a partner to help). Ask your tax agent whether you pass the results test.':'No single client gives you 80% or more of your income, so the PSI 80% rule is less likely to apply.'}</p>
 ${shares.map(s=>`<div class="kv"><span>${esc(s.name)}</span><span>${s.pct.toFixed(0)}% \u00b7 $${money(s.amt)}</span></div>`).join('')}`:'<span class="mu">No sent or paid invoices yet this year.</span>'}</div>
 </div></div>
 <p class="mu small" style="margin:20px 4px">Estimate only, using the ATO's ${R.label} method and rates (Australian resident). ${R.notes?esc(R.notes)+' ':''}This isn't tax advice, so check your return with a registered tax agent.</p></div>`}

/* ===== Dashboard & charts ===== */
function monthly(y){const m=MONTHS.map(()=>({inc:0,exp:0})),idx=s=>(D(s).getMonth()+6)%12;
 live().filter(i=>i.status!=='draft'&&fy(i.date)===y).forEach(i=>m[idx(i.date)].inc+=totals(i).sub);liveExp().filter(x=>fy(x.date)===y).forEach(x=>m[idx(x.date)].exp+=deductible(x));return m}
function byCat(y){const m={};liveExp().filter(x=>fy(x.date)===y).forEach(x=>m[x.category]=(m[x.category]||0)+deductible(x));return Object.entries(m).filter(e=>e[1]>0).sort((a,b)=>b[1]-a[1])}
function renderDash(){if(curFY==null)curFY=fy(today());const y=curFY,F=fyFigures(y),cp=calcTax(y,'proj'),P=cp.P,pv=fyFigures(y-1),should=F.income*cp.rate,sp=should>0?Math.min(100,(+P.saved||0)/should*100):0;
 app.innerHTML=`<div class="wrap">${topBar('Dashboard')}
 <div class="stats"><div class="stat"><div class="mu small">Income (excl. GST)</div><b>$${money(F.income)}</b>${pv.income?`<div class="mu small">Last year: $${money(pv.income)}</div>`:''}</div>
 <div class="stat"><div class="mu small">Deductible expenses</div><b>$${money(F.ded)}</b>${pv.ded?`<div class="mu small">Last year: $${money(pv.ded)}</div>`:''}</div>
 <div class="stat"><div class="mu small">Profit so far</div><b>$${money(F.income-F.ded)}</b></div>
 <div class="stat"><div class="mu small">Estimated tax for the year</div><b>$${money(cp.a.total)}</b></div></div>
 <h2 class="sec">Income vs expenses by month</h2><div class="card pad"><canvas id="c1" class="chart"></canvas><div class="mu small" style="display:flex;gap:18px;margin-top:8px"><span><i class="key" style="background:var(--ac)"></i>Income</span><span><i class="key" style="background:#f59e0b"></i>Deductible expenses</span></div></div>
 <div class="sgrid"><div><h2 class="sec">Where your expenses go</h2><div class="card pad"><canvas id="c2" class="chart" style="height:230px"></canvas></div></div>
 <div><h2 class="sec">Tax savings</h2><div class="card pad"><div style="display:flex;justify-content:space-between;gap:10px"><span class="mu">Put aside</span><b>$${money(+P.saved||0)} of $${money(should)}</b></div><div class="prog"><i style="width:${sp}%"></i></div>
 <p class="mu small">Based on putting aside ${(cp.rate*100).toFixed(1)}% of each invoice. Update the amount on the Tax page.</p><button class="btn sm sec" onclick="go('tax')">Open Tax</button></div>${exportsCard(y)}</div></div></div>`;
 requestAnimationFrame(()=>{const m=monthly(y),c1=$('#c1'),c2=$('#c2');if(c1)chartBars(c1,c1.clientWidth,c1.clientHeight,MONTHS,[m.map(v=>v.inc),m.map(v=>v.exp)],[accHex(),'#f59e0b']);if(c2)chartDonut(c2,c2.clientWidth,c2.clientHeight,byCat(y))})}
const niceMax=m=>{const p=Math.pow(10,Math.floor(Math.log10(m)));for(const f of[1,2,2.5,5,10])if(f*p>=m)return f*p;return 10*p};
const shortM=v=>v>=1000?'$'+(v/1000).toFixed(v%1000?1:0)+'k':'$'+Math.round(v);
function rr(c,x,y,w,h,r){if(h<=0||w<=0)return;r=Math.min(r,h/2,w/2);c.beginPath();c.moveTo(x,y+h);c.lineTo(x,y+r);c.quadraticCurveTo(x,y,x+r,y);c.lineTo(x+w-r,y);c.quadraticCurveTo(x+w,y,x+w,y+r);c.lineTo(x+w,y+h);c.closePath();c.fill()}
function prepCanvas(cv,W,H,bg){const dpr=window.devicePixelRatio||1;cv.width=Math.round(W*dpr);cv.height=Math.round(H*dpr);const c=cv.getContext('2d');c.setTransform(dpr,0,0,dpr,0,0);c.clearRect(0,0,W,H);if(bg){c.fillStyle=bg;c.fillRect(0,0,W,H)}c.font='11px -apple-system,"Segoe UI",Roboto,sans-serif';return c}
function chartBars(cv,W,H,labels,series,colors,bg){const c=prepCanvas(cv,W,H,bg),max=Math.max(1,...series.flat()),top=niceMax(max),pl=50,pr=6,pt=10,pb=22,cw=W-pl-pr,ch=H-pt-pb;
 c.strokeStyle='#eceef1';c.lineWidth=1;c.fillStyle='#6b7280';c.textAlign='right';
 for(let k=0;k<=4;k++){const y=pt+ch-ch*k/4;c.beginPath();c.moveTo(pl,y+.5);c.lineTo(W-pr,y+.5);c.stroke();c.fillText(shortM(top*k/4),pl-6,y+4)}
 const gw=cw/labels.length,bw=Math.max(3,Math.min(16,(gw-6)/series.length));
 labels.forEach((l,i)=>{const x0=pl+gw*i+gw/2-bw*series.length/2;series.forEach((s,j)=>{c.fillStyle=colors[j];rr(c,x0+j*bw,pt+ch-ch*s[i]/top,bw-2,ch*s[i]/top,3)});c.fillStyle='#6b7280';c.textAlign='center';c.fillText(l,pl+gw*i+gw/2,H-6)});return cv}
function chartDonut(cv,W,H,items,bg){const c=prepCanvas(cv,W,H,bg),tot=items.reduce((s,i)=>s+i[1],0);
 if(!tot){c.fillStyle='#6b7280';c.textAlign='center';c.font='13px -apple-system,"Segoe UI",sans-serif';c.fillText('No expenses yet',W/2,H/2);return cv}
 const r=Math.min(H/2-8,W*.2),cx=r+10,cy=H/2;let a=-Math.PI/2;c.lineWidth=r*.42;
 items.forEach(([l,v],k)=>{const b=a+v/tot*Math.PI*2;c.strokeStyle=PAL[k%PAL.length];c.beginPath();c.arc(cx,cy,r*.79,a,b);c.stroke();a=b});
 c.fillStyle='#16181d';c.textAlign='center';c.font='600 13px -apple-system,"Segoe UI",sans-serif';c.fillText(shortM(tot),cx,cy+4);
 c.font='12px -apple-system,"Segoe UI",sans-serif';c.textAlign='left';const lx=cx+r+22,lh=Math.min(22,(H-10)/items.length);
 items.forEach(([l,v],k)=>{const yy=cy-items.length*lh/2+k*lh+lh/2;c.fillStyle=PAL[k%PAL.length];rr(c,lx,yy-5,10,10,2);c.fillStyle='#16181d';const t=`${l}  ${Math.round(v/tot*100)}%`;c.fillText(t.length>34?t.slice(0,33)+'\u2026':t,lx+16,yy+4)});return cv}

/* ===== Excel exports ===== */
const MF='#,##0.00',DF='dd/mm/yyyy';
async function xl(){if(!window.ExcelJS)await loadScript('https://cdn.jsdelivr.net/npm/exceljs@4.4.0/dist/exceljs.min.js');return window.ExcelJS}
function xHead(ws,cols){ws.columns=cols;const r=ws.getRow(1);r.font={bold:true,color:{argb:'FFFFFFFF'}};r.height=22;r.alignment={vertical:'middle'};
 r.eachCell(c=>{c.fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF'+accHex().slice(1).toUpperCase()}}});ws.views=[{state:'frozen',ySplit:1}]}
function kvRow(ws,a,b,bold){const r=ws.addRow([a,b]);if(typeof b==='number')r.getCell(2).numFmt=MF;if(bold)r.font={bold:true};return r}
const slug=y=>`FY${y}-${String(y+1).slice(2)}`;
async function xSave(wb,name){const buf=await wb.xlsx.writeBuffer();await deliver(new File([buf],name,{type:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'}),'Excel file downloaded')}
async function exportAgent(y){toast('Preparing Excel file\u2026');let XL;try{XL=await xl()}catch(e){return toast('Could not load the Excel tool. Check internet.')}
 const wb=new XL.Workbook(),st=S.settings,F=fyFigures(y),P=taxProfile(y);wb.creator=st.name||'Invoices app';
 const ws=wb.addWorksheet('Summary');ws.columns=[{width:52},{width:18}];
 ws.addRow([`${st.name} - ${fyLabel(y)}`]).font={bold:true,size:14};kvRow(ws,'ABN',st.abn);kvRow(ws,'Prepared',fmtD(today()));ws.addRow([]);
 kvRow(ws,'Gross business income (excl. GST)',round2(F.income),1);ws.addRow([]);ws.addRow(['Deductions by category']).font={bold:true};
 byCat(y).forEach(([c,v])=>kvRow(ws,'   '+c,round2(v)));kvRow(ws,'Total deductions',round2(F.ded),1);ws.addRow([]);
 kvRow(ws,'Net business income',round2(F.income-F.ded),1);ws.addRow([]);
 ws.addRow(["Prepared from the business owner's own records. Not reviewed by a tax agent."]).font={italic:true,color:{argb:'FF6B7280'}};
 const wi=wb.addWorksheet('Income');xHead(wi,[{header:'Invoice no.',key:'n',width:18},{header:'Date',key:'d',width:12,style:{numFmt:DF}},{header:'Client',key:'c',width:26},{header:'Client ABN',key:'abn',width:16},{header:'Pay period',key:'p',width:24},{header:'Hours',key:'h',width:8},{header:'Amount excl. GST',key:'a',width:17,style:{numFmt:MF}},{header:'GST',key:'g',width:10,style:{numFmt:MF}},{header:'Total',key:'t',width:12,style:{numFmt:MF}},{header:'Status',key:'s',width:10},{header:'Paid date',key:'pd',width:12,style:{numFmt:DF}}]);
 const inv=F.inv.slice().sort((a,b)=>a.date.localeCompare(b.date));
 inv.forEach(i=>{const t=totals(i),c=client(i);wi.addRow({n:i.number,d:D(i.date),c:c.name,abn:c.abn||'',p:period(i),h:t.hours,a:t.sub,g:t.gst,t:t.total,s:stat(i)[0],pd:i.paidDate?D(i.paidDate):null})});
 const si=k=>inv.reduce((s,i)=>s+totals(i)[k],0);wi.addRow({n:'TOTAL',h:round2(si('hours')),a:si('sub'),g:si('gst'),t:si('total')}).font={bold:true};
 wi.addRow([]);wi.addRow(['Totals by client']).font={bold:true};clientShares(inv).forEach(s=>{const r=wi.addRow([s.name,'','','','','',s.amt]);r.getCell(7).numFmt=MF});
 wi.addRow([]);wi.addRow(['Totals by month']).font={bold:true};monthly(y).forEach((m,k)=>{if(m.inc){const r=wi.addRow([MONTHS[k],'','','','','',m.inc]);r.getCell(7).numFmt=MF}});
 const we=wb.addWorksheet('Expenses');xHead(we,[{header:'Date',key:'d',width:12,style:{numFmt:DF}},{header:'Supplier',key:'s',width:24},{header:'Category',key:'c',width:24},{header:'Amount paid',key:'a',width:13,style:{numFmt:MF}},{header:'Business use %',key:'p',width:14},{header:'Deductible',key:'x',width:13,style:{numFmt:MF}},{header:'Receipt saved',key:'r',width:13},{header:'Notes',key:'n',width:38}]);
 F.ex.slice().sort((a,b)=>a.date.localeCompare(b.date)).forEach(x=>we.addRow({d:D(x.date),s:x.supplier||'',c:x.category,a:+x.amount||0,p:+x.pct,x:deductible(x),r:x.receipts&&x.receipts.length?'Yes':'No',n:x.notes||''}));
 we.addRow({s:'TOTAL',a:F.ex.reduce((s,x)=>s+(+x.amount||0),0),x:F.ded}).font={bold:true};
 const wo=wb.addWorksheet('Other income');wo.columns=[{width:42},{width:16}];
 [['Wages / salary',P.wages],['Tax withheld from wages',P.withheld],['Interest and other income',P.other],['PAYG instalments paid',P.payg],['Personal super contributions to claim',P.superDed]].forEach(([a,b])=>kvRow(wo,a,+b||0));
 kvRow(wo,'HELP / HECS debt',P.help?'Yes':'No');kvRow(wo,'Private hospital cover',P.phi?'Yes':'No');
 await xSave(wb,`Tax-agent-${slug(y)}.xlsx`)}
async function exportMine(y){toast('Preparing your report\u2026');let XL;try{XL=await xl()}catch(e){return toast('Could not load the Excel tool. Check internet.')}
 const wb=new XL.Workbook(),c=calcTax(y,'proj'),F=c.F,P=c.P,pv=fyFigures(y-1),should=F.income*c.rate;
 const wd=wb.addWorksheet('Dashboard');wd.columns=[{width:44},{width:18}];
 wd.addRow([`My business report - ${fyLabel(y)}`]).font={bold:true,size:14};wd.addRow([`Prepared ${fmtD(today())}`]);wd.addRow([]);
 kvRow(wd,'Income so far (excl. GST)',round2(F.income),1);kvRow(wd,'Deductible expenses so far',round2(F.ded));kvRow(wd,'Profit so far',round2(F.income-F.ded),1);wd.addRow([]);
 kvRow(wd,'Estimated tax for the full year',round2(c.a.total),1);kvRow(wd,'Put aside from each invoice (%)',round2(c.rate*100));kvRow(wd,'Should be put aside by now',round2(should));kvRow(wd,'Actually put aside',round2(+P.saved||0));kvRow(wd,'Still to put aside',round2(Math.max(0,should-(+P.saved||0))),1);
 if(pv.income||pv.ded){wd.addRow([]);kvRow(wd,`Last year (${fyLabel(y-1)}) income`,round2(pv.income));kvRow(wd,'Last year deductible expenses',round2(pv.ded))}
 const wc=wb.addWorksheet('Charts');wc.addRow(['Income vs deductible expenses by month']).font={bold:true,size:13};
 const m=monthly(y),c1=chartBars(document.createElement('canvas'),900,340,MONTHS,[m.map(v=>v.inc),m.map(v=>v.exp)],[accHex(),'#f59e0b'],'#ffffff');
 wc.addImage(wb.addImage({base64:c1.toDataURL('image/png'),extension:'png'}),{tl:{col:0,row:1},ext:{width:900,height:340}});
 wc.getCell('A21').value='Expenses by category';wc.getCell('A21').font={bold:true,size:13};
 const c2=chartDonut(document.createElement('canvas'),700,300,byCat(y),'#ffffff');
 wc.addImage(wb.addImage({base64:c2.toDataURL('image/png'),extension:'png'}),{tl:{col:0,row:21},ext:{width:700,height:300}});
 const wt=wb.addWorksheet('Tax breakdown');wt.columns=[{width:58},{width:16}];
 wt.addRow([`Estimated tax - ${fyLabel(y)} (full-year estimate, ${c.R.label} ATO rates)`]).font={bold:true,size:13};wt.addRow([]);
 taxRows(c).forEach(([l,v,b])=>kvRow(wt,l,round2(v),b));wt.addRow([]);wt.addRow(['Estimate only. Not tax advice. Check with a registered tax agent.']).font={italic:true};
 const wx=wb.addWorksheet('Data');xHead(wx,[{header:'Type',key:'t',width:10},{header:'Date',key:'d',width:12,style:{numFmt:DF}},{header:'Description',key:'s',width:30},{header:'Client / category',key:'c',width:26},{header:'Amount',key:'a',width:13,style:{numFmt:MF}},{header:'Income / deductible',key:'x',width:18,style:{numFmt:MF}}]);
 F.inv.forEach(i=>wx.addRow({t:'Income',d:D(i.date),s:i.number,c:client(i).name,a:totals(i).total,x:totals(i).sub}));
 F.ex.forEach(x=>wx.addRow({t:'Expense',d:D(x.date),s:x.supplier||'',c:x.category,a:+x.amount||0,x:deductible(x)}));
 await xSave(wb,`My-report-${slug(y)}.xlsx`)}
