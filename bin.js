'use strict';
/* ===== Easier delete + Recently deleted (30 days, like Photos) ===== */
const BIN_DAYS=30;let BSEL=null;
(function(){const st=document.createElement('style');st.textContent=`.bgrid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:12px}
.btile{background:#fff;border-radius:14px;box-shadow:var(--sh);overflow:hidden;cursor:pointer;border:2px solid transparent;transition:border-color .15s}.btile.on{border-color:var(--ac)}
.bth{position:relative;aspect-ratio:4/3;background:var(--acs);display:flex;align-items:center;justify-content:center;color:var(--ac);font-size:11px;font-weight:800;letter-spacing:.08em}
.bth img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:.85}
.bth em{position:absolute;right:8px;bottom:8px;font-style:normal;background:rgba(0,0,0,.62);color:#fff;border-radius:99px;padding:2px 8px;font-size:11px;letter-spacing:0;font-weight:700}
.bchk{position:absolute;left:8px;top:8px;width:24px;height:24px;border-radius:50%;background:#fff;border:2px solid var(--ac);display:flex;align-items:center;justify-content:center;font-style:normal;color:#fff;font-size:14px;z-index:1}
.btile.on .bchk{background:var(--ac)}.bin-i{padding:10px 12px}.bin-i b{display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}`;document.head.appendChild(st)})();
const supList=()=>S.super||[];
const daysLeft=at=>Math.max(0,BIN_DAYS-Math.floor((Date.now()-at)/864e5));

/* One-step delete. Locked records still need a reason (same protection as before). */
del=async function(id){const i=find(id);if(!i)return;
 const pxOpen=typeof PX!=='undefined'&&PX&&PX.id===id,unlocked=(E&&E.id===id&&!E.locked)||(pxOpen&&!PX.locked);let reason=null;
 if(i.locked&&!unlocked){reason=await askText('Delete a locked record?',`${i.number} is ${i.status==='paid'?'paid':i.status}, so it's locked. Type a short reason to delete it. It moves to Recently deleted for ${BIN_DAYS} days.`);
  if(reason==null)return render();if(!reason.trim()){toast('A reason is needed to delete a locked record');return render()}}
 else if(!await ask('Delete?',`${esc(i.number)} moves to Recently deleted. You can restore it for ${BIN_DAYS} days.`,'Delete',true))return render();
 const why=(reason||unlockReason||(pxOpen&&PX._reason)||'').trim();i.deleted=Date.now();if(why)i.delReason=why;
 addLog(`${i.number} deleted${why?' (reason: '+why+')':''}`);unlockReason=null;E=null;editFrom=null;if(pxOpen){PX=null;PXFROM=null}
 await save();toast('Moved to Recently deleted');go('list')};
const _renderEditB=renderEdit;
renderEdit=function(){_renderEditB();if(E&&E.locked&&editFrom){const s=document.querySelector('.side .stack');if(s)s.insertAdjacentHTML('beforeend',`<button class="btn dan full" onclick="del('${editFrom}')">Delete invoice</button>`)}};
VIEWS.edit=renderEdit;

/* Bin contents */
function binItems(){const out=[];
 S.invoices.forEach(i=>{if(i.deleted)out.push({k:'inv:'+i.id,kind:'inv',title:`${i.number} \u00b7 ${client(i).name}`,sub:(i.imported?'Past income':'Invoice')+(i.delReason?' \u00b7 '+i.delReason:''),amt:totals(i).total,at:i.deleted,thumb:null,label:'INVOICE'})});
 (S.expenses||[]).forEach(x=>{if(x.deleted)out.push({k:'exp:'+x.id,kind:'exp',title:x.supplier||x.category,sub:'Expense \u00b7 '+x.category,amt:+x.amount||0,at:x.deleted,thumb:(x.receipts||[])[0]||null,label:'EXPENSE'})});
 supList().forEach(c=>{if(c.deleted)out.push({k:'sup:'+c.id,kind:'sup',title:c.fund||'Super contribution',sub:'Super contribution',amt:+c.amount||0,at:c.deleted,thumb:null,label:'SUPER'})});
 return out.sort((a,b)=>b.at-a.at)}
function binRestoreOne(k){const[kind,id]=k.split(':');
 if(kind==='inv'){const i=find(id);if(!i)return;delete i.deleted;delete i.delReason;if(live().some(x=>x.number===i.number&&x.id!==i.id))i.number=nextNumber(i.date,i.id);addLog(`${i.number} restored`)}
 else if(kind==='exp'){const x=findExp(id);if(x){delete x.deleted;addLog('Expense restored')}}
 else{const c=supList().find(c=>c.id===id);if(c){delete c.deleted;if(typeof syncSuper==='function')syncSuper(fy(c.date));addLog('Super contribution restored')}}}
function binPurgeOne(k){const[kind,id]=k.split(':');
 if(kind==='inv'){const i=find(id);if(!i)return;if(i.file)fdel(i.file).catch(()=>{});S.invoices=S.invoices.filter(x=>x.id!==id);addLog(`${i.number} deleted forever`)}
 else if(kind==='exp'){const x=findExp(id);if(!x)return;(x.receipts||[]).forEach(f=>fdel(f).catch(()=>{}));S.expenses=S.expenses.filter(e=>e.id!==id);addLog('Expense deleted forever')}
 else{S.super=supList().filter(c=>c.id!==id);addLog('Super contribution deleted forever')}}
function purgeOld(){const cut=Date.now()-BIN_DAYS*864e5,old=binItems().filter(it=>it.at<cut);old.forEach(it=>binPurgeOne(it.k));
 if(old.length)addLog(`${old.length} item${old.length>1?'s':''} removed for good after ${BIN_DAYS} days`)}
const _openWithB=openWith;
openWith=async function(raw){await _openWithB(raw);purgeOld()};

/* Recently deleted page */
function renderBin(){const items=binItems(),sel=BSEL;
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="BSEL=null;go('settings')">\u2039 Settings</button><b>Recently deleted</b>${items.length?`<button class="link" onclick="BSEL=BSEL?null:new Set();renderBin()">${sel?'Cancel':'Select'}</button>`:'<span style="width:50px"></span>'}</div>
 <p class="mu small" style="margin:6px 4px 16px">Items are kept for ${BIN_DAYS} days, then removed for good. Tap one to restore it or delete it now.</p>
 ${items.length?`<div class="bgrid">${items.map(it=>{const on=sel&&sel.has(it.k);return `<div class="btile ${on?'on':''}" onclick="${sel?`binToggle('${it.k}')`:`binOpen('${it.k}')`}"><div class="bth" ${it.thumb?`data-f="${it.thumb}"`:''}><span>${it.label}</span>${sel?`<i class="bchk">${on?'\u2713':''}</i>`:''}<em>${daysLeft(it.at)} day${daysLeft(it.at)===1?'':'s'}</em></div><div class="bin-i"><b>${esc(it.title)}</b><div class="mu small" style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(it.sub)}</div><div style="font-weight:700;margin-top:3px">$${money(it.amt)}</div></div></div>`}).join('')}</div>
 <div class="mbtns" style="justify-content:center;margin-top:24px">${sel?`<button class="btn sec" ${sel.size?'':'disabled'} onclick="binBulk('restore')">Restore${sel.size?' '+sel.size:''}</button><button class="btn dan" ${sel.size?'':'disabled'} onclick="binBulk('delete')">Delete${sel.size?' '+sel.size:''} forever</button>`
 :'<button class="btn sec" onclick="binAll(\'restore\')">Restore all</button><button class="btn dan" onclick="binAll(\'delete\')">Delete all forever</button>'}</div>`
 :'<div class="empty">Nothing here.<br>Deleted invoices, expenses and super contributions stay here for 30 days.</div>'}</div>`;
 loadBinThumbs()}
async function loadBinThumbs(){for(const el of document.querySelectorAll('.bth[data-f]')){try{const b=await loadFile(el.dataset.f);if(b&&b.type.startsWith('image/')){const img=document.createElement('img');img.src=URL.createObjectURL(b);el.prepend(img)}}catch(e){}}}
function binToggle(k){BSEL.has(k)?BSEL.delete(k):BSEL.add(k);renderBin()}
function binOpen(k){const it=binItems().find(x=>x.k===k);if(!it)return;
 modal(`<h3>${esc(it.title)}</h3><p class="mu" style="margin:0">${esc(it.sub)}</p><p style="font-size:22px;font-weight:700;margin:12px 0 4px">$${money(it.amt)}</p><p class="mu small">Deleted ${new Date(it.at).toLocaleDateString('en-AU',{day:'numeric',month:'short',year:'numeric'})}. Removed for good in ${daysLeft(it.at)} days.</p>
 <div class="mbtns col"><button class="btn" onclick="binRestore('${k}')">Restore</button><button class="btn dan" onclick="binDelete('${k}')">Delete forever</button><button class="btn ghost" onclick="closeModal()">Close</button></div>`)}
async function binRestore(k){closeModal();binRestoreOne(k);await save();toast('Restored');renderBin()}
async function binDelete(k){closeModal();if(!await ask('Delete forever?','This cannot be undone, and any saved receipt or PDF is removed too.','Delete forever',true))return;binPurgeOne(k);await save();toast('Deleted forever');renderBin()}
async function binBulk(action){const ks=[...BSEL];if(!ks.length)return;
 if(action==='delete'&&!await ask('Delete forever?',`${ks.length} item${ks.length>1?'s':''} will be removed for good. This cannot be undone.`,'Delete forever',true))return;
 ks.forEach(k=>action==='restore'?binRestoreOne(k):binPurgeOne(k));BSEL=null;await save();toast(action==='restore'?'Restored':'Deleted forever');renderBin()}
async function binAll(action){const ks=binItems().map(i=>i.k);
 if(!await ask(action==='restore'?'Restore all?':'Delete all forever?',action==='restore'?`${ks.length} items will go back where they were.`:`${ks.length} items will be removed for good. This cannot be undone.`,action==='restore'?'Restore all':'Delete all forever',action!=='restore'))return;
 ks.forEach(k=>action==='restore'?binRestoreOne(k):binPurgeOne(k));await save();toast(action==='restore'?'All restored':'Bin emptied');renderBin()}

/* Links from Settings and the Invoices page */
const _renderSettingsB=renderSettings;
renderSettings=function(){_renderSettingsB();document.querySelectorAll('h2.sec').forEach(h=>{if(h.textContent.trim()==='Recently deleted'){const n=h.nextElementSibling;if(n)n.remove();h.remove()}});
 const n=binItems().length,col=document.querySelector('.sgrid > div:last-child');
 if(col)col.insertAdjacentHTML('beforeend',`<h2 class="sec">Recently deleted</h2><div class="card"><div class="tg" style="border:0;cursor:pointer" onclick="BSEL=null;go('bin')"><span style="font-weight:600">Recently deleted</span><span class="mu">${n} item${n===1?'':'s'} \u203a</span></div></div>`)};
const _renderListB=renderList;
renderList=function(){_renderListB();const n=binItems().length,w=document.querySelector('.wrap');if(n&&w)w.insertAdjacentHTML('beforeend',`<div style="text-align:center;margin-top:8px"><button class="link" onclick="BSEL=null;go('bin')">Recently deleted (${n})</button></div>`)};
Object.assign(VIEWS,{settings:renderSettings,list:renderList,bin:renderBin});
NAV.find(n=>n[0]==='settings')[3].push('bin');
const _lockB=lock;lock=function(){BSEL=null;if(typeof PX!=='undefined'){PX=null;PXFROM=null;PQ=[]}_lockB()};
