'use strict';
/* ===== Past income & expenses: import invoice PDFs or enter by hand ===== */
let PX=null,PXFROM=null,PQ=[];
const isLump=i=>!!i&&i.lump!=null;

/* Amount-only records work everywhere (totals, tax, dashboard, Excel) */
const _totalsH=totals;
totals=function(i){if(!isLump(i))return _totalsH(i);const sub=round2(i.lump),gst=round2(+i.gstAmt||0);return{hours:+i.hours||0,sub,gst,total:round2(sub+gst)}};

/* Professional layout for past records (screen) */
const _invHTMLH=invHTML;
invHTML=function(i){if(!isLump(i))return _invHTMLH(i);const st=from(i),c=client(i),t=totals(i);
 const notes=[i.status==='paid'&&i.paidDate?`Paid on ${fmtD(i.paidDate)}.`:'',!i.gst&&st.showGstNote?'No GST has been charged. The supplier is not registered for GST.':''].filter(Boolean);
 return `<div class="paper"><div class="ih"><div class="biz"><b>${esc(st.name)}</b><div>${[st.abn&&'ABN '+st.abn,st.address,st.phone,st.email].filter(Boolean).map(esc).join('<br>')}</div></div>
 <div class="ttl"><div class="h">${i.gst?'TAX INVOICE':'INVOICE'}</div><table class="meta"><tr><td>Invoice No.</td><td>${esc(i.number)}</td></tr><tr><td>Date</td><td>${fmtD(i.date)}</td></tr><tr><td>Pay period</td><td>${period(i)}</td></tr></table></div></div>
 <div class="ib"><div class="bt"><div class="cap">Bill to</div><b>${esc(c.name)}</b><div>${[c.abn&&'ABN '+c.abn,c.address].filter(Boolean).map(esc).join('<br>')}</div></div>
 <div class="due"><div class="cap" style="color:var(--ac)">${i.status==='paid'?'Amount paid':'Amount due'}</div><b>$${money(t.total)}</b></div></div>
 <table class="ht" style="margin-top:26px"><tr><th>Description</th><th>Period</th>${t.hours?'<th class="n">Hours</th>':''}<th class="n">Amount</th></tr>
 <tr><td>${esc(i.service||st.service)}</td><td>${period(i)}</td>${t.hours?`<td class="n">${t.hours}</td>`:''}<td class="n">$${money(t.sub)}</td></tr></table>
 <div class="tt"><div><span class="mu">Subtotal</span><span>$${money(t.sub)}</span></div><div><span class="mu">GST</span><span>$${money(t.gst)}</span></div><div class="g"><span>Total</span><span>$${money(t.total)}</span></div></div>
 <div class="pay"><div class="cap">Payment details</div><div class="pg"><span>Bank</span><b>${esc(st.bank)}</b><span>Account name</span><b>${esc(st.accName)}</b><span>BSB</span><b>${esc(st.bsb)}</b><span>Account no.</span><b>${esc(st.accNo)}</b><span>Reference</span><b>${esc(i.number)}</b></div></div>
 ${notes.length?`<div class="fn">${notes.join('<br>')}</div>`:''}</div>`};

/* Professional layout for past records (PDF) */
const _buildPDFH=buildPDF;
buildPDF=function(i){if(!isLump(i))return _buildPDFH(i);const{jsPDF}=window.jspdf,doc=new jsPDF({unit:'mm',format:'a4'}),st=from(i),c=client(i),t=totals(i),A=hexRgb(accHex()),G=[107,114,128],L=18,R=192;
 doc.setFillColor(...A);doc.rect(0,0,210,5,'F');let y=22;
 doc.setFont('helvetica','bold');doc.setFontSize(16);doc.setTextColor(22);doc.text(st.name||'',L,y);
 const lines=[st.abn&&'ABN '+st.abn,st.address,st.phone,st.email].filter(Boolean);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);lines.forEach((l,k)=>doc.text(String(l),L,y+6+k*4.6));
 doc.setFont('helvetica','bold');doc.setFontSize(24);doc.setTextColor(...A);doc.text(i.gst?'TAX INVOICE':'INVOICE',R,y+1,{align:'right'});
 const meta=[['Invoice No.',i.number],['Date',fmtD(i.date)],['Pay period',period(i)]];doc.setFontSize(9);
 meta.forEach((m,k)=>{const yy=y+9+k*5;doc.setFont('helvetica','normal');doc.setTextColor(...G);doc.text(m[0],R-66,yy);doc.setFont('helvetica','bold');doc.setTextColor(22);doc.text(String(m[1]),R,yy,{align:'right'})});
 y=Math.max(y+6+lines.length*4.6,y+9+meta.length*5)+6;doc.setDrawColor(230,232,236);doc.setLineWidth(.3);doc.line(L,y,R,y);y+=9;
 doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...G);doc.text('BILL TO',L,y);doc.setFontSize(12);doc.setTextColor(22);doc.text(c.name||'',L,y+6);
 doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);[c.abn&&'ABN '+c.abn,c.address].filter(Boolean).forEach((l,k)=>doc.text(String(l),L,y+11+k*4.6));
 doc.setFillColor(...soft(A));doc.roundedRect(R-64,y-5,64,21,2.5,2.5,'F');doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...A);
 doc.text(i.status==='paid'?'AMOUNT PAID':'AMOUNT DUE',R-59,y+1);doc.setFontSize(18);doc.text('$'+money(t.total),R-59,y+10);y+=26;
 const head=['DESCRIPTION','PERIOD',...(t.hours?['HOURS']:[]),'AMOUNT'],row=[i.service||st.service,period(i),...(t.hours?[String(t.hours)]:[]),'$'+money(t.sub)],n=head.length,firstNum=t.hours?n-2:n-1;
 doc.autoTable({startY:y,margin:{left:L,right:210-R},theme:'plain',styles:{fontSize:9.5,cellPadding:{top:3,bottom:3,left:2.5,right:2.5},textColor:30,lineColor:[230,232,236],lineWidth:{bottom:.2}},headStyles:{fillColor:A,textColor:255,fontStyle:'bold',fontSize:8},head:[head],body:[row],
  didParseCell:d=>{if(d.column.index>=firstNum)d.cell.styles.halign='right'}});
 y=doc.lastAutoTable.finalY+10;const tx=R-72,rowT=(l,v)=>{doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...G);doc.text(l,tx+4,y);doc.setTextColor(30);doc.text(v,R-4,y,{align:'right'});y+=6};
 rowT('Subtotal','$'+money(t.sub));rowT('GST','$'+money(t.gst));
 doc.setFillColor(...A);doc.roundedRect(tx,y-3,72,11,2,2,'F');doc.setFont('helvetica','bold');doc.setFontSize(11.5);doc.setTextColor(255);doc.text('Total',tx+4,y+4.3);doc.text('$'+money(t.total),R-4,y+4.3,{align:'right'});y+=20;
 doc.setDrawColor(230,232,236);doc.line(L,y-6,R,y-6);doc.setFont('helvetica','bold');doc.setFontSize(8);doc.setTextColor(...G);doc.text('PAYMENT DETAILS',L,y);y+=6;
 [['Bank',st.bank],['Account name',st.accName],['BSB',st.bsb],['Account no.',st.accNo],['Reference',i.number]].forEach(p=>{doc.setFont('helvetica','normal');doc.setFontSize(9.5);doc.setTextColor(...G);doc.text(p[0],L,y);doc.setFont('helvetica','bold');doc.setTextColor(22);doc.text(String(p[1]||''),L+34,y);y+=5.2});
 y+=5;doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(...G);
 if(i.status==='paid'&&i.paidDate){doc.text('Paid on '+fmtD(i.paidDate)+'.',L,y);y+=5}
 if(!i.gst&&st.showGstNote)doc.text('No GST has been charged. The supplier is not registered for GST.',L,y);
 return doc};

/* Open past records in their own editor */
const _editInvH=editInv;
editInv=function(id){const i=find(id);if(isLump(i))return openPast(id);_editInvH(id)};
const _renderViewH=renderView;
renderView=function(){_renderViewH();const i=VI;if(!isLump(i))return;const top=document.querySelector('.wrap .top');if(!top)return;
 if(PX&&VI===PX){top.querySelector('.link').setAttribute('onclick',"go('pastEdit')");const r=top.querySelector('div');if(r)r.innerHTML='<button class="btn sm" onclick="sharePDF(VI)">PDF</button>'}
 else if(i.file)top.insertAdjacentHTML('afterend',`<div class="banner info" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>Past record. The original PDF is saved.</span><button class="btn sm sec" onclick="viewFile('${i.file}')">Open original</button></div>`)};
VIEWS.view=renderView;

/* Read text from PDFs (runs on this device) */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
async function pdfLib(){if(!window.pdfjsLib){await loadScript(PDFJS+'pdf.min.js');const w=await (await fetch(PDFJS+'pdf.worker.min.js')).text();pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'text/javascript'}))}return pdfjsLib}
async function pdfText(blob){const L=await pdfLib(),pdf=await L.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise;let out='';
 for(let p=1;p<=Math.min(pdf.numPages,5);p++){const tc=await (await pdf.getPage(p)).getTextContent();let line='',lastY=null;
  for(const it of tc.items){const y=it.transform[5];if(lastY!==null&&Math.abs(y-lastY)>2){out+=line.trim()+'\n';line=''}line+=it.str+' ';lastY=y}out+=line.trim()+'\n'}
 return out}
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function okDate(y,m,d){if(m<1||m>12||d<1||d>31||y<2000||y>2100)return null;return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function pDate(s){if(!s)return null;let m=s.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);if(m)return okDate(+m[3]<100?2000+(+m[3]):+m[3],+m[2],+m[1]);
 m=s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);if(m&&MON[m[2].slice(0,3).toLowerCase()])return okDate(+m[3],MON[m[2].slice(0,3).toLowerCase()],+m[1]);return null}
function parseInvoice(t){const r={},flat=t.replace(/\s+/g,' ');let m;
 m=flat.match(/\b(INV[-\s]?[A-Z0-9][A-Z0-9-]*)/i)||flat.match(/invoice\s*(?:no\.?|number|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i);if(m)r.number=m[1].replace(/\s/g,'').toUpperCase();
 m=flat.match(/(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?)\s*(?:-|\u2013|to)\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
 if(m){r.end=pDate(m[2]);const yr=m[2].match(/\d{4}/)[0];r.start=pDate(/\d{4}/.test(m[1])?m[1]:m[1]+' '+yr)}
 m=flat.match(/date\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4})/i);r.date=m?pDate(m[1]):(r.end||pDate(flat));
 const due=[...flat.matchAll(/(?:total\s*due|amount\s*due|balance\s*due|amount\s*paid|total)\s*:?\s*\$?\s*([\d,]+\.\d{2})/gi)].map(x=>+x[1].replace(/,/g,''));
 const all=[...flat.matchAll(/\$\s*([\d,]+\.\d{2})/g)].map(x=>+x[1].replace(/,/g,''));r.total=due.length?Math.max(...due):(all.length?Math.max(...all):null);
 m=flat.match(/\bGST\b[^0-9$]{0,20}\$?\s*([\d,]+\.\d{2})/i);r.gst=m?+m[1].replace(/,/g,''):0;
 m=flat.match(/total\s*hours?\s*:?\s*(\d{1,3}(?:\.\d+)?)/i)||flat.match(/\btotal\s+(\d{1,3}\.\d)\s+\$?[\d,]+\.\d{2}/i);r.hours=m?+m[1]:null;
 const c=S.clients.find(c=>c.name&&flat.toLowerCase().includes(c.name.toLowerCase()));if(c)r.clientId=c.id;else{m=t.match(/bill\s*to[^\n]*\n\s*([^\n]{3,60})/i);if(m){r.clientId='__new';r.clientName=m[1].trim()}}
 return r}

/* Past records page */
function pastBase(p={}){const st=S.settings,date=p.date||p.end||today(),gst=+p.gst||0,total=+p.total||0;
 return{id:uid(),imported:true,number:p.number||'',date,weekStart:p.start||monday(addDays(date,-6)),clientId:p.clientId||((S.clients[0]||{}).id||'__new'),_clientName:p.clientName||'',
  lump:round2(Math.max(0,total-gst)),gstAmt:gst,gst:gst>0,hours:p.hours||'',service:st.service||'Subcontract Electrical Service',status:'paid',paidDate:date,locked:false,days:[],history:[],created:Date.now(),file:null}}
function renderPast(){const list=live().filter(isLump).sort((a,b)=>b.date.localeCompare(a.date)),byFy={};list.forEach(i=>(byFy[fy(i.date)]=byFy[fy(i.date)]||[]).push(i));
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="go('list')">\u2039 Invoices</button><b>Past records</b><span style="width:70px"></span></div>
 <p class="mu" style="margin:6px 4px 0">Add income and expenses from before you used this app, so your totals, tax estimate and Excel reports are complete.</p>
 <div class="sgrid"><div><h2 class="sec">Past income</h2><div class="card pad"><p class="mu small" style="margin-top:0">Upload old invoice PDFs (you can pick several). The app reads each one and fills in the details for you to check. A copy of each PDF is saved with its record.</p>
 <div class="stack"><button class="btn full" onclick="pickPastPDFs()">Upload invoice PDFs</button><button class="btn sec full" onclick="newPast()">Enter income by hand</button></div></div></div>
 <div><h2 class="sec">Past expenses</h2><div class="card pad"><p class="mu small" style="margin-top:0">Add each expense with its date and a photo or PDF of the receipt. Auto-fill can read both.</p><button class="btn sec full" onclick="newExp()">Add a past expense</button></div></div></div>
 ${Object.keys(byFy).sort((a,b)=>b-a).map(y=>`<div class="mhead"><span class="cap">${fyLabel(+y)} \u00b7 past income</span><span class="cap">$${money(byFy[y].reduce((a,i)=>a+totals(i).total,0))}</span></div><div class="card">${byFy[y].map(i=>`<div class="rc" style="border-bottom:1px solid var(--ln)" onclick="openView('${i.id}')"><div class="av">${esc(initials(client(i).name))}</div><div class="grow"><b>${esc(client(i).name)}</b><div class="mu small">${esc(i.number)} \u00b7 ${fmtD(i.date)}${i.hours?` \u00b7 ${i.hours} h`:''}${i.file?' \u00b7 PDF saved':''}</div></div><div class="amt">$${money(totals(i).total)}<br><span class="pill ${stat(i)[1]}">${stat(i)[0]}</span></div></div>`).join('')}</div>`).join('')}</div>`}
function newPast(){PX=pastBase();PXFROM=null;go('pastEdit')}
function openPast(id){PX=clone(find(id));PXFROM=id;go('pastEdit')}
function pickPastPDFs(){const inp=document.createElement('input');inp.type='file';inp.accept='application/pdf';inp.multiple=true;inp.onchange=()=>{PQ=[...inp.files];if(PQ.length)nextPast()};inp.click()}
async function nextPast(){const f=PQ.shift();if(!f){toast('All PDFs done');return go('past')}
 toast(`Reading ${f.name}\u2026`);let p={};try{p=parseInvoice(await pdfText(f))}catch(e){p={}}
 const fid=await saveFile(f);PX=pastBase(p);Object.assign(PX,{file:fid,_newFile:fid,_read:!!p.total});PXFROM=null;go('pastEdit')}
async function skipPast(){if(PX&&PX._newFile&&!PXFROM)await fdel(PX._newFile).catch(()=>{});PX=null;PXFROM=null;if(PQ.length)return nextPast();go('past')}
function attachPastPDF(){const inp=document.createElement('input');inp.type='file';inp.accept='application/pdf';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;const id=await saveFile(f);PX.file=id;PX._newFile=id;renderPastEdit();toast('PDF attached')};inp.click()}
async function unlockPast(){const r=await askText('Unlock record','Why does this record need to change? This is saved in its history.');if(!r||!r.trim())return;PX._reason=r.trim();PX.locked=false;renderPastEdit()}
function renderPastEdit(){const p=PX,ro=!!p.locked,dis=ro?'disabled':'',t=totals(p),rate=t.hours?t.sub/t.hours:0,isNew=p.clientId==='__new'||!S.clients.length;
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="skipPast()">${PQ.length?'Skip':'Cancel'}</button><b>${PXFROM?esc(p.number):'Past income'}</b><button class="btn sm" onclick="savePast()" ${ro?'disabled':''}>Save</button></div>
 ${PQ.length?`<div class="banner info">${PQ.length} more PDF${PQ.length>1?'s':''} to check after this one.</div>`:''}
 ${p._newFile&&!PXFROM?(p._read?'<div class="banner info">Details were read from the PDF. Please check them before saving.</div>':'<div class="banner">This PDF couldn\'t be read automatically (it may be a scanned image). Please enter the details below. The PDF is still saved.</div>'):''}
 ${ro?'<div class="banner"><b>Locked.</b> This record is protected from accidental changes.<br><button class="btn sm sec" style="margin-top:8px" onclick="unlockPast()">Unlock to edit</button></div>':''}
 <div class="edgrid"><div><h2 class="sec">Details</h2><div class="card"><div class="fgrid two">
 <div class="fld"><label>Client</label><select class="inp" ${dis} onchange="PX.clientId=this.value;renderPastEdit()">${S.clients.map(c=>`<option value="${c.id}" ${c.id===p.clientId?'selected':''}>${esc(c.name)}</option>`).join('')}<option value="__new" ${isNew?'selected':''}>+ New client\u2026</option></select></div>
 ${isNew?`<div class="fld"><label>New client name</label><input class="inp" ${dis} value="${esc(p._clientName)}" placeholder="e.g. ARRI TRUST" onchange="PX._clientName=this.value"></div>`:''}
 <div class="fld"><label>Invoice no. (optional)</label><input class="inp" ${dis} value="${esc(p.number)}" placeholder="Leave blank to create one" onchange="PX.number=this.value.trim()"></div>
 <div class="fld"><label>Invoice date</label><input class="inp" type="date" ${dis} value="${p.date}" onchange="PX.date=this.value"></div>
 <div class="fld"><label>Work period starting</label><input class="inp" type="date" ${dis} value="${p.weekStart}" onchange="if(this.value){PX.weekStart=this.value;renderPastEdit()}"><div class="mu small" style="margin-top:4px">Covers ${period(p)}</div></div>
 <div class="fld" style="grid-column:1/-1"><label>Description</label><input class="inp" ${dis} value="${esc(p.service)}" onchange="PX.service=this.value"></div>
 <div class="fld"><label>Amount excl. GST ($)</label><input class="inp" type="number" step="0.01" inputmode="decimal" ${dis} value="${p.lump||''}" placeholder="0.00" onchange="PX.lump=this.valueAsNumber||0;renderPastEdit()"></div>
 <div class="fld"><label>GST charged ($)</label><input class="inp" type="number" step="0.01" inputmode="decimal" ${dis} value="${p.gstAmt||''}" placeholder="0" onchange="PX.gstAmt=this.valueAsNumber||0;PX.gst=PX.gstAmt>0;renderPastEdit()"></div>
 <div class="fld"><label>Hours (optional)</label><input class="inp" type="number" step="0.1" inputmode="decimal" ${dis} value="${p.hours||''}" placeholder="Not stated" onchange="PX.hours=this.valueAsNumber||'';renderPastEdit()"></div>
 <div class="fld"><label>Hourly rate</label><input class="inp" disabled value="${rate?'$'+money(rate):'\u2014'}"></div>
 <div class="fld"><label>Status</label><select class="inp" ${dis} onchange="PX.status=this.value;if(this.value==='paid'&&!PX.paidDate)PX.paidDate=PX.date;renderPastEdit()"><option value="paid" ${p.status==='paid'?'selected':''}>Paid</option><option value="sent" ${p.status!=='paid'?'selected':''}>Not paid yet</option></select></div>
 ${p.status==='paid'?`<div class="fld"><label>Paid on</label><input class="inp" type="date" ${dis} value="${p.paidDate||''}" onchange="PX.paidDate=this.value"></div>`:''}</div></div></div>
 <div class="side"><h2 class="sec">Summary</h2><div class="card" style="padding:8px 0"><div class="tot"><span class="mu">Amount</span><span>$${money(t.sub)}</span></div><div class="tot"><span class="mu">GST</span><span>$${money(t.gst)}</span></div><div class="tot big"><span>Total</span><span>$${money(t.total)}</span></div></div>
 <h2 class="sec">Original PDF</h2><div class="card pad">${p.file?`<div class="stack"><button class="btn sec full" onclick="viewFile('${p.file}')">Open saved PDF</button>${ro?'':'<button class="btn ghost full" onclick="PX.file=null;renderPastEdit()">Remove PDF</button>'}</div>`:`<p class="mu small" style="margin-top:0">No PDF saved.</p>${ro?'':'<button class="btn sm sec" onclick="attachPastPDF()">Attach PDF</button>'}`}</div>
 <h2 class="sec">Actions</h2><div class="stack"><button class="btn sec full" onclick="VI=PX;E=null;go('view')">Preview</button>${PXFROM?`<button class="btn dan full" onclick="del('${PXFROM}')">Delete record</button>`:''}</div>
 ${p.history&&p.history.length?`<h2 class="sec">Change history</h2><div class="card">${p.history.slice().reverse().map(x=>`<div class="hist"><b>${new Date(x.ts).toLocaleString('en-AU')}</b>${x.reason?` \u00b7 Reason: ${esc(x.reason)}`:''}<br>${(x.changes||[]).map(esc).join('<br>')||'Saved'}</div>`).join('')}</div>`:''}</div></div></div>`}
function pastDiff(a,b){const c=[],f=(n,x,y)=>{if(String(x??'')!==String(y??''))c.push(`${n}: ${x||'\u2014'} \u2192 ${y||'\u2014'}`)};
 f('Number',a.number,b.number);f('Date',a.date,b.date);f('Period start',a.weekStart,b.weekStart);f('Amount',a.lump,b.lump);f('GST',a.gstAmt,b.gstAmt);f('Hours',a.hours,b.hours);f('Status',a.status,b.status);f('Paid on',a.paidDate,b.paidDate);f('Description',a.service,b.service);
 if(a.clientId!==b.clientId)c.push('Client changed');if(a.file!==b.file)c.push(b.file?'PDF replaced':'PDF removed');return c}
async function savePast(){const p=PX;
 if(p.clientId==='__new'||!S.clients.length){const n=(p._clientName||'').trim();if(!n)return toast('Enter the client name');
  let c=S.clients.find(c=>c.name.toLowerCase()===n.toLowerCase());if(!c){c={id:uid(),name:n,abn:'',address:'',email:''};S.clients.push(c);addLog('Client added: '+n)}p.clientId=c.id}
 if(!(+p.lump>0))return toast('Enter the amount');if(!p.date)return toast('Enter the invoice date');
 if(!p.number)p.number='PAST-'+p.date.replace(/-/g,'');
 if(live().some(x=>x.number===p.number&&x.id!==p.id)){if(!await ask('Possible duplicate',`${esc(p.number)} is already in your records. Save this as a separate record anyway?`,'Save anyway'))return;
  let k=2,n=p.number+'-2';while(live().some(x=>x.number===n))n=p.number+'-'+(++k);p.number=n}
 const reason=p._reason,old=PXFROM?find(PXFROM):null;['_newFile','_read','_clientName','_reason'].forEach(k=>delete p[k]);
 p.locked=true;snap(p);
 if(old){p.history=[...(old.history||[]),{ts:Date.now(),changes:pastDiff(old,p),reason}];if(old.file&&old.file!==p.file)fdel(old.file).catch(()=>{});Object.assign(old,clone(p));addLog(`${p.number} (past income) edited${reason?' (reason: '+reason+')':''}`)}
 else{p.history=[{ts:Date.now(),changes:['Added as past income']}];S.invoices.push(clone(p));addLog(`${p.number} past income added: $${money(totals(p).total)}`)}
 await save();curFY=fy(p.date);PX=null;PXFROM=null;toast('Saved');if(PQ.length)return nextPast();go('past')}

/* Auto-fill for PDF receipts in expenses */
const _readReceiptH=readReceipt;
readReceipt=async function(){let img=false,pdf=null;for(const id of X.receipts){const b=await loadFile(id);if(!b)continue;if(b.type.startsWith('image/')){img=true;break}if(!pdf&&b.type==='application/pdf')pdf=b}
 if(img||!pdf)return _readReceiptH();toast('Reading PDF\u2026');
 try{const p=parseReceipt(await pdfText(pdf));if(!X)return;const got=[];if(p.total){X.amount=p.total;got.push('amount')}if(p.date){X.date=p.date;got.push('date')}if(p.supplier&&!X.supplier){X.supplier=p.supplier;got.push('supplier')}
  renderExpEdit();toast(got.length?`Filled in ${got.join(', ')}. Please check.`:'Could not find details. Enter them by hand.')}catch(e){toast('Could not read that PDF')}};

/* Entry point on the Invoices page */
const _renderListH=renderList;
renderList=function(){_renderListH();const w=document.querySelector('.wrap');if(w)w.insertAdjacentHTML('beforeend','<div style="display:flex;justify-content:center;margin-top:18px"><button class="btn sm sec" onclick="go(\'past\')">+ Add past income or expenses</button></div>')};
Object.assign(VIEWS,{list:renderList,past:renderPast,pastEdit:renderPastEdit});
NAV[0][3].push('past','pastEdit');
