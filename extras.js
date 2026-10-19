'use strict';
/* ===== Stage 4: Face ID, reminders, super tracker, offline label ===== */
(function(){const st=document.createElement('style');st.textContent=`.rem{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}.rem .x{background:none;border:0;font-size:20px;line-height:1;color:inherit;opacity:.55;cursor:pointer;padding:0 2px}.offline{position:fixed;top:calc(env(safe-area-inset-top) + 8px);left:50%;transform:translateX(-50%);background:#16181d;color:#fff;font-size:12.5px;font-weight:600;padding:6px 14px;border-radius:99px;z-index:40;white-space:nowrap}`;document.head.appendChild(st)})();

/* ----- Offline label ----- */
function netPill(){let p=document.getElementById('netpill');if(navigator.onLine){if(p)p.remove();return}
 if(!p){p=document.createElement('div');p.id='netpill';p.className='offline';p.textContent='Offline \u00b7 your records still work';document.body.appendChild(p)}}
addEventListener('online',netPill);addEventListener('offline',netPill);netPill();

/* ----- Face ID (passkey + PRF: Face ID unlocks the encryption key itself) ----- */
let BIO_TMP=null;
function prfFirst(cred){const r=cred&&cred.getClientExtensionResults?cred.getClientExtensionResults():null;return r&&r.prf&&r.prf.results&&r.prf.results.first}
async function bioGet(credId,salt){const cred=await navigator.credentials.get({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),allowCredentials:[{type:'public-key',id:credId}],userVerification:'required',timeout:60000,extensions:{prf:{eval:{first:salt}}}}});
 const o=prfFirst(cred);if(!o)throw new Error('noprf');return crypto.subtle.importKey('raw',o,'AES-GCM',false,['encrypt','decrypt'])}
async function storeBio(raw,credId,salt,key){const m=getMeta();m.bio={id:b64(credId),salt:b64(salt)};m.wBio=await aesEnc(key,raw);localStorage.setItem(K.meta,JSON.stringify(m));addLog('Face ID unlock turned on');await save();toast('Face ID unlock is on');render()}
function bioErr(e){if(e&&e.name==='NotAllowedError')return toast('Face ID was cancelled');toast(e&&e.message==='noprf'?'Face ID for web apps needs iOS 18 or later':'Could not set up Face ID')}
async function enableBio(){const pin=$('#bpin').value;if(!pin)return toast('Enter your PIN');
 if(!window.PublicKeyCredential)return toast('Face ID is not available here');
 let raw;try{const m=getMeta();raw=await aesDec(await deriveKey(pin,unb64(m.saltPin)),m.wPin)}catch(e){return toast('PIN is wrong')}
 try{const salt=crypto.getRandomValues(new Uint8Array(32));
  const cred=await navigator.credentials.create({publicKey:{challenge:crypto.getRandomValues(new Uint8Array(32)),rp:{name:'Invoices'},user:{id:crypto.getRandomValues(new Uint8Array(16)),name:'invoices',displayName:S.settings.name||'Invoices'},pubKeyCredParams:[{type:'public-key',alg:-7},{type:'public-key',alg:-257}],authenticatorSelection:{authenticatorAttachment:'platform',userVerification:'required',residentKey:'preferred'},timeout:60000,extensions:{prf:{eval:{first:salt}}}}});
  const ext=cred.getClientExtensionResults()||{};if(!ext.prf||!(ext.prf.enabled||ext.prf.results))throw new Error('noprf');
  const credId=new Uint8Array(cred.rawId),first=prfFirst(cred);
  if(first)return storeBio(raw,credId,salt,await crypto.subtle.importKey('raw',first,'AES-GCM',false,['encrypt','decrypt']));
  BIO_TMP={raw,credId,salt};modal(`<h3>One more step</h3><p class="mu">Confirm with Face ID to finish turning it on.</p><div class="mbtns"><button class="btn sec" onclick="BIO_TMP=null;closeModal()">Cancel</button><button class="btn" onclick="finishBio()">Confirm with Face ID</button></div>`)}
 catch(e){bioErr(e)}}
async function finishBio(){const t=BIO_TMP;BIO_TMP=null;closeModal();if(!t)return;try{await storeBio(t.raw,t.credId,t.salt,await bioGet(t.credId,t.salt))}catch(e){bioErr(e)}}
async function disableBio(){const m=getMeta();delete m.bio;delete m.wBio;localStorage.setItem(K.meta,JSON.stringify(m));addLog('Face ID unlock turned off');await save();toast('Face ID unlock is off');render()}
async function bioUnlock(){const er=$('#er'),m=getMeta();if(!m||!m.bio)return;er.textContent='Waiting for Face ID\u2026';
 try{const key=await bioGet(unb64(m.bio.id),unb64(m.bio.salt));const raw=await aesDec(key,m.wBio);await openWith(raw);okFails();addLog('Unlocked with Face ID');await save();go('list')}
 catch(e){er.textContent=e&&e.name==='NotAllowedError'?'Face ID cancelled. Use your PIN.':'Face ID did not work. Use your PIN.'}}
const _renderLock=renderLock;
renderLock=function(mode){_renderLock(mode);const m=localStorage.getItem(K.meta)?getMeta():null,pin=$('#pin');
 if(m&&m.bio&&m.wBio&&pin){const b=document.createElement('button');b.className='btn full';b.style.margin='4px 0 12px';b.textContent='Unlock with Face ID';b.onclick=bioUnlock;pin.parentNode.insertBefore(b,pin);setTimeout(()=>{if(document.activeElement===pin)pin.blur()},400)}};

/* ----- Reminders ----- */
function ensureReminderTpl(){if(S.settings.tplReminderAdded)return;S.settings.tplReminderAdded=true;
 if(!S.templates.some(t=>/reminder/i.test(t.name)))S.templates.push({name:'Payment reminder',subject:'Reminder: invoice {number} - {period}',body:'Hi {client},\n\nJust a friendly reminder that invoice {number} for {period}, totalling ${amount}, is still unpaid.\n\nPlease use {number} as the payment reference. Let me know if you have any questions.\n\nKind regards,\n{myname}\n{myphone}'});save()}
function emailRem(id){emailInv(id);const k=S.templates.findIndex(t=>/reminder/i.test(t.name));if(k>=0){$('#em_tp').value=k;loadTpl()}}
function newForWeek(wk){if(!S.settings.name||!S.clients.length)return startNew();E=newBase(wk);editFrom=null;unlockReason=null;go('edit')}
function reminders(){ensureReminderTpl();const s=S.settings,t=today(),dis=s.dismissed||{},ok=k=>!(dis[k]&&dis[k]>=t),out=[],od_days=+s.overdueDays||14;
 if(s.remOverdue!==false){const od=live().filter(i=>i.status==='sent'&&t>addDays(i.date,od_days));
  if(od.length){const k='od'+od.length+od[0].id.slice(0,6);if(ok(k))out.push({k,cls:'',html:`<b>${od.length} invoice${od.length>1?'s':''} unpaid for over ${od_days} days</b> ($${money(od.reduce((a,i)=>a+totals(i).total,0))}): ${od.slice(0,3).map(i=>esc(i.number)).join(', ')}${od.length>3?'\u2026':''}. <button class="link" style="padding:0" onclick="emailRem('${od[0].id}')">Send a reminder</button>`})}}
 if(s.remWeekly!==false&&S.clients.length){const js=D(t).getDay(),mi=(js+6)%7,rd=s.remDay==null?4:+s.remDay,wk=js===1?addDays(monday(t),-7):monday(t);
  if(js===1||mi>=rd){const inv=live().find(i=>i.weekStart===wk),k='wk'+wk;
   if(!(inv&&inv.status!=='draft')&&ok(k))out.push({k,cls:'info',html:inv?`<b>The invoice for the week of ${fmtD(wk)} is still a draft.</b> <button class="link" style="padding:0" onclick="editInv('${inv.id}')">Open ${esc(inv.number)}</button>`:`<b>No invoice yet for the week of ${fmtD(wk)}.</b> <button class="link" style="padding:0" onclick="newForWeek('${wk}')">Create it</button>`})}}
 const cur=fy(t),mo=D(t).getMonth();
 if(mo>=6&&mo<=9&&s.lastAgentExport!==cur-1&&(live().some(i=>fy(i.date)===cur-1)||liveExp().some(x=>fy(x.date)===cur-1))){const k='fy'+(cur-1);
  if(ok(k))out.push({k,cls:'info',html:`<b>New financial year.</b> Export ${fyLabel(cur-1)} for your tax agent. <button class="link" style="padding:0" onclick="exportAgent(${cur-1})">Download now</button>`})}
 const nr=liveExp().filter(x=>fy(x.date)===cur&&(!x.receipts||!x.receipts.length));
 if(nr.length){const k='nr'+nr.length;if(ok(k))out.push({k,cls:'',html:`<b>${nr.length} expense${nr.length>1?'s have':' has'} no receipt.</b> <button class="link" style="padding:0" onclick="go('expenses')">Add photos</button>`})}
 return out}
async function dismiss(k){const d=S.settings.dismissed=S.settings.dismissed||{};d[k]=addDays(today(),2);for(const key in d)if(d[key]<today())delete d[key];await save();render()}
const _renderList=renderList;
renderList=function(){_renderList();const r=reminders(),stats=document.querySelector('.wrap .stats');
 if(r.length&&stats)stats.insertAdjacentHTML('beforebegin',r.map(x=>`<div class="banner ${x.cls} rem"><div>${x.html}</div><button class="x" onclick="dismiss('${x.k}')" aria-label="Hide for now">\u00d7</button></div>`).join(''))};
VIEWS.list=renderList;
const _exportAgent=exportAgent;
exportAgent=async function(y){await _exportAgent(y);S.settings.lastAgentExport=y;await save()};
function addCalReminder(){const day=S.settings.remDay==null?4:+S.settings.remDay,d=new Date();d.setHours(16,0,0,0);
 while(((d.getDay()+6)%7)!==day||d<new Date())d.setDate(d.getDate()+1);
 const p=n=>String(n).padStart(2,'0'),start=`${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}T160000`,stamp=new Date().toISOString().replace(/[-:]/g,'').slice(0,15)+'Z';
 const ics=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Invoices app//EN','BEGIN:VEVENT',`UID:invoice-reminder-${uid()}@invoices`,`DTSTAMP:${stamp}`,`DTSTART:${start}`,'DURATION:PT15M',`RRULE:FREQ=WEEKLY;BYDAY=${['MO','TU','WE','TH','FR','SA','SU'][day]}`,"SUMMARY:Send this week's invoice","DESCRIPTION:Open the Invoices app and send this week's invoice.",'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY',"DESCRIPTION:Send this week's invoice",'END:VALARM','END:VEVENT','END:VCALENDAR'].join('\r\n');
 const f=new File([ics],'invoice-reminder.ics',{type:'text/calendar'});
 if(isPhone())location.href=URL.createObjectURL(f);else download(f);addLog('Calendar reminder created');save()}

/* ----- Settings additions ----- */
const T2=(k,l,h)=>`<div class="tg"><div><div style="font-weight:600">${l}</div><div class="mu small">${h}</div></div><label class="sw"><input type="checkbox" ${S.settings[k]!==false?'checked':''} onchange="setS('${k}',this.checked)"><span></span></label></div>`;
function extraSettingsHTML(){const m=getMeta(),on=!!(m&&m.bio&&m.wBio),s=S.settings,rd=s.remDay==null?4:+s.remDay;
 return `<h2 class="sec">Face ID</h2><div class="card">${on?`<div class="tg" style="border:0"><div><div style="font-weight:600">Face ID unlock is on</div><div class="mu small">Your PIN still works as a backup.</div></div><button class="btn sm dan" onclick="disableBio()">Turn off</button></div>`
 :`<div class="pad"><p class="mu small" style="margin-top:0">Unlock with your face instead of typing your PIN. Needs iOS 18 or later, opened from the home-screen icon.</p><input id="bpin" class="inp" type="password" inputmode="numeric" placeholder="Enter your PIN to turn on"><button class="btn sm" style="margin-top:10px" onclick="enableBio()">Turn on Face ID</button></div>`}</div>
 <h2 class="sec">Reminders</h2><div class="card">${T2('remWeekly','Weekly invoice reminder',"Shows on the Invoices page when the week's invoice hasn't been sent")}${T2('remOverdue','Overdue invoice alerts','When a sent invoice is still unpaid after the days below')}
 <div class="fgrid two" style="border-top:1px solid var(--ln)"><div class="fld"><label>Overdue after (days)</label><input class="inp" type="number" inputmode="numeric" value="${+s.overdueDays||14}" onchange="setS('overdueDays',this.valueAsNumber)"></div>
 <div class="fld"><label>Reminder day</label><select class="inp" onchange="setS('remDay',+this.value)">${DAYS.map((d,k)=>`<option value="${k}" ${rd===k?'selected':''}>${d}</option>`).join('')}</select></div></div>
 <div class="pad" style="border-top:1px solid var(--ln)"><p class="mu small" style="margin-top:0">Web apps can't send phone notifications on their own, but your Calendar can. This adds a weekly 4 pm reminder on your reminder day.</p><button class="btn sm sec" onclick="addCalReminder()">Add weekly reminder to Calendar</button></div></div>`}
const _renderSettings=renderSettings;
renderSettings=function(){_renderSettings();const col=document.querySelector('.sgrid > div:last-child');if(col)col.insertAdjacentHTML('afterbegin',extraSettingsHTML())};
VIEWS.settings=renderSettings;

/* ----- Super tracker ----- */
const SUPER_CAP={2025:30000,2026:32500};
const SUPT={personal:'Personal, claiming deduction',nodeduct:'Personal, not claiming',employer:'Employer (from a job)'};
const sup=()=>S.super||(S.super=[]);
function syncSuper(y){const P=taxProfile(y),list=sup().filter(c=>!c.deleted&&fy(c.date)===y);
 if(list.length||P.superFromTracker){P.superDed=round2(list.filter(c=>c.type==='personal').reduce((a,c)=>a+(+c.amount||0),0));P.superFromTracker=list.length>0}}
function renderSuper(){if(curFY==null)curFY=fy(today());const y=curFY,cap=ratesFor(y).superCap||SUPER_CAP[y]||32500;
 const list=sup().filter(c=>!c.deleted&&fy(c.date)===y).sort((a,b)=>b.date.localeCompare(a.date)),sum=f=>list.filter(f).reduce((a,c)=>a+(+c.amount||0),0);
 const claim=sum(c=>c.type==='personal'),emp=sum(c=>c.type==='employer'),nonc=sum(c=>c.type==='nodeduct'),used=claim+emp;
 const c=calcTax(y,'proj'),without=taxRun(c.net,c.R,Object.assign({},c.P,{superDed:0})).total,saved=Math.max(0,without-c.a.total),net=saved-claim*.15,noNoi=list.filter(x=>x.type==='personal'&&!x.noi);
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="go('tax')">\u2039 Tax</button><b>Super tracker</b>${fySelect()}</div>
 <div class="stats"><div class="stat"><div class="mu small">Claiming as deduction</div><b>$${money(claim)}</b></div>
 <div class="stat"><div class="mu small">Concessional cap left</div><b style="color:${used>cap?'var(--rd)':'inherit'}">$${money(cap-used)}</b><div class="mu small">Cap $${money(cap)}</div></div>
 <div class="stat"><div class="mu small">Income tax saved (est.)</div><b style="color:var(--gr)">$${money(saved)}</b></div>
 <div class="stat"><div class="mu small">After 15% tax in the fund</div><b>$${money(net)}</b></div></div>
 ${noNoi.length?'<div class="banner"><b>Notice of intent needed.</b> To claim personal contributions, send your fund a notice of intent to claim a deduction and get their acknowledgement before you lodge your tax return. Tick it off on each contribution once received.</div>':''}
 ${used>cap?'<div class="banner"><b>Over the concessional cap.</b> Extra tax may apply unless you have unused cap from earlier years. Check with your fund or tax agent.</div>':''}
 <h2 class="sec">Contributions in ${fyLabel(y)}</h2><div class="card">${list.length?list.map(x=>`<div class="rc" style="border-bottom:1px solid var(--ln)" onclick="editSuper('${x.id}')"><div class="av">SU</div><div class="grow"><b>${esc(x.fund||'Super fund')}</b><div class="mu small">${fmtD(x.date)} \u00b7 ${SUPT[x.type]||''}${x.type==='personal'?(x.noi?' \u00b7 notice acknowledged':' \u00b7 notice needed'):''}</div></div><div class="amt">$${money(x.amount)}</div></div>`).join(''):'<div class="empty">No contributions recorded yet.</div>'}</div>
 <p class="mu small" style="margin:12px 4px">Super isn't compulsory for sole traders, but personal contributions you claim reduce your taxable income, and the Tax page updates automatically. Employer super from a job counts towards the same cap.${nonc?` Contributions you don't claim ($${money(nonc)}) count towards the separate non-concessional cap.`:''} Estimate only.</p></div>
 <button class="btn fab" onclick="editSuper()">+ Add contribution</button>`}
function editSuper(id){const x=id?sup().find(c=>c.id===id):{date:today(),fund:(sup().filter(c=>!c.deleted).slice(-1)[0]||{}).fund||'',amount:'',type:'personal',noi:false,notes:''};
 modal(`<h3>${id?'Edit':'Add'} super contribution</h3><label class="lbl">Date paid</label><input id="sd" class="inp" type="date" value="${x.date}">
 <label class="lbl">Fund</label><input id="sf" class="inp" value="${esc(x.fund)}" placeholder="e.g. AustralianSuper"><label class="lbl">Amount ($)</label><input id="sa" class="inp" type="number" inputmode="decimal" step="0.01" value="${x.amount}">
 <label class="lbl">Type</label><select id="st" class="inp">${Object.entries(SUPT).map(([k,l])=>`<option value="${k}" ${x.type===k?'selected':''}>${l}</option>`).join('')}</select>
 <div class="tg" style="padding:14px 0 0;border:0"><div><div style="font-weight:600">Fund acknowledged my notice of intent</div><div class="mu small">Only needed when claiming a deduction</div></div><label class="sw"><input id="sn" type="checkbox" ${x.noi?'checked':''}><span></span></label></div>
 <label class="lbl">Notes</label><input id="so" class="inp" value="${esc(x.notes||'')}">
 <div class="mbtns">${id?`<button class="btn dan" onclick="delSuper('${id}')">Delete</button>`:''}<button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="saveSuper('${id||''}')">Save</button></div>`)}
async function saveSuper(id){const v={date:$('#sd').value,fund:$('#sf').value.trim(),amount:$('#sa').valueAsNumber||0,type:$('#st').value,noi:$('#sn').checked,notes:$('#so').value.trim()};
 if(!v.date||!(v.amount>0))return toast('Enter the date and amount');
 const old=id?sup().find(c=>c.id===id):null,oy=old?fy(old.date):null;if(old)Object.assign(old,v);else sup().push({id:uid(),...v});
 syncSuper(fy(v.date));if(oy!=null&&oy!==fy(v.date))syncSuper(oy);addLog(`Super contribution ${old?'updated':'added'}: $${money(v.amount)}`);await save();closeModal();curFY=fy(v.date);toast('Saved');render()}
async function delSuper(id){if(!await ask('Delete contribution?','This removes it from your super tracker and tax estimate.','Delete',true))return;const x=sup().find(c=>c.id===id);x.deleted=Date.now();syncSuper(fy(x.date));addLog('Super contribution deleted');await save();render()}
VIEWS.super=renderSuper;
NAV.find(n=>n[0]==='tax')[3].push('super');
const _renderTax=renderTax;
renderTax=function(){_renderTax();const y=curFY,list=sup().filter(c=>!c.deleted&&fy(c.date)===y),tot=list.reduce((a,c)=>a+(+c.amount||0),0),claim=list.filter(c=>c.type==='personal').reduce((a,c)=>a+(+c.amount||0),0),col=document.querySelector('.sgrid > div:last-child');
 if(col)col.insertAdjacentHTML('beforeend',`<h2 class="sec">Super</h2><div class="card pad"><div class="kv"><span class="mu">Contributed this year</span><b>$${money(tot)}</b></div><div class="kv"><span class="mu">Claiming as a deduction</span><b>$${money(claim)}</b></div><button class="btn sm sec" style="margin-top:10px" onclick="go('super')">Open super tracker</button></div>`)};
VIEWS.tax=renderTax;
