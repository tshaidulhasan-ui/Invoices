'use strict';
/* ===== Basics ===== */
const $=s=>document.querySelector(s);
const app=$('#app'),nav=$('#nav');
const K={meta:'inv.meta',data:'inv.data',fails:'inv.fails'};
const DATA_V=3;
let KEY=null,S=null,E=null,VI=null,EM=null,X=null,XFROM=null,SC=null,READY=null,view='list',curFY=null,editFrom=null,unlockReason=null,_res=null;
const te=new TextEncoder(),td=new TextDecoder();
const DAYS=['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const ACC={navy:'#1f3a5f',charcoal:'#2b2f36',teal:'#0f5f63',burgundy:'#7a2336',forest:'#25523a',royal:'#2848a8'};
const VARS=['client','number','amount','period','duedate','hours','myname','myphone'];
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
const clone=o=>JSON.parse(JSON.stringify(o));
const money=n=>(+n||0).toLocaleString('en-AU',{minimumFractionDigits:2,maximumFractionDigits:2});
const initials=n=>(String(n||'').replace(/^(mr|mrs|ms|miss|dr)\.?\s+/i,'').split(/\s+/).filter(Boolean).slice(0,2).map(w=>w[0]).join('').toUpperCase())||'IN';
const SV='viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"';
const I={inv:`<svg ${SV}><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v4h4M10 12h6M10 16h6"/></svg>`,
exp:`<svg ${SV}><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>`,
dash:`<svg ${SV}><path d="M5 20V11M11 20V5M17 20v-6M3 20h18"/></svg>`,
tax:`<svg ${SV}><circle cx="12" cy="12" r="9"/><path d="M15 9.5c-.5-1-1.6-1.5-3-1.5-1.7 0-3 .8-3 2s1.3 1.7 3 2 3 .8 3 2-1.3 2-3 2c-1.4 0-2.5-.5-3-1.5M12 6v2M12 16v2"/></svg>`,
set:`<svg ${SV}><path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h12"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="18" cy="18" r="2"/></svg>`,
lock:`<svg ${SV} width="24" height="24"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>`};

/* ===== Theme ===== */
const hexRgb=h=>[1,3,5].map(k=>parseInt(h.slice(k,k+2),16));
const accHex=()=>ACC[S&&S.settings.accent]||ACC.navy;
const soft=rgb=>rgb.map(v=>Math.round(v+(255-v)*.9));
function applyTheme(){const a=accHex(),r=document.documentElement.style;r.setProperty('--ac',a);r.setProperty('--acs',`rgb(${soft(hexRgb(a))})`)}

/* ===== Modal & toast ===== */
function modal(html){const m=$('#modal');m.innerHTML=`<div class="ov" onclick="if(event.target===this)_done(null)"><div class="sheet">${html}</div></div>`;m.hidden=false}
function closeModal(){const m=$('#modal');m.hidden=true;m.innerHTML=''}
function _done(v){closeModal();const r=_res;_res=null;if(r)r(v)}
function ask(title,msg,ok='OK',danger=false,cancel='Cancel'){return new Promise(r=>{_res=r;modal(`<h3>${esc(title)}</h3><p class="mu">${msg}</p><div class="mbtns">${cancel?`<button class="btn sec" onclick="_done(false)">${cancel}</button>`:''}<button class="btn ${danger?'dan':''}" onclick="_done(true)">${ok}</button></div>`)})}
const note=(t,m)=>ask(t,m,'OK',false,null);
function askText(title,label,val=''){return new Promise(r=>{_res=r;modal(`<h3>${esc(title)}</h3><label class="lbl">${esc(label)}</label><input id="mt" class="inp" value="${esc(val)}"><div class="mbtns"><button class="btn sec" onclick="_done(null)">Cancel</button><button class="btn" onclick="_done($('#mt').value)">OK</button></div>`);setTimeout(()=>$('#mt')&&$('#mt').focus(),60)})}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(e._t);e._t=setTimeout(()=>e.classList.remove('on'),2400)}

/* ===== Dates ===== */
const D=s=>{const[y,m,d]=s.split('-').map(Number);return new Date(y,m-1,d,12)};
const iso=d=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
const addDays=(s,n)=>{const d=D(s);d.setDate(d.getDate()+n);return iso(d)};
const monday=s=>{const d=D(s);d.setDate(d.getDate()-(d.getDay()+6)%7);return iso(d)};
const today=()=>iso(new Date());
const fy=s=>{const d=D(s);return d.getMonth()>=6?d.getFullYear():d.getFullYear()-1};
const fyLabel=y=>`FY ${y}\u2013${String(y+1).slice(2)}`;
const fmtD=s=>D(s).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'});
const dayShort=s=>{const d=D(s);return `${d.toLocaleDateString('en-AU',{weekday:'short'})} ${d.getDate()} ${d.toLocaleDateString('en-AU',{month:'short'})}`};
const t12=s=>{let[h,m]=s.split(':').map(Number);const ap=h>=12?'pm':'am';h=h%12||12;return `${h}:${String(m).padStart(2,'0')} ${ap}`};
const period=i=>`${D(i.weekStart).toLocaleDateString('en-AU',{day:'numeric',month:'short'})} - ${fmtD(addDays(i.weekStart,6))}`;
const shortRange=i=>`${D(i.weekStart).toLocaleDateString('en-AU',{day:'numeric',month:'short'})} \u2013 ${D(addDays(i.weekStart,6)).toLocaleDateString('en-AU',{day:'numeric',month:'short'})}`;
function rangeText(w){if(!w.length)return '';const a=D(w[0].date),b=D(w[w.length-1].date);const f=d=>`${d.toLocaleDateString('en-AU',{weekday:'long'})} ${d.getDate()}`;const my=b.toLocaleDateString('en-AU',{month:'long',year:'numeric'});return w.length===1?`${f(a)} ${my}`:`${f(a)} to ${f(b)} ${my}`}
function breakText(w){const b=[...new Set(w.map(d=>+d.breakMin))];return b.length===1&&b[0]>0?`Each day includes a ${b[0]}-minute unpaid lunch break.`:''}

/* ===== NSW public holidays (check nsw.gov.au yearly) ===== */
function easter(y){const a=y%19,b=Math.floor(y/100),c=y%100,d=Math.floor(b/4),e=b%4,f=Math.floor((b+8)/25),g=Math.floor((b-f+1)/3),h=(19*a+b-d-g+15)%30,i=Math.floor(c/4),k=c%4,l=(32+2*e+2*i-h-k)%7,m=Math.floor((a+11*h+22*l)/451),mo=Math.floor((h+l-7*m+114)/31),da=((h+l-7*m+114)%31)+1;return iso(new Date(y,mo-1,da,12))}
function nthMon(y,mo,n){const d=new Date(y,mo,1,12);while(d.getDay()!==1)d.setDate(d.getDate()+1);d.setDate(d.getDate()+7*(n-1));return iso(d)}
const holCache={};
function holidays(y){if(holCache[y])return holCache[y];const h={},add=(s,n)=>h[s]=n;
 const sub=(s,n)=>{const w=D(s).getDay();add(s,n);if(w===6)add(addDays(s,2),n+' (additional day)');if(w===0)add(addDays(s,1),n+' (additional day)')};
 sub(`${y}-01-01`,"New Year's Day");sub(`${y}-01-26`,'Australia Day');
 const e=easter(y);add(addDays(e,-2),'Good Friday');add(addDays(e,-1),'Easter Saturday');add(e,'Easter Sunday');add(addDays(e,1),'Easter Monday');
 add(`${y}-04-25`,'Anzac Day');add(nthMon(y,5,2),"King's Birthday");add(nthMon(y,9,1),'Labour Day');
 const cw=D(`${y}-12-25`).getDay();add(`${y}-12-25`,'Christmas Day');add(`${y}-12-26`,'Boxing Day');
 if(cw===5)add(`${y}-12-28`,'Boxing Day (additional day)');
 if(cw===6){add(`${y}-12-27`,'Christmas (additional day)');add(`${y}-12-28`,'Boxing Day (additional day)')}
 if(cw===0)add(`${y}-12-27`,'Christmas (additional day)');
 return holCache[y]=h}
const holName=s=>holidays(D(s).getFullYear())[s];

/* ===== Encryption ===== */
function b64(buf){const a=buf instanceof Uint8Array?buf:new Uint8Array(buf);let s='';for(let i=0;i<a.length;i+=0x8000)s+=String.fromCharCode.apply(null,a.subarray(i,i+0x8000));return btoa(s)}
const unb64=s=>Uint8Array.from(atob(s),c=>c.charCodeAt(0));
async function deriveKey(secret,salt){const base=await crypto.subtle.importKey('raw',te.encode(secret),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt'])}
async function aesEnc(key,bytes){const iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},key,bytes);return{iv:b64(iv),ct:b64(ct)}}
async function aesDec(key,o){return new Uint8Array(await crypto.subtle.decrypt({name:'AES-GCM',iv:unb64(o.iv)},key,unb64(o.ct)))}
const importData=raw=>crypto.subtle.importKey('raw',raw,'AES-GCM',false,['encrypt','decrypt']);
const getMeta=()=>JSON.parse(localStorage.getItem(K.meta));
function makeRecovery(){const A='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';const r=crypto.getRandomValues(new Uint8Array(20));let s='';r.forEach((x,i)=>{s+=A[x%32];if(i%5===4&&i<19)s+='-'});return s}
const normRec=s=>s.toUpperCase().replace(/[^A-Z0-9]/g,'');
async function wrapPin(meta,raw,pin){const s=crypto.getRandomValues(new Uint8Array(16));meta.saltPin=b64(s);meta.wPin=await aesEnc(await deriveKey(pin,s),raw)}
async function save(){localStorage.setItem(K.data,JSON.stringify(await aesEnc(KEY,te.encode(JSON.stringify(S)))))}

/* ===== Data model & safe upgrades ===== */
function blankSettings(){return{name:'',abn:'',address:'',phone:'',email:'',bank:'',accName:'',bsb:'',accNo:'',service:'Subcontract Electrical Service',rate:53,start:'07:00',finish:'15:30',breakMin:30,terms:7,gst:false,lastBackup:'',accent:'navy',showTerms:false,showBreak:true,showGstNote:true,showFooter:false,footer:'Thank you for your business.',taxMode:'proj'}}
function defaultTemplates(){return[{name:'Weekly invoice',subject:'Invoice {number} - {period}',body:'Hi {client},\n\nPlease find attached invoice {number} for {period}, totalling ${amount}.\n\nKind regards,\n{myname}\n{myphone}'}]}
function blankState(){return{v:DATA_V,settings:blankSettings(),clients:[],invoices:[],expenses:[],taxp:{},log:[],templates:defaultTemplates()}}
/* Upgrades only ADD missing parts, never remove anything you saved. */
function migrate(st){const s=Object.assign(blankState(),st);s.settings=Object.assign(blankSettings(),st.settings||{});
 if(!Array.isArray(s.templates)||!s.templates.length)s.templates=defaultTemplates();
 if(!Array.isArray(s.expenses))s.expenses=[];if(!s.taxp||typeof s.taxp!=='object')s.taxp={};
 s.v=DATA_V;return s}
async function openWith(raw){KEY=await importData(raw);const d=localStorage.getItem(K.data);const st=d?JSON.parse(td.decode(await aesDec(KEY,JSON.parse(d)))):{};
 const old=st.v||1;if(d&&old<DATA_V&&!localStorage.getItem('inv.data.v'+old))localStorage.setItem('inv.data.v'+old,d); // safety copy before upgrade
 S=migrate(st);applyTheme()}
function addLog(text){S.log.unshift({ts:Date.now(),text});S.log=S.log.slice(0,1000)}

/* ===== Encrypted file storage (receipts) ===== */
let _db=null;
function idb(){if(_db)return Promise.resolve(_db);return new Promise((res,rej)=>{const r=indexedDB.open('invoices-files',1);r.onupgradeneeded=()=>r.result.createObjectStore('files');r.onsuccess=()=>{_db=r.result;res(_db)};r.onerror=()=>rej(r.error)})}
function ftx(mode,fn){return idb().then(db=>new Promise((res,rej)=>{const t=db.transaction('files',mode),req=fn(t.objectStore('files'));let out;if(req)req.onsuccess=()=>{out=req.result};t.oncomplete=()=>res(out);t.onerror=()=>rej(t.error)}))}
const fput=(id,v)=>ftx('readwrite',s=>s.put(v,id));
const fget=id=>ftx('readonly',s=>s.get(id));
const fdel=id=>ftx('readwrite',s=>s.delete(id));
const fclear=()=>ftx('readwrite',s=>s.clear());
function fall(){return idb().then(db=>new Promise((res,rej)=>{const out={},r=db.transaction('files').objectStore('files').openCursor();r.onsuccess=()=>{const c=r.result;if(c){out[c.key]=c.value;c.continue()}else res(out)};r.onerror=()=>rej(r.error)}))}
async function saveFile(blob){const id='f_'+uid(),iv=crypto.getRandomValues(new Uint8Array(12));const ct=await crypto.subtle.encrypt({name:'AES-GCM',iv},KEY,await blob.arrayBuffer());await fput(id,{type:blob.type||'application/octet-stream',iv,ct});return id}
async function loadFile(id){const v=await fget(id);if(!v)return null;const pt=await crypto.subtle.decrypt({name:'AES-GCM',iv:v.iv},KEY,v.ct);return new Blob([pt],{type:v.type})}

/* ===== Wrong-PIN delay ===== */
const failState=()=>JSON.parse(localStorage.getItem(K.fails)||'{"n":0,"until":0}');
const waitSecs=()=>Math.max(0,Math.ceil((failState().until-Date.now())/1000));
function fail(){const f=failState();f.n++;if(f.n>=3)f.until=Date.now()+Math.min(300,5*2**(f.n-3))*1000;localStorage.setItem(K.fails,JSON.stringify(f))}
const okFails=()=>localStorage.removeItem(K.fails);

/* ===== Lock screens ===== */
const isApp=()=>window.navigator.standalone||matchMedia('(display-mode: standalone)').matches;
const isPhone=()=>/iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
function installBanner(){return isApp()||!isPhone()?'':`<div class="banner info">For the full app: tap <b>Share</b> \u2192 <b>Add to Home Screen</b>, then always open it from that icon. Safari and the home-screen app keep separate records.</div>`}
function lockShell(inner){document.body.classList.add('locked');nav.hidden=true;closeModal();app.innerHTML=`<div class="lockwrap"><div class="lockcard"><div class="logo" style="margin-bottom:18px">${I.lock}</div>${inner}</div></div>`}
function renderLock(mode){applyTheme();const has=!!localStorage.getItem(K.meta);mode=mode||(has?'unlock':'welcome');
 if(mode==='welcome')lockShell(`<h1>Welcome</h1>${installBanner()}<p class="mu">Your records stay on this device, encrypted with your PIN. Choose a PIN of at least 6 digits.</p>
  <input id="p1" class="inp pinin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="New PIN">
  <input id="p2" class="inp pinin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="Confirm PIN">
  <div class="err" id="er"></div><button class="btn full" onclick="doSetup()">Create PIN</button>
  <button class="link" style="margin-top:12px" onclick="restorePick()">Restore from a backup file</button>`);
 else if(mode==='unlock'){lockShell(`<h1>Invoices</h1><p class="mu">Enter your PIN to unlock your records.</p>
  <input id="pin" class="inp pinin" type="password" inputmode="numeric" autocomplete="current-password" placeholder="PIN" onkeydown="if(event.key==='Enter')doUnlock()">
  <div class="err" id="er">${waitSecs()?`Too many attempts. Wait ${waitSecs()}s.`:''}</div><button class="btn full" onclick="doUnlock()">Unlock</button>
  <button class="link" style="margin-top:12px" onclick="renderLock('recover')">Forgot PIN? Use recovery code</button>`);setTimeout(()=>$('#pin')&&$('#pin').focus(),300)}
 else lockShell(`<h1>Reset PIN</h1><p class="mu">Enter your recovery code, then choose a new PIN.</p>
  <input id="rc" class="inp pinin rec" autocapitalize="characters" autocomplete="off" placeholder="XXXXX-XXXXX-XXXXX-XXXXX">
  <input id="p1" class="inp pinin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="New PIN">
  <input id="p2" class="inp pinin" type="password" inputmode="numeric" autocomplete="new-password" placeholder="Confirm new PIN">
  <div class="err" id="er"></div><button class="btn full" onclick="doRecover()">Reset PIN</button>
  <button class="link" style="margin-top:12px" onclick="renderLock('unlock')">Back</button>`)}
async function doSetup(){const a=$('#p1').value,b=$('#p2').value,er=$('#er');
 if(!/^\d{6,}$/.test(a))return er.textContent='PIN must be at least 6 digits.';
 if(a!==b)return er.textContent='PINs do not match.';
 er.textContent='Setting up encryption\u2026';
 const raw=crypto.getRandomValues(new Uint8Array(32)),rec=makeRecovery(),meta={v:1};
 await wrapPin(meta,raw,a);const s2=crypto.getRandomValues(new Uint8Array(16));meta.saltRec=b64(s2);meta.wRec=await aesEnc(await deriveKey(normRec(rec),s2),raw);
 localStorage.setItem(K.meta,JSON.stringify(meta));
 KEY=await importData(raw);S=blankState();addLog('PIN created, records encrypted');await save();
 if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();
 showRecovery(rec)}
function showRecovery(rec){const body=encodeURIComponent(`Invoices app recovery code:\n\n${rec}\n\nKeep this safe. It unlocks your records if you forget your PIN.`);
 lockShell(`<h1>Recovery code</h1><p class="mu">If you forget your PIN, this code is the only way back into your records. Nobody else can recover them.</p><div class="code">${rec}</div>
 <a class="btn sec full" style="margin-bottom:10px" href="mailto:?subject=${encodeURIComponent('Invoices app recovery code')}&body=${body}">Email it to myself</a>
 <div class="tg" style="padding:12px 0;border:0"><span>I've saved my recovery code</span><label class="sw"><input type="checkbox" id="ok"><span></span></label></div>
 <button class="btn full" onclick="if($('#ok').checked){go('settings')}else toast('Save your recovery code first')">Continue</button>`)}
async function doUnlock(){const er=$('#er'),w=waitSecs();if(w)return er.textContent=`Too many attempts. Wait ${w}s.`;
 const pin=$('#pin').value;er.textContent='Unlocking\u2026';
 try{const m=getMeta();const raw=await aesDec(await deriveKey(pin,unb64(m.saltPin)),m.wPin);await openWith(raw);okFails();addLog('Unlocked');await save();if(navigator.storage&&navigator.storage.persist)navigator.storage.persist();go('list')}
 catch(e){fail();const w2=waitSecs();er.textContent='Wrong PIN.'+(w2?` Wait ${w2}s before trying again.`:'');$('#pin').value=''}}
async function doRecover(){const er=$('#er'),w=waitSecs();if(w)return er.textContent=`Too many attempts. Wait ${w}s.`;
 const rec=$('#rc').value,a=$('#p1').value,b=$('#p2').value;
 if(!/^\d{6,}$/.test(a))return er.textContent='New PIN must be at least 6 digits.';if(a!==b)return er.textContent='PINs do not match.';
 er.textContent='Checking\u2026';
 try{const m=getMeta();const raw=await aesDec(await deriveKey(normRec(rec),unb64(m.saltRec)),m.wRec);await wrapPin(m,raw,a);localStorage.setItem(K.meta,JSON.stringify(m));await openWith(raw);okFails();addLog('PIN reset with recovery code');await save();go('list')}
 catch(e){fail();er.textContent='Recovery code not recognised.'}}
async function changePin(){const cur=$('#cp0').value,n1=$('#cp1').value,n2=$('#cp2').value;
 if(!/^\d{6,}$/.test(n1))return toast('New PIN must be at least 6 digits');if(n1!==n2)return toast('New PINs do not match');
 try{const m=getMeta();const raw=await aesDec(await deriveKey(cur,unb64(m.saltPin)),m.wPin);await wrapPin(m,raw,n1);localStorage.setItem(K.meta,JSON.stringify(m));addLog('PIN changed');await save();toast('PIN changed');render()}
 catch(e){toast('Current PIN is wrong')}}
function lock(){KEY=null;S=null;E=null;VI=null;EM=null;X=null;XFROM=null;SC=null;view='list';renderLock()}
let hiddenAt=0,idleT=null;
document.addEventListener('visibilitychange',()=>{if(document.hidden)hiddenAt=Date.now();else if(KEY&&Date.now()-hiddenAt>30000)lock()});
function resetIdle(){clearTimeout(idleT);if(KEY)idleT=setTimeout(lock,5*60000)}
['touchstart','keydown','click'].forEach(ev=>document.addEventListener(ev,resetIdle,{passive:true}));

/* ===== Files: share/download, backup, restore ===== */
function download(file){const a=document.createElement('a');a.href=URL.createObjectURL(file);a.download=file.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},3000)}
async function deliver(f,msg,done){const ok=async()=>{if(done)await done()};
 if(isPhone()&&navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:f.name});return ok()}catch(e){if(e.name==='AbortError')return;
  if(e.name==='NotAllowedError'){READY={f,ok};return modal(`<h3>File ready</h3><p class="mu">${esc(f.name)}</p><div class="mbtns col"><button class="btn" onclick="shareReady()">Share or save</button><button class="btn ghost" onclick="closeModal()">Close</button></div>`)}}}
 download(f);toast(msg||'File downloaded');return ok()}
async function shareReady(){const{f,ok}=READY;READY=null;closeModal();try{await navigator.share({files:[f],title:f.name});await ok()}catch(e){if(e.name!=='AbortError'){download(f);await ok()}}}
async function backup(){toast('Preparing backup\u2026');const files={},all=await fall();for(const k in all){const v=all[k];files[k]={type:v.type,iv:b64(v.iv),ct:b64(v.ct)}}
 const b=JSON.stringify({app:'invoices',v:DATA_V,at:new Date().toISOString(),meta:getMeta(),data:JSON.parse(localStorage.getItem(K.data)),files});
 await deliver(new File([b],`invoices-backup-${today()}.json`,{type:'application/json'}),'Backup file downloaded',async()=>{S.settings.lastBackup=today();addLog('Backup created');await save();toast('Backup saved');render()})}
function restorePick(){const inp=document.createElement('input');inp.type='file';inp.accept='.json,application/json';
 inp.onchange=async()=>{try{const o=JSON.parse(await inp.files[0].text());if(o.app!=='invoices'||!o.meta||!o.data)throw 0;
  if(!await ask('Restore backup?','This replaces <b>all</b> records on this device. You will need the PIN (or recovery code) that was in use when the backup was made.','Restore',true))return;
  if(o.files){await fclear();for(const k in o.files){const f=o.files[k];await fput(k,{type:f.type,iv:unb64(f.iv),ct:unb64(f.ct).buffer})}}
  localStorage.setItem(K.meta,JSON.stringify(o.meta));localStorage.setItem(K.data,JSON.stringify(o.data));okFails();lock();toast('Backup restored. Enter its PIN.')}
  catch(e){toast('That file is not a valid backup')}};inp.click()}

/* ===== Invoice logic ===== */
const live=()=>S.invoices.filter(i=>!i.deleted);
const find=id=>S.invoices.find(i=>i.id===id);
const worked=i=>i.days.filter(d=>d.worked);
const client=i=>(i.locked&&i.clientSnap)||S.clients.find(c=>c.id===i.clientId)||i.clientSnap||{name:'(no client)',abn:'',address:'',email:''};
const BIZ=['name','abn','address','phone','email','bank','accName','bsb','accNo','terms'];
function from(i){const o=Object.assign({},S.settings);if(i.locked&&i.fromSnap)BIZ.forEach(k=>{if(i.fromSnap[k]!==undefined)o[k]=i.fromSnap[k]});return o}
const dueDate=i=>addDays(i.date,+from(i).terms||7);
const hrs=d=>{if(!d.worked)return 0;const[a,b]=d.start.split(':').map(Number),[c,e]=d.finish.split(':').map(Number);const m=Math.max(0,(c*60+e)-(a*60+b)-(+d.breakMin||0));return Math.round(m/60*100)/100};
const amt=d=>Math.round(hrs(d)*(+d.rate||0)*100)/100;
function totals(i){const sub=i.days.reduce((s,d)=>s+amt(d),0);const gst=i.gst?Math.round(sub*10)/100:0;return{hours:Math.round(i.days.reduce((s,d)=>s+hrs(d),0)*100)/100,sub,gst,total:sub+gst}}
function stat(i){if(i.status==='paid')return['Paid','p-paid'];if(i.status==='sent')return today()>dueDate(i)?['Overdue','p-over']:['Unpaid','p-sent'];return['Draft','p-draft']}
function makeDays(wk,tpl){const st=S.settings;return DAYS.map((n,k)=>{const date=addDays(wk,k),t=tpl&&tpl.days[k];return{date,worked:t?t.worked:(k<5&&!holName(date)),start:t?t.start:st.start,finish:t?t.finish:st.finish,breakMin:t?t.breakMin:st.breakMin,rate:t?t.rate:st.rate}})}
function nextNumber(date,id){const base='INV-'+date.replace(/-/g,'');let n=base,k=2;while(live().some(i=>i.number===n&&i.id!==id))n=base+'-'+(k++);return n}
function newBase(wk){const st=S.settings,date=addDays(wk,6);const i={id:uid(),weekStart:wk,date,number:'',clientId:(S.clients[0]||{}).id||'',status:'draft',locked:false,gst:!!st.gst,service:st.service,days:makeDays(wk),history:[],created:Date.now()};i.number=nextNumber(date,i.id);return i}
function snap(i){i.clientSnap=clone(S.clients.find(c=>c.id===i.clientId)||i.clientSnap||null);i.fromSnap=clone(S.settings)}
function diff(a,b){const c=[],f=(n,x,y)=>{if(String(x??'')!==String(y??''))c.push(`${n}: ${x||'\u2014'} \u2192 ${y||'\u2014'}`)};
 const cn=id=>(S.clients.find(z=>z.id===id)||{}).name;
 f('Client',cn(a.clientId),cn(b.clientId));f('Week',a.weekStart,b.weekStart);f('Invoice date',a.date,b.date);f('Number',a.number,b.number);f('Service',a.service,b.service);f('Status',a.status,b.status);f('Paid on',a.paidDate,b.paidDate);
 b.days.forEach((d,k)=>{const o=a.days[k]||{},n=DAYS[k].slice(0,3);if(!!o.worked!==!!d.worked)c.push(`${n}: ${d.worked?'added':'removed'}`);else if(d.worked){f(n+' start',o.start,d.start);f(n+' finish',o.finish,d.finish);f(n+' break',o.breakMin,d.breakMin);f(n+' rate',o.rate,d.rate)}});
 const ta=totals(a).total,tb=totals(b).total;if(ta!==tb)c.push(`Total: $${money(ta)} \u2192 $${money(tb)}`);return c}
function fillVars(s,i){const c=client(i),st=from(i),t=totals(i);const v={client:c.name||'',number:i.number,amount:money(t.total),period:period(i),duedate:fmtD(dueDate(i)),hours:t.hours,myname:st.name||'',myphone:st.phone||''};return String(s||'').replace(/\{(\w+)\}/g,(m,k)=>k in v?v[k]:m)}

/* ===== Navigation ===== */
const VIEWS={list:renderList,edit:renderEdit,view:renderView,settings:renderSettings,log:renderLog};
const NAV=[['list','Invoices','inv',['list','edit','view']],['expenses','Expenses','exp',['expenses','expEdit']],['dash','Dashboard','dash',['dash']],['tax','Tax','tax',['tax']],['settings','Settings','set',['settings','log']]];
function go(v){view=v;render();window.scrollTo(0,0)}
function render(){if(!KEY)return renderLock();document.body.classList.remove('locked');applyTheme();renderNav();(VIEWS[view]||renderList)()}
function renderNav(){const s=S.settings;nav.hidden=false;nav.className='nav'+(['edit','view','expEdit'].includes(view)?' hidemob':'');
 nav.innerHTML=`<div class="brand"><div class="logo">${esc(initials(s.name))}</div><div style="min-width:0"><b>Invoices</b><div class="mu small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(s.name||'Set up your business')}</div></div></div>
 ${NAV.filter(n=>VIEWS[n[0]]).map(([v,l,ic,on])=>`<button class="nb ${on.includes(view)?'on':''}" onclick="go('${v}')">${I[ic]}${l}</button>`).join('')}
 <div class="spacer"></div><button class="lockb" onclick="lock()">${I.lock}Lock app</button>`}

/* ===== Invoice list ===== */
function renderList(){const cur=fy(today());if(curFY==null)curFY=cur;
 const fys=[...new Set([cur,...live().map(i=>fy(i.date))])].sort((a,b)=>b-a);
 const list=live().filter(i=>fy(i.date)===curFY).sort((a,b)=>b.date.localeCompare(a.date)||b.created-a.created);
 const sum=f=>list.filter(f).reduce((s,i)=>s+totals(i).total,0),mk=today().slice(0,7);
 const issued=sum(i=>i.status!=='draft'),paid=sum(i=>i.status==='paid'),owing=sum(i=>i.status==='sent'),month=sum(i=>i.status!=='draft'&&i.date.startsWith(mk));
 const groups={};list.forEach(i=>(groups[i.date.slice(0,7)]=groups[i.date.slice(0,7)]||[]).push(i));
 const old=!S.settings.lastBackup||S.settings.lastBackup<addDays(today(),-7);
 let h=`<div class="wrap"><div class="top"><h1>Invoices</h1><div style="display:flex;gap:10px;align-items:center"><select class="fy" onchange="curFY=+this.value;render()">${fys.map(y=>`<option value="${y}" ${y===curFY?'selected':''}>${fyLabel(y)}</option>`).join('')}</select><button class="link mlock" onclick="lock()">Lock</button></div></div>
 ${installBanner()}${old&&live().length?`<div class="banner">No backup in the last 7 days. <button class="link" style="padding:0" onclick="backup()">Back up now</button></div>`:''}
 <div class="stats"><div class="stat"><div class="mu small">Invoiced this FY</div><b>$${money(issued)}</b></div><div class="stat"><div class="mu small">This month</div><b>$${money(month)}</b></div>
 <div class="stat"><div class="mu small">Paid</div><b style="color:var(--gr)">$${money(paid)}</b></div><div class="stat"><div class="mu small">Owing</div><b style="color:${owing?'var(--rd)':'inherit'}">$${money(owing)}</b></div></div>`;
 if(!list.length)h+=`<div class="empty">No invoices in ${fyLabel(curFY)} yet.<br>Tap <b>+ New invoice</b> to create one.</div>`;
 Object.keys(groups).sort().reverse().forEach(k=>{const g=groups[k],mt=g.filter(i=>i.status!=='draft').reduce((s,i)=>s+totals(i).total,0);
  h+=`<div class="mhead"><span class="cap">${D(k+'-01').toLocaleDateString('en-AU',{month:'long',year:'numeric'})}</span><span class="cap">$${money(mt)}</span></div><div class="card">${g.map(rowHTML).join('')}</div>`});
 if(list.length)h+=`<p class="mu small swipehint" style="text-align:center;margin-top:18px">Swipe left to email, copy or delete. Swipe right to mark paid.</p>`;
 app.innerHTML=h+`</div><button class="btn fab" onclick="startNew()">+ New invoice</button>`;
 document.querySelectorAll('.row').forEach(attachSwipe)}
function rowHTML(i){const[st,cls]=stat(i),c=client(i);return `<div class="row"><div class="acts l"><button class="a0" onclick="markPaid('${i.id}')">Paid</button></div>
 <div class="acts r"><button class="a1" onclick="emailInv('${i.id}')">Email</button><button class="a2" onclick="duplicate('${i.id}')">Copy</button><button class="a3" onclick="del('${i.id}')">Delete</button></div>
 <div class="rc" onclick="rowTap(this,'${i.id}')"><div class="av">${esc(initials(c.name))}</div><div class="grow"><b>${esc(c.name)}</b><div class="mu small">${esc(i.number)} \u00b7 ${shortRange(i)}</div></div>
 <div class="hov" onclick="event.stopPropagation()"><button onclick="emailInv('${i.id}')">Email</button><button onclick="sharePDF(find('${i.id}'))">PDF</button><button onclick="duplicate('${i.id}')">Copy</button>${i.status!=='paid'?`<button onclick="markPaid('${i.id}')">Mark paid</button>`:''}<button onclick="del('${i.id}')">Delete</button></div>
 <div class="amt">$${money(totals(i).total)}<br><span class="pill ${cls}">${st}</span></div></div></div>`}
function setOff(c,o){c.dataset.off=o;c.style.transform=`translateX(${o}px)`}
function rowTap(c,id){if(+c.dataset.off){c.style.transition='transform .2s';setOff(c,0);return}openView(id)}
function attachSwipe(row){const c=row.querySelector('.rc');let x0,y0,dx=0,drag=null,base=0;
 row.addEventListener('touchstart',e=>{x0=e.touches[0].clientX;y0=e.touches[0].clientY;drag=null;base=+c.dataset.off||0;dx=base;c.style.transition='none'},{passive:true});
 row.addEventListener('touchmove',e=>{const mx=e.touches[0].clientX-x0,my=e.touches[0].clientY-y0;if(drag===null&&(Math.abs(mx)>8||Math.abs(my)>8))drag=Math.abs(mx)>Math.abs(my);if(!drag)return;dx=Math.max(-216,Math.min(90,base+mx));c.style.transform=`translateX(${dx}px)`},{passive:true});
 row.addEventListener('touchend',()=>{c.style.transition='transform .2s';if(!drag)return;const off=dx<-70?-216:dx>50?90:0;setOff(c,off);if(off)document.querySelectorAll('.rc').forEach(o=>{if(o!==c){o.style.transition='transform .2s';setOff(o,0)}})})}
async function markPaid(id){const i=find(id);if(i.status==='paid'){toast('Already marked paid');return render()}
 const before=clone(i);if(i.status==='draft')snap(i);i.status='paid';i.paidDate=today();i.locked=true;
 i.history.push({ts:Date.now(),changes:diff(before,i)});addLog(`${i.number} marked paid`);await save();toast('Marked as paid');render()}
function duplicate(id){const s=find(id),wk=addDays(s.weekStart,7),n=newBase(wk);Object.assign(n,{clientId:s.clientId,service:s.service,gst:s.gst});n.days=makeDays(wk,s);E=n;editFrom=null;unlockReason=null;go('edit')}
async function del(id){const i=find(id);
 if(i.locked){await note('Invoice is locked','It was sent or paid. Open it and tap <b>Unlock to edit</b> first if you really need to delete it.');return render()}
 if(!await ask('Delete invoice?',`${esc(i.number)} will move to Recently deleted in Settings.`,'Delete',true))return render();
 i.deleted=Date.now();addLog(`${i.number} deleted`);await save();E=null;toast('Invoice deleted');go('list')}
async function restore(id){const i=find(id);delete i.deleted;if(live().some(x=>x.number===i.number&&x.id!==i.id))i.number=nextNumber(i.date,i.id);addLog(`${i.number} restored`);await save();toast('Invoice restored');render()}
async function startNew(){if(!S.settings.name){await note('Add your details first','Fill in your business details in Settings.');return go('settings')}
 if(!S.clients.length){await note('Add a client first','Add a client in Settings, then create your invoice.');return go('settings')}
 E=newBase(monday(today()));editFrom=null;unlockReason=null;go('edit')}
function editInv(id){E=clone(find(id));editFrom=id;unlockReason=null;go('edit')}

/* ===== Invoice editor ===== */
function renderEdit(){const i=E,ro=i.locked,dis=ro?'disabled':'',t=totals(i);
 let h=`<div class="wrap"><div class="top"><button class="link" onclick="E=null;unlockReason=null;go('list')">Cancel</button><b>${editFrom?esc(i.number):'New invoice'}</b><button class="btn sm" onclick="saveEdit()" ${ro?'disabled':''}>Save</button></div>`;
 if(ro)h+=`<div class="banner"><b>Locked.</b> This invoice is ${i.status}, so it's protected from accidental changes.<br><button class="btn sm sec" style="margin-top:8px" onclick="unlockInv()">Unlock to edit</button></div>`;
 h+=`<div class="edgrid"><div><h2 class="sec">Details</h2><div class="card"><div class="fgrid two">
 <div class="fld"><label>Client</label><select class="inp" ${dis} onchange="E.clientId=this.value;renderEdit()">${S.clients.map(c=>`<option value="${c.id}" ${c.id===i.clientId?'selected':''}>${esc(c.name)}</option>`).join('')}</select></div>
 <div class="fld"><label>Invoice no.</label><input class="inp" ${dis} value="${esc(i.number)}" onchange="E.number=this.value.trim()"></div>
 <div class="fld"><label>Week starting (Monday)</label><input class="inp" type="date" ${dis} value="${i.weekStart}" onchange="setWeek(this.value)"></div>
 <div class="fld"><label>Invoice date</label><input class="inp" type="date" ${dis} value="${i.date}" onchange="setDate(this.value)"></div>
 <div class="fld" style="grid-column:1/-1"><label>Service</label><input class="inp" ${dis} value="${esc(i.service)}" onchange="E.service=this.value"></div></div></div>`;
 if(!ro)h+=`<div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap"><button class="btn sm sec" onclick="copyLast()">Copy last week's hours</button><button class="btn sm sec" onclick="E.days=makeDays(E.weekStart);renderEdit()">Reset to default hours</button></div>`;
 h+=`<h2 class="sec">Hours worked</h2><div class="card">`+i.days.map((d,k)=>{const hol=holName(d.date);return `<div class="day"><div class="dayh"><label class="sw"><input type="checkbox" ${dis} ${d.worked?'checked':''} onchange="E.days[${k}].worked=this.checked;renderEdit()"><span></span></label>
  <div class="grow"><b style="display:inline">${DAYS[k]}</b> <span class="mu small">${fmtD(d.date)}</span>${hol?`<span class="tag">${esc(hol)}</span>`:''}</div>
  <div class="amt">${d.worked?`${hrs(d)} h<br><span class="mu small">$${money(amt(d))}</span>`:'<span class="mu small">Off</span>'}</div></div>
  ${d.worked?`<div class="dayg"><div><label>Start</label><input class="inp" type="time" ${dis} value="${d.start}" onchange="setDay(${k},'start',this.value)"></div>
  <div><label>Finish</label><input class="inp" type="time" ${dis} value="${d.finish}" onchange="setDay(${k},'finish',this.value)"></div>
  <div><label>Break min</label><input class="inp" type="number" inputmode="numeric" ${dis} value="${d.breakMin}" onchange="setDay(${k},'breakMin',+this.value)"></div>
  <div><label>Rate $/h</label><input class="inp" type="number" inputmode="decimal" step="0.01" ${dis} value="${d.rate}" onchange="setDay(${k},'rate',+this.value)"></div></div>`:''}</div>`}).join('')+`</div></div>`;
 h+=`<div class="side"><h2 class="sec">Summary</h2><div class="card" style="padding:8px 0"><div class="tot"><span class="mu">Hours</span><span>${t.hours}</span></div><div class="tot"><span class="mu">Subtotal</span><span>$${money(t.sub)}</span></div><div class="tot"><span class="mu">GST</span><span>$${money(t.gst)}</span></div><div class="tot big"><span>Total due</span><span>$${money(t.total)}</span></div>
 ${typeof setAsideFor==='function'?`<div class="tot" style="color:var(--am);font-weight:600"><span>Put aside for tax</span><span>$${money(setAsideFor(i))}</span></div>`:''}</div>
 <h2 class="sec">Status</h2><div class="seg">${['draft','sent','paid'].map(s=>`<button ${dis} class="${i.status===s?'on':''}" onclick="setStatus('${s}')">${s[0].toUpperCase()+s.slice(1)}</button>`).join('')}</div>
 ${i.status==='paid'?`<div class="fld" style="margin-top:12px"><label>Paid on</label><input class="inp" type="date" ${dis} value="${i.paidDate||''}" onchange="E.paidDate=this.value"></div>`:''}
 <p class="mu small" style="margin:8px 4px">Sent and paid invoices lock after saving.</p>
 <h2 class="sec">Actions</h2><div class="stack"><button class="btn sec full" onclick="VI=E;go('view')">Preview invoice</button><button class="btn sec full" onclick="emailInv(null)">Email to client</button><button class="btn sec full" onclick="sharePDF(E)">Share or download PDF</button>
 ${editFrom?`<button class="btn sec full" onclick="duplicate('${editFrom}')">Copy to next week</button>${ro?'':`<button class="btn dan full" onclick="del('${editFrom}')">Delete invoice</button>`}`:''}</div>`;
 if(i.history&&i.history.length)h+=`<h2 class="sec">Change history</h2><div class="card">${i.history.slice().reverse().map(x=>`<div class="hist"><b>${new Date(x.ts).toLocaleString('en-AU')}</b>${x.reason?` \u00b7 Reason: ${esc(x.reason)}`:''}<br>${(x.changes||[]).map(esc).join('<br>')||'Saved'}</div>`).join('')}</div>`;
 app.innerHTML=h+'</div></div></div>'}
function setDay(k,f,v){E.days[k][f]=v;renderEdit()}
function setStatus(s){E.status=s;if(s==='paid'&&!E.paidDate)E.paidDate=today();if(s!=='paid')delete E.paidDate;renderEdit()}
function setWeek(v){if(!v)return;const wk=monday(v);E.weekStart=wk;E.days=E.days.map((d,k)=>({...d,date:addDays(wk,k)}));E.date=addDays(wk,6);if(E.status==='draft')E.number=nextNumber(E.date,E.id);renderEdit()}
function setDate(v){if(!v)return;E.date=v;if(E.status==='draft')E.number=nextNumber(v,E.id);renderEdit()}
function copyLast(){const p=live().filter(x=>x.clientId===E.clientId&&x.id!==E.id&&x.weekStart<E.weekStart).sort((a,b)=>b.weekStart.localeCompare(a.weekStart))[0];if(!p)return toast('No earlier invoice for this client');E.days=makeDays(E.weekStart,p);renderEdit();toast("Copied last week's hours")}
async function unlockInv(){const r=await askText('Unlock invoice','Why does this invoice need to change? This is saved in its history.');if(!r||!r.trim())return;unlockReason=r.trim();E.locked=false;renderEdit()}
async function saveEdit(){const i=E;
 if(!i.clientId)return toast('Choose a client');
 if(!i.number)return toast('Enter an invoice number');
 if(!i.days.some(d=>d.worked&&hrs(d)>0))return toast('No hours entered');
 if(live().some(x=>x.number===i.number&&x.id!==i.id))return note('Number already used',`Invoice number ${esc(i.number)} is already used. Change it before saving.`);
 const long=i.days.filter(d=>d.worked&&hrs(d)>12);if(long.length&&!await ask('Long days',`${long.length} day(s) are over 12 hours. Save anyway?`,'Save'))return;
 const clash=live().find(x=>x.id!==i.id&&x.clientId===i.clientId&&x.weekStart===i.weekStart);if(clash&&!await ask('Week already invoiced',`${esc(clash.number)} already covers this week for this client. Save anyway?`,'Save'))return;
 const old=editFrom?find(editFrom):null;
 if(i.status!=='draft'&&(!old||old.status==='draft'||old.clientId!==i.clientId||unlockReason))snap(i);
 i.locked=i.status!=='draft';
 if(old){const ch=diff(old,i);i.history=old.history||[];if(ch.length||unlockReason)i.history=[...i.history,{ts:Date.now(),changes:ch,reason:unlockReason||undefined}];
  Object.assign(old,clone(i));addLog(`${i.number} edited${unlockReason?` (unlocked: ${unlockReason})`:''}`)}
 else{i.history=[{ts:Date.now(),changes:['Created']}];S.invoices.push(clone(i));addLog(`${i.number} created`)}
 unlockReason=null;curFY=fy(i.date);await save();E=null;editFrom=null;toast('Invoice saved');go('list')}

/* ===== Invoice document ===== */
function openView(id){VI=find(id);E=null;go('view')}
function renderView(){const i=VI;
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="${E?"go('edit')":"go('list')"}">\u2039 Back</button><div style="display:flex;gap:8px">${E?'':`<button class="btn sm sec" onclick="editInv('${i.id}')">${i.locked?'Details':'Edit'}</button>`}<button class="btn sm sec" onclick="emailInv(${E?'null':`'${i.id}'`})">Email</button><button class="btn sm" onclick="sharePDF(VI)">PDF</button></div></div>${invHTML(i)}</div>`}
function invHTML(i){const st=from(i),c=client(i),t=totals(i),w=worked(i),bt=breakText(w);
 const meta=[['Invoice No.',i.number],['Date',fmtD(i.date)],['Pay period',period(i)]];if(st.showTerms)meta.push(['Due date',fmtD(dueDate(i))]);
 const notes=[!i.gst&&st.showGstNote?'No GST has been charged. The supplier is not registered for GST.':'',st.showFooter&&st.footer?st.footer:''].filter(Boolean);
 return `<div class="paper"><div class="ih"><div class="biz"><b>${esc(st.name)}</b><div>${[st.abn&&'ABN '+st.abn,st.address,st.phone,st.email].filter(Boolean).map(esc).join('<br>')}</div></div>
 <div class="ttl"><div class="h">${i.gst?'TAX INVOICE':'INVOICE'}</div><table class="meta">${meta.map(m=>`<tr><td>${m[0]}</td><td>${esc(m[1])}</td></tr>`).join('')}</table></div></div>
 <div class="ib"><div class="bt"><div class="cap">Bill to</div><b>${esc(c.name)}</b><div>${[c.abn&&'ABN '+c.abn,c.address].filter(Boolean).map(esc).join('<br>')}</div></div>
 <div class="due"><div class="cap" style="color:var(--ac)">Amount due</div><b>$${money(t.total)}</b>${st.showTerms?`<div class="mu small">Due ${fmtD(dueDate(i))}</div>`:''}</div></div>
 <div class="svc">${esc(i.service)} &middot; ${esc(rangeText(w))}</div>
 <table class="ht"><tr><th>Day</th><th>Start</th><th>Finish</th><th class="n">Hours</th><th class="n">Rate</th><th class="n">Amount</th></tr>
 ${w.map(d=>`<tr><td>${dayShort(d.date)}</td><td>${t12(d.start)}</td><td>${t12(d.finish)}</td><td class="n">${hrs(d).toFixed(1)}</td><td class="n">$${money(d.rate)}</td><td class="n">$${money(amt(d))}</td></tr>`).join('')}</table>
 ${st.showBreak&&bt?`<div class="bn">${bt}</div>`:''}
 <div class="tt"><div><span class="mu">Total hours</span><span>${t.hours.toFixed(1)}</span></div><div><span class="mu">Subtotal</span><span>$${money(t.sub)}</span></div><div><span class="mu">GST</span><span>$${money(t.gst)}</span></div><div class="g"><span>Total due</span><span>$${money(t.total)}</span></div></div>
 <div class="pay"><div class="cap">Payment details</div><div class="pg"><span>Bank</span><b>${esc(st.bank)}</b><span>Account name</span><b>${esc(st.accName)}</b><span>BSB</span><b>${esc(st.bsb)}</b><span>Account no.</span><b>${esc(st.accNo)}</b><span>Reference</span><b>${esc(i.number)}</b></div></div>
 ${notes.length?`<div class="fn">${notes.map(esc).join('<br>')}</div>`:''}</div>`}

/* ===== PDF ===== */
function buildPDF(i){const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:'mm',format:'a4'});
 const st=from(i),c=client(i),t=totals(i),w=worked(i),A=hexRgb(accHex()),G=[107,114,128],L=18,R=192;
 doc.setFillColor(...A);doc.rect(0,0,210,5,'F');
 let y=22;
 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(22);doc.text(st.name||'',L,y);
 const lines=[st.abn&&'ABN '+st.abn,st.address,st.phone,st.email].filter(Boolean);
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);lines.forEach((l,k)=>doc.text(String(l),L,y+6+k*4.6));
 doc.setFont('helvetica','bold');doc.setFontSize(24);doc.setTextColor(...A);doc.text(i.gst?'TAX INVOICE':'INVOICE',R,y+1,{align:'right'});
 const meta=[['Invoice No.',i.number],['Date',fmtD(i.date)],['Pay period',period(i)]];if(st.showTerms)meta.push(['Due date',fmtD(dueDate(i))]);
 doc.setFontSize(9);meta.forEach((m,k)=>{const yy=y+9+k*5;doc.setFont('helvetica','normal');doc.setTextColor(...G);doc.text(m[0],R-66,yy);doc.setFont('helvetica','bold');doc.setTextColor(22);doc.text(String(m[1]),R,yy,{align:'right'})});
 y=Math.max(y+6+lines.length*4.6,y+9+meta.length*5)+6;
 doc.setDrawColor(230,232,236);doc.setLineWidth(0.3);doc.line(L,y,R,y);y+=9;
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...G);doc.text('BILL TO',L,y);
 doc.setFontSize(12);doc.setTextColor(22);doc.text(c.name||'',L,y+6);
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);[c.abn&&'ABN '+c.abn,c.address].filter(Boolean).forEach((l,k)=>doc.text(String(l),L,y+11+k*4.6));
 doc.setFillColor(...soft(A));doc.roundedRect(R-64,y-5,64,st.showTerms?25:21,2.5,2.5,'F');
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...A);doc.text('AMOUNT DUE',R-59,y+1);doc.setFontSize(18);doc.text('$'+money(t.total),R-59,y+10);
 if(st.showTerms){doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...G);doc.text('Due '+fmtD(dueDate(i)),R-59,y+16)}
 y+=st.showTerms?29:25;
 doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(22);doc.text(`${i.service} - ${rangeText(w)}`,L,y,{maxWidth:R-L});y+=4;
 doc.autoTable({startY:y,margin:{left:L,right:210-R},theme:'plain',styles:{fontSize:9,cellPadding:{top:2.6,bottom:2.6,left:2.5,right:2.5},textColor:30,lineColor:[230,232,236],lineWidth:{bottom:0.2}},headStyles:{fillColor:A,textColor:255,fontStyle:'bold',fontSize:8},alternateRowStyles:{fillColor:[249,250,251]},
  head:[['DAY','START','FINISH','HOURS','RATE','AMOUNT']],body:w.map(d=>[dayShort(d.date),t12(d.start),t12(d.finish),hrs(d).toFixed(1),'$'+money(d.rate),'$'+money(amt(d))]),
  columnStyles:{3:{halign:'right'},4:{halign:'right'},5:{halign:'right'}},didParseCell:d=>{if(d.section==='head'&&d.column.index>=3)d.cell.styles.halign='right'}});
 y=doc.lastAutoTable.finalY+6;const bt=breakText(w);
 if(st.showBreak&&bt){doc.setFont('helvetica','normal');doc.setFontSize(8.5);doc.setTextColor(...G);doc.text(bt,L,y);y+=4}
 const tx=R-72;y+=4;
 const row=(l,v)=>{doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...G);doc.text(l,tx+4,y);doc.setTextColor(30);doc.text(v,R-4,y,{align:'right'});y+=6};
 row('Total hours',t.hours.toFixed(1));row('Subtotal','$'+money(t.sub));row('GST','$'+money(t.gst));
 doc.setFillColor(...A);doc.roundedRect(tx,y-3,72,11,2,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(11.5);doc.setTextColor(255);doc.text('Total due',tx+4,y+4.3);doc.text('$'+money(t.total),R-4,y+4.3,{align:'right'});y+=20;
 doc.setDrawColor(230,232,236);doc.line(L,y-6,R,y-6);
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...G);doc.text('PAYMENT DETAILS',L,y);y+=6;
 [['Bank',st.bank],['Account name',st.accName],['BSB',st.bsb],['Account no.',st.accNo],['Reference',i.number]].forEach(p=>{doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...G);doc.text(p[0],L,y);doc.setFont('helvetica','bold');doc.setTextColor(22);doc.text(String(p[1]||''),L+34,y);y+=5.2});
 y+=5;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);
 if(!i.gst&&st.showGstNote){doc.text('No GST has been charged. The supplier is not registered for GST.',L,y);y+=5}
 if(st.showFooter&&st.footer)doc.text(st.footer,L,y,{maxWidth:R-L});
 return doc}
function pdfFile(i){return new File([buildPDF(i).output('blob')],`${i.number||'invoice'}.pdf`,{type:'application/pdf'})}
function sharePDF(i){if(!window.jspdf)return toast('PDF tool not loaded. Check internet.');return deliver(pdfFile(i),'PDF downloaded')}

/* ===== Email ===== */
const chips=id=>`<div class="chips">${VARS.map(v=>`<span onclick="insVar('${id}','{${v}}')">{${v}}</span>`).join('')}</div>`;
function insVar(id,v){const b=document.getElementById(id);b.setRangeText(v,b.selectionStart,b.selectionEnd,'end');b.focus()}
function emailInv(id){const i=id?find(id):E;EM=i;const c=client(i);
 modal(`<h3>Email invoice ${esc(i.number)}</h3><p class="mu small" style="margin:0">${esc(c.name)} \u00b7 $${money(totals(i).total)}</p>
 <label class="lbl">To</label><input id="em_to" class="inp" type="email" autocomplete="email" value="${esc(c.email||'')}" placeholder="accounts@client.com.au">
 <label class="lbl">Saved message</label><select id="em_tp" class="inp" onchange="loadTpl()">${S.templates.map((t,k)=>`<option value="${k}">${esc(t.name)}</option>`).join('')}</select>
 <label class="lbl">Subject</label><input id="em_sub" class="inp">
 <label class="lbl">Message</label><textarea id="em_body" class="inp" rows="8"></textarea>
 <p class="mu small" style="margin:8px 0 0">Tap to insert. These fill in automatically when sent:</p>${chips('em_body')}
 <div style="display:flex;gap:18px;flex-wrap:wrap;margin-top:6px"><button class="link" onclick="saveTpl(false)">Update saved message</button><button class="link" onclick="$('#ntp').hidden=false;$('#ntn').focus()">Save as new message</button></div>
 <div id="ntp" hidden><input id="ntn" class="inp" placeholder="Name, e.g. Overdue reminder"><button class="btn sm" style="margin-top:8px" onclick="saveTpl(true)">Save message</button></div>
 <div class="mbtns col"><button class="btn" onclick="sendWithPdf()">Send with PDF attached</button><button class="btn sec" onclick="sendMailto()">Open in Mail (no attachment)</button><button class="btn ghost" onclick="closeModal()">Cancel</button></div>
 <p class="mu small">With PDF: your share sheet opens. Choose Mail or Gmail. The client's email address is copied, so paste it into the To field.</p>`);loadTpl()}
function loadTpl(){const t=S.templates[+$('#em_tp').value]||{};$('#em_sub').value=t.subject||'';$('#em_body').value=t.body||''}
async function saveTpl(asNew){const t={subject:$('#em_sub').value,body:$('#em_body').value};
 if(asNew){const n=$('#ntn').value.trim();if(!n)return toast('Enter a name for the message');t.name=n;S.templates.push(t);const sel=$('#em_tp');sel.add(new Option(n,S.templates.length-1));sel.value=S.templates.length-1;$('#ntp').hidden=true;$('#ntn').value=''}
 else Object.assign(S.templates[+$('#em_tp').value],t);
 addLog('Email message saved');await save();toast('Message saved')}
function emailParts(){const i=EM;return{i,to:$('#em_to').value.trim().replace(/[?&#\s]/g,''),sub:fillVars($('#em_sub').value,i),body:fillVars($('#em_body').value,i)}}
async function sendWithPdf(){const{i,to,sub,body}=emailParts();if(!window.jspdf)return toast('PDF tool not loaded. Check internet.');
 const f=pdfFile(i);if(to&&navigator.clipboard)navigator.clipboard.writeText(to).catch(()=>{});
 if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:sub,text:body});return afterSend(i,to)}catch(e){if(e.name==='AbortError')return}}
 download(f);location.href=`mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;toast('PDF downloaded. Attach it to the email.');afterSend(i,to)}
function sendMailto(){const{i,to,sub,body}=emailParts();location.href=`mailto:${to}?subject=${encodeURIComponent(sub)}&body=${encodeURIComponent(body)}`;afterSend(i,to)}
async function afterSend(i,to){closeModal();const c=S.clients.find(x=>x.id===i.clientId);if(c&&to&&!c.email)c.email=to;
 addLog(`${i.number} emailed${to?' to '+to:''}`);const stored=find(i.id);
 if(stored&&!(E&&E.id===i.id)&&stored.status==='draft'&&await ask('Mark as sent?',`Mark ${esc(i.number)} as sent? It will be locked to protect it.`,'Mark as sent',false,'Not now')){
  const b=clone(stored);snap(stored);stored.status='sent';stored.locked=true;stored.history.push({ts:Date.now(),changes:diff(b,stored)});toast('Marked as sent')}
 else if(E&&E.id===i.id&&E.status==='draft')toast('Set status to Sent, then Save');
 await save();render()}

/* ===== Settings ===== */
async function setS(k,v){if(typeof v==='number'&&isNaN(v))return;if(S.settings[k]===v)return;S.settings[k]=v;addLog(`Setting changed: ${k}`);await save();toast('Saved')}
function editClient(id){const c=id?S.clients.find(x=>x.id===id):{name:'',abn:'',address:'',email:''};
 modal(`<h3>${id?'Edit':'New'} client</h3><label class="lbl">Business name</label><input id="cn" class="inp" value="${esc(c.name)}"><label class="lbl">ABN</label><input id="ca" class="inp" inputmode="numeric" value="${esc(c.abn)}"><label class="lbl">Address</label><input id="cd" class="inp" value="${esc(c.address)}"><label class="lbl">Email for invoices</label><input id="ce" class="inp" type="email" value="${esc(c.email||'')}">
 <div class="mbtns">${id&&!S.invoices.some(i=>i.clientId===id)?`<button class="btn dan" onclick="delClient('${id}')">Delete</button>`:''}<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveClient('${id||''}')">Save</button></div>`)}
async function saveClient(id){const v={name:$('#cn').value.trim(),abn:$('#ca').value.trim(),address:$('#cd').value.trim(),email:$('#ce').value.trim()};if(!v.name)return toast('Name is required');
 if(id)Object.assign(S.clients.find(x=>x.id===id),v);else S.clients.push({id:uid(),...v});addLog(`Client ${id?'updated':'added'}: ${v.name}`);await save();closeModal();toast('Client saved');render()}
async function delClient(id){S.clients=S.clients.filter(x=>x.id!==id);addLog('Client deleted');await save();closeModal();render()}
function editTpl(k){const t=k>=0?S.templates[k]:{name:'',subject:'Invoice {number} - {period}',body:''};
 modal(`<h3>${k>=0?'Edit':'New'} email message</h3><label class="lbl">Name</label><input id="tn" class="inp" value="${esc(t.name)}" placeholder="e.g. Weekly invoice"><label class="lbl">Subject</label><input id="ts" class="inp" value="${esc(t.subject)}"><label class="lbl">Message</label><textarea id="tb" class="inp" rows="8">${esc(t.body)}</textarea>
 <p class="mu small" style="margin:8px 0 0">Tap to insert. These fill in automatically:</p>${chips('tb')}
 <div class="mbtns">${k>=0&&S.templates.length>1?`<button class="btn dan" onclick="delTpl(${k})">Delete</button>`:''}<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveTplEdit(${k})">Save</button></div>`)}
async function saveTplEdit(k){const t={name:$('#tn').value.trim(),subject:$('#ts').value,body:$('#tb').value};if(!t.name)return toast('Enter a name');
 if(k>=0)Object.assign(S.templates[k],t);else S.templates.push(t);addLog('Email message saved');await save();closeModal();toast('Message saved');render()}
async function delTpl(k){S.templates.splice(k,1);await save();closeModal();render()}
function renderSettings(){const s=S.settings;
 const F=(k,l,type='text',ex='')=>`<div class="fld"><label>${l}</label><input class="inp" type="${type}" ${ex} value="${esc(s[k])}" placeholder="${esc(l)}" onchange="setS('${k}',${type==='number'?'this.valueAsNumber':'this.value'})"></div>`;
 const T=(k,l,h='')=>`<div class="tg"><div><div style="font-weight:600">${l}</div>${h?`<div class="mu small">${h}</div>`:''}</div><label class="sw"><input type="checkbox" ${s[k]?'checked':''} onchange="setS('${k}',this.checked);render()"><span></span></label></div>`;
 const delInv=S.invoices.filter(i=>i.deleted),delEx=(S.expenses||[]).filter(x=>x.deleted);
 const left=`<h2 class="sec">Your business</h2><div class="card"><div class="fgrid two">${F('name','Name')}${F('abn','ABN','text','inputmode="numeric"')}<div style="grid-column:1/-1">${F('address','Address')}</div>${F('phone','Phone','tel')}${F('email','Email','email')}</div></div>
 <h2 class="sec">Bank details</h2><div class="card"><div class="fgrid two">${F('bank','Bank')}${F('accName','Account name')}${F('bsb','BSB','text','inputmode="numeric"')}${F('accNo','Account no.','text','inputmode="numeric"')}</div></div>
 <h2 class="sec">Invoice defaults</h2><div class="card"><div class="fgrid two"><div style="grid-column:1/-1">${F('service','Service description')}</div>${F('rate','Hourly rate ($)','number','step="0.01" inputmode="decimal"')}${F('breakMin','Unpaid break (minutes)','number','inputmode="numeric"')}${F('start','Start time','time')}${F('finish','Finish time','time')}${F('terms','Payment terms (days)','number','inputmode="numeric"')}</div></div>
 <h2 class="sec">Invoice appearance</h2><div class="card"><div class="pad"><div class="fld"><label>Accent colour</label><div class="sws">${Object.entries(ACC).map(([k,v])=>`<div class="swc ${s.accent===k?'on':''}" title="${k}" style="background:${v}" onclick="setS('accent','${k}');render()"></div>`).join('')}</div></div></div>
 ${T('gst','Registered for GST','Adds 10% GST and titles new invoices "Tax Invoice"')}
 ${T('showTerms','Show due date','Uses your payment terms to show a due date')}
 ${T('showBreak','Show lunch break note')}
 ${T('showGstNote','Show "No GST" note','Only shown when not registered for GST')}
 ${T('showFooter','Footer message','A closing line at the bottom of every invoice')}
 ${s.showFooter?`<div class="pad" style="padding-top:0"><input class="inp" value="${esc(s.footer)}" placeholder="Footer message" onchange="setS('footer',this.value)"></div>`:''}</div>`;
 const right=`<h2 class="sec">Clients</h2><div class="card">${S.clients.map(c=>`<div class="rc" style="border-bottom:1px solid var(--ln)" onclick="editClient('${c.id}')"><div class="av">${esc(initials(c.name))}</div><div class="grow"><b>${esc(c.name)}</b><div class="mu small">${esc(c.email||'No email saved')}</div></div><span class="mu">\u203a</span></div>`).join('')}<div class="pad"><button class="btn sm sec" onclick="editClient()">+ Add client</button></div></div>
 <h2 class="sec">Saved email messages</h2><div class="card">${S.templates.map((t,k)=>`<div class="rc" style="border-bottom:1px solid var(--ln)" onclick="editTpl(${k})"><div class="grow"><b>${esc(t.name)}</b><div class="mu small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(t.subject)}</div></div><span class="mu">\u203a</span></div>`).join('')}<div class="pad"><button class="btn sm sec" onclick="editTpl(-1)">+ New message</button></div></div>
 <h2 class="sec">Backup</h2><div class="card"><div class="pad"><p class="mu small" style="margin-top:0">Saves an encrypted copy of all your records and receipt photos. On iPhone, choose <b>Google Drive</b> or <b>Save to Files</b>. On a computer the file downloads; upload it to drive.google.com. Back up before every app update.</p>
 <p style="margin:10px 0">Last backup: <b>${s.lastBackup?fmtD(s.lastBackup):'Never'}</b></p><div style="display:flex;gap:8px;flex-wrap:wrap"><button class="btn sm" onclick="backup()">Back up now</button><button class="btn sm sec" onclick="restorePick()">Restore from file</button></div></div></div>
 <h2 class="sec">Security</h2><div class="card"><div class="pad"><div class="fld"><label>Change PIN</label></div><div class="stack"><input id="cp0" class="inp" type="password" inputmode="numeric" placeholder="Current PIN"><input id="cp1" class="inp" type="password" inputmode="numeric" placeholder="New PIN (6+ digits)"><input id="cp2" class="inp" type="password" inputmode="numeric" placeholder="Confirm new PIN"></div>
 <button class="btn sm" style="margin-top:10px" onclick="changePin()">Change PIN</button></div>
 <div class="tg" style="cursor:pointer" onclick="go('log')"><span style="font-weight:600">Activity log</span><span class="mu">\u203a</span></div></div>
 <p class="mu small" style="margin:8px 4px">Records are encrypted on this device with your PIN. The app locks after 5 minutes without use, or 30 seconds after you leave it.</p>
 ${delInv.length||delEx.length?`<h2 class="sec">Recently deleted</h2><div class="card">${delInv.map(i=>`<div class="tg"><span>${esc(i.number)} \u00b7 $${money(totals(i).total)}</span><button class="link" onclick="restore('${i.id}')">Restore</button></div>`).join('')}${delEx.map(x=>`<div class="tg"><span>Expense: ${esc(x.supplier||x.category)} \u00b7 $${money(x.amount)}</span><button class="link" onclick="restoreExp('${x.id}')">Restore</button></div>`).join('')}</div>`:''}`;
 app.innerHTML=`<div class="wrap"><div class="top"><h1>Settings</h1><button class="link mlock" onclick="lock()">Lock</button></div><div class="sgrid"><div>${left}</div><div>${right}</div></div></div>`}
function renderLog(){app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="go('settings')">\u2039 Settings</button><b>Activity log</b><span style="width:60px"></span></div>
 <div class="card" style="margin-top:12px">${S.log.map(l=>`<div class="hist"><span class="mu small">${new Date(l.ts).toLocaleString('en-AU')}</span><br>${esc(l.text)}</div>`).join('')||'<div class="empty">No activity yet.</div>'}</div></div>`}
