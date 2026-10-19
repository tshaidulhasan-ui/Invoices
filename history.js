'use strict';
/* ===== Past income & expenses: import invoice PDFs or enter by hand (v2) ===== */
let PX=null,PXFROM=null,PQ=[],PQN=0,VIEWORIG=true;const ORIG={};
const isLump=i=>!!i&&i.lump!=null;

/* Amount-only records work everywhere (totals, tax, dashboard, Excel) */
const _totalsH=totals;
totals=function(i){if(!isLump(i))return _totalsH(i);const sub=round2(i.lump),gst=round2(+i.gstAmt||0);return{hours:+i.hours||0,sub,gst,total:round2(sub+gst)}};

/* App layout for past records without a PDF (screen) */
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

/* App layout for past records without a PDF (PDF file) */
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
 const head=['DESCRIPTION','PERIOD',...(t.hours?['HOURS']:[]),'AMOUNT'],row=[i.service||st.service,period(i),...(t.hours?[String(t.hours)]:[]),'$'+money(t.sub)],firstNum=t.hours?head.length-2:head.length-1;
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

/* PDF reader (runs on this device; downloaded once, then saved for offline) */
const PDFJS='https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/';
let _pdfLibP=null;
function pdfLib(){if(window.pdfjsLib&&pdfjsLib.GlobalWorkerOptions.workerSrc)return Promise.resolve(pdfjsLib);
 if(!_pdfLibP)_pdfLibP=(async()=>{await loadScript(PDFJS+'pdf.min.js');const w=await (await fetch(PDFJS+'pdf.worker.min.js')).text();pdfjsLib.GlobalWorkerOptions.workerSrc=URL.createObjectURL(new Blob([w],{type:'text/javascript'}));return pdfjsLib})().catch(e=>{_pdfLibP=null;throw e});
 return _pdfLibP}
async function openPdf(blob){const L=await pdfLib();return L.getDocument({data:new Uint8Array(await blob.arrayBuffer())}).promise}
/* Rebuild lines the way they look on the page (fixes PDFs that store letters or words separately) */
async function pdfText(blob){const pdf=await openPdf(blob),lines=[];
 for(let p=1;p<=Math.min(pdf.numPages,4);p++){const tc=await (await pdf.getPage(p)).getTextContent(),rows=[];
  for(const it of tc.items){if(!it.str||!it.str.trim()&&!it.width)continue;const x=it.transform[4],y=it.transform[5],h=Math.abs(it.transform[3])||Math.abs(it.transform[0])||10;
   let r=rows.find(r=>Math.abs(r.y-y)<=h*.45);if(!r){r={y,items:[]};rows.push(r)}r.items.push({x,w:it.width||0,s:it.str,h})}
  rows.sort((a,b)=>b.y-a.y).forEach(r=>{r.items.sort((a,b)=>a.x-b.x);let s='',end=null;
   r.items.forEach(it=>{if(end!==null&&it.x-end>it.h*.22&&!/\s$/.test(s))s+=' ';s+=it.s;end=it.x+it.w});lines.push(s.replace(/\s+/g,' ').trim())})}
 return lines.filter(Boolean).join('\n')}
async function pdfOCR(blob){const pdf=await openPdf(blob),page=await pdf.getPage(1),vp=page.getViewport({scale:2.2}),cv=document.createElement('canvas');cv.width=vp.width;cv.height=vp.height;
 await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise;await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');return (await Tesseract.recognize(cv,'eng')).data.text||''}
async function readPDF(blob){let t='';try{t=await pdfText(blob)}catch(e){}
 if((t.match(/[A-Za-z]/g)||[]).length<25){toast('This PDF is a scan. Reading it with text recognition (up to 30 seconds)\u2026');try{t=await pdfOCR(blob)}catch(e){}}return t}

/* Find the details in the text */
const MON={jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12};
function okDate(y,m,d){if(m<1||m>12||d<1||d>31||y<2000||y>2100)return null;return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`}
function pDate(s){if(!s)return null;let m=s.match(/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/);if(m)return okDate(+m[3]<100?2000+(+m[3]):+m[3],+m[2],+m[1]);
 m=s.match(/\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/);if(m&&MON[m[2].slice(0,3).toLowerCase()])return okDate(+m[3],MON[m[2].slice(0,3).toLowerCase()],+m[1]);return null}
const moneyIn=s=>[...String(s).matchAll(/\$?\s?(\d{1,3}(?:,\d{3})+(?:\.\d{2})?|\d+\.\d{2})(?!\d)/g)].map(x=>+x[1].replace(/,/g,'')).filter(v=>v>0);
function parseInvoice(t){const r={},lines=t.split('\n').map(s=>s.trim()).filter(Boolean),flat=lines.join(' ');let m;
 const near=k=>{const v=moneyIn(lines[k]);return v.length?v:moneyIn(lines[k+1]||'')};
 /* invoice number */
 m=flat.match(/\b(INV[-\s]?[A-Z0-9][A-Z0-9-]*)/i)||flat.match(/invoice\s*(?:no\.?|number|#)\s*[:#]?\s*([A-Z0-9][A-Z0-9-]{2,})/i);if(m)r.number=m[1].replace(/\s/g,'').toUpperCase();
 /* pay period */
 m=flat.match(/(\d{1,2}\s+[A-Za-z]{3,9}(?:\s+\d{4})?)\s*(?:-|\u2013|to)\s*(\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/);
 if(m){r.end=pDate(m[2]);const yr=m[2].match(/\d{4}/)[0];r.start=pDate(/\d{4}/.test(m[1])?m[1]:m[1]+' '+yr)}
 /* invoice date */
 const dl=lines.find(l=>/\bdate\b/i.test(l)&&!/due\s*date/i.test(l)&&pDate(l));r.date=dl?pDate(dl):(r.end||pDate(flat));
 /* total */
 const strong=/(total\s*due|amount\s*due|balance\s*due|amount\s*paid|total\s*payable|grand\s*total|invoice\s*total|total\s*\(?aud\)?|total\s*inc)/i,weak=/\btotal\b/i,skip=/sub\s*-?\s*total|total\s*hours|\bgst\b|\btax\b/i;
 let cand=[];lines.forEach((l,k)=>{if(strong.test(l))cand.push(...near(k))});
 if(!cand.length)lines.forEach((l,k)=>{if(weak.test(l)&&!skip.test(l))cand.push(...near(k))});
 if(!cand.length)lines.forEach(l=>{if(!/\b(abn|bsb|account|phone|mobile|tel)\b/i.test(l))cand.push(...moneyIn(l))});
 r.total=cand.length?Math.max(...cand):null;
 /* GST */
 const gl=lines.find(l=>/\bgst\b/i.test(l)&&!/not registered|no gst|has been charged|incl|inc\./i.test(l)&&moneyIn(l).length);r.gst=gl?moneyIn(gl)[0]:0;if(r.total&&r.gst>=r.total)r.gst=0;
 /* hours */
 m=flat.match(/total\s*hours?\s*:?\s*(\d{1,3}(?:\.\d+)?)/i);if(m)r.hours=+m[1];
 else{const hl=lines.find(l=>/^total\b/i.test(l)&&/\b\d{1,3}\.\d\b(?!\d)/.test(l));if(hl){const h=hl.match(/\b(\d{1,3}\.\d)\b(?!\d)/);if(h&&+h[1]<=100)r.hours=+h[1]}}
 /* client */
 const c=S.clients.find(c=>c.name&&flat.toLowerCase().includes(c.name.toLowerCase()));if(c)r.clientId=c.id;
 else{const k=lines.findIndex(l=>/bill\s*to/i.test(l));if(k>=0&&lines[k+1]){r.clientId='__new';r.clientName=lines[k+1].slice(0,60)}}
 return r}

/* Show the original PDF pages */
async function renderOriginal(fileId,box){if(!box)return;try{const b=await loadFile(fileId);if(!b){box.innerHTML='<div class="empty">Original PDF not found.</div>';return}
 if(!/pdf/i.test(b.type)){box.innerHTML=`<img src="${URL.createObjectURL(b)}" style="width:100%;display:block;border-radius:12px;box-shadow:var(--sh)">`;return}
 const pdf=await openPdf(b);box.innerHTML='';const W=Math.min(box.clientWidth||800,900),dpr=Math.min(2,window.devicePixelRatio||1);
 for(let p=1;p<=Math.min(pdf.numPages,10);p++){const page=await pdf.getPage(p),v1=page.getViewport({scale:1}),vp=page.getViewport({scale:W/v1.width*dpr}),cv=document.createElement('canvas');
  cv.width=vp.width;cv.height=vp.height;cv.style.cssText='width:100%;display:block;background:#fff;border-radius:12px;box-shadow:var(--sh);margin-bottom:12px';box.appendChild(cv);
  await page.render({canvasContext:cv.getContext('2d'),viewport:vp}).promise}}
 catch(e){box.innerHTML=`<div class="empty">Couldn't show the original here. The PDF viewer needs internet the first time.<br><button class="btn sm sec" style="margin-top:10px" onclick="viewFile('${fileId}')">Open the PDF</button></div>`}}
function preloadOrig(i){if(i&&i.file&&!ORIG[i.id])loadFile(i.file).then(b=>{if(b)ORIG[i.id]=new File([b],`${i.number||'invoice'}.pdf`,{type:b.type||'application/pdf'})}).catch(()=>{})}

/* Viewing, sharing and emailing past records use the original when there is one */
const _editInvH=editInv;
editInv=function(id){const i=find(id);if(isLump(i))return openPast(id);_editInvH(id)};
const _renderViewH=renderView;
renderView=function(){_renderViewH();const i=VI;if(!isLump(i))return;const top=document.querySelector('.wrap .top');if(!top)return;const preview=PX&&VI===PX,r=top.querySelector('div');
 if(preview){top.querySelector('.link').setAttribute('onclick',"go('pastEdit')");if(r)r.innerHTML=''}
 else if(r&&i.file){const b=[...r.querySelectorAll('button')].find(x=>x.textContent.trim()==='PDF');if(b&&VIEWORIG)b.textContent='Share original'}
 if(i.file){preloadOrig(i);top.insertAdjacentHTML('afterend',`<div class="banner info" style="display:flex;justify-content:space-between;align-items:center;gap:10px"><span>${VIEWORIG?'Showing your original invoice.':'Showing the app version of this record.'}</span><button class="btn sm sec" style="flex:none" onclick="VIEWORIG=!VIEWORIG;renderView()">${VIEWORIG?'App version':'Show original'}</button></div>`);
  const paper=document.querySelector('.paper');if(VIEWORIG&&paper){paper.outerHTML='<div id="origpages" style="max-width:820px;margin:16px auto 0"><div class="empty">Loading original\u2026</div></div>';renderOriginal(i.file,$('#origpages'))}}};
VIEWS.view=renderView;
const _sharePDFH=sharePDF;
sharePDF=async function(i){if(isLump(i)&&i.file&&VIEWORIG){if(ORIG[i.id])return deliver(ORIG[i.id],'PDF downloaded');const b=await loadFile(i.file);
 if(b){ORIG[i.id]=new File([b],`${i.number||'invoice'}.pdf`,{type:b.type||'application/pdf'});return deliver(ORIG[i.id],'PDF downloaded')}}return _sharePDFH(i)};
const _pdfFileH=pdfFile;
pdfFile=function(i){if(isLump(i)&&i.file&&ORIG[i.id])return ORIG[i.id];return _pdfFileH(i)};
const _emailInvH=emailInv;
emailInv=function(id){_emailInvH(id);preloadOrig(id?find(id):E)};

/* Past records page */
function pastBase(p={}){const st=S.settings,date=p.date||p.end||today(),gst=+p.gst||0,total=+p.total||0;
 return{id:uid(),imported:true,number:p.number||'',date,weekStart:p.start||monday(addDays(date,-6)),clientId:p.clientId||((S.clients[0]||{}).id||'__new'),_clientName:p.clientName||'',
  lump:total?round2(Math.max(0,total-gst)):0,gstAmt:gst,gst:gst>0,hours:p.hours||'',service:st.service||'Subcontract Electrical Service',status:'paid',paidDate:date,locked:false,days:[],history:[],created:Date.now(),file:null}}
function renderPast(){pdfLib().catch(()=>{});const list=live().filter(isLump).sort((a,b)=>b.date.localeCompare(a.date)),byFy={};list.forEach(i=>(byFy[fy(i.date)]=byFy[fy(i.date)]||[]).push(i));
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="go('list')">\u2039 Invoices</button><b>Past records</b><span style="width:70px"></span></div>
 <p class="mu" style="margin:6px 4px 0">Add income and expenses from before you used this app, so your totals, tax estimate and Excel reports are complete.</p>
 <div class="sgrid"><div><h2 class="sec">Past income</h2><div class="card pad"><p class="mu small" style="margin-top:0">Upload old invoice PDFs (you can pick several). The app reads each one and fills in the details for you to check. The original PDF is saved and shown when you open the record.</p>
 <div class="stack"><button class="btn full" onclick="pickPastPDFs()">Upload invoice PDFs</button><button class="btn sec full" onclick="newPast()">Enter income by hand</button></div></div></div>
 <div><h2 class="sec">Past expenses</h2><div class="card pad"><p class="mu small" style="margin-top:0">Add each expense with its date and a photo or PDF of the receipt. Auto-fill can read both.</p><button class="btn sec full" onclick="newExp()">Add a past expense</button></div></div></div>
 ${Object.keys(byFy).sort((a,b)=>b-a).map(y=>`<div class="mhead"><span class="cap">${fyLabel(+y)} \u00b7 past income</span><span class="cap">$${money(byFy[y].reduce((a,i)=>a+totals(i).total,0))}</span></div><div class="card">${byFy[y].map(i=>`<div class="rc" style="border-bottom:1px solid var(--ln)" onclick="openView('${i.id}')"><div class="av">${esc(initials(client(i).name))}</div><div class="grow"><b>${esc(client(i).name)}</b><div class="mu small">${esc(i.number)} \u00b7 ${fmtD(i.date)}${i.hours?` \u00b7 ${i.hours} h`:''}${i.file?' \u00b7 original PDF':''}</div></div><div class="amt">$${money(totals(i).total)}<br><span class="pill ${stat(i)[1]}">${stat(i)[0]}</span></div></div>`).join('')}</div>`).join('')}</div>`}
function newPast(){PX=pastBase();PXFROM=null;go('pastEdit')}
function openPast(id){PX=clone(find(id));PXFROM=id;go('pastEdit')}
function pickPastPDFs(){const inp=document.createElement('input');inp.type='file';inp.accept='application/pdf';inp.multiple=true;inp.onchange=()=>{PQ=[...inp.files];PQN=PQ.length;if(PQ.length)nextPast()};inp.click()}
async function nextPast(){const f=PQ.shift();if(!f){toast('All PDFs done');return go('past')}
 const n=PQN-PQ.length;toast(PQN>1?`Reading ${n} of ${PQN}\u2026`:'Reading PDF\u2026');let text='',p={};
 try{text=await readPDF(f);p=parseInvoice(text)}catch(e){p={}}
 const fid=await saveFile(f);PX=pastBase(p);Object.assign(PX,{file:fid,_newFile:fid,_read:!!p.total,_text:text});PXFROM=null;go('pastEdit')}
async function skipPast(){if(PX&&PX._newFile&&!PXFROM)await fdel(PX._newFile).catch(()=>{});PX=null;PXFROM=null;if(PQ.length)return nextPast();go('past')}
function attachPastPDF(){const inp=document.createElement('input');inp.type='file';inp.accept='application/pdf';inp.onchange=async()=>{const f=inp.files[0];if(!f)return;const id=await saveFile(f);PX.file=id;PX._newFile=id;renderPastEdit();toast('PDF attached')};inp.click()}
async function unlockPast(){const r=await askText('Unlock record','Why does this record need to change? This is saved in its history.');if(!r||!r.trim())return;PX._reason=r.trim();PX.locked=false;renderPastEdit()}
function renderPastEdit(){const p=PX,ro=!!p.locked,dis=ro?'disabled':'',t=totals(p),rate=t.hours?t.sub/t.hours:0,isNew=p.clientId==='__new'||!S.clients.length,fresh=p._newFile&&!PXFROM;
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="skipPast()">${PQ.length?'Skip':'Cancel'}</button><b>${PXFROM?esc(p.number):'Past income'}</b><button class="btn sm" onclick="savePast()" ${ro?'disabled':''}>Save</button></div>
 ${PQ.length?`<div class="banner info">${PQ.length} more PDF${PQ.length>1?'s':''} to check after this one.</div>`:''}
 ${fresh?(p._read?'<div class="banner info">Details were read from the PDF. Please check them before saving.</div>':'<div class="banner">The amount couldn\'t be found automatically. Please enter it below. The PDF is still saved.</div>'):''}
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
 ${p.status==='paid'?`<div class="fld"><label>Paid on</label><input class="inp" type="date" ${dis} value="${p.paidDate||''}" onchange="PX.paidDate=this.value"></div>`:''}</div></div>
 ${p._text!=null?`<details style="margin-top:12px"><summary class="link" style="cursor:pointer">Show the text read from this PDF</summary><pre style="white-space:pre-wrap;font-size:12px;background:#fff;border-radius:10px;padding:12px;max-height:300px;overflow:auto;margin-top:8px">${esc((p._text||'(no text found)').slice(0,4000))}</pre></details>`:''}</div>
 <div class="side"><h2 class="sec">Summary</h2><div class="card" style="padding:8px 0"><div class="tot"><span class="mu">Amount</span><span>$${money(t.sub)}</span></div><div class="tot"><span class="mu">GST</span><span>$${money(t.gst)}</span></div><div class="tot big"><span>Total</span><span>$${money(t.total)}</span></div></div>
 <h2 class="sec">Original PDF</h2><div class="card pad">${p.file?`<div class="stack"><button class="btn sec full" onclick="VIEWORIG=true;VI=PX;E=null;go('view')">View original</button>${ro?'':'<button class="btn ghost full" onclick="PX.file=null;renderPastEdit()">Remove PDF</button>'}</div>`:`<p class="mu small" style="margin-top:0">No PDF saved.</p>${ro?'':'<button class="btn sm sec" onclick="attachPastPDF()">Attach PDF</button>'}`}</div>
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
 const reason=p._reason,old=PXFROM?find(PXFROM):null;['_newFile','_read','_clientName','_reason','_text'].forEach(k=>delete p[k]);
 p.locked=true;snap(p);
 if(old){p.history=[...(old.history||[]),{ts:Date.now(),changes:pastDiff(old,p),reason}];if(old.file&&old.file!==p.file)fdel(old.file).catch(()=>{});Object.assign(old,clone(p));addLog(`${p.number} (past income) edited${reason?' (reason: '+reason+')':''}`)}
 else{p.history=[{ts:Date.now(),changes:['Added as past income']}];S.invoices.push(clone(p));addLog(`${p.number} past income added: $${money(totals(p).total)}`)}
 await save();curFY=fy(p.date);PX=null;PXFROM=null;toast('Saved');if(PQ.length)return nextPast();go('past')}

/* Auto-fill for PDF receipts in expenses */
const _readReceiptH=readReceipt;
readReceipt=async function(){let img=false,pdf=null;for(const id of X.receipts){const b=await loadFile(id);if(!b)continue;if(b.type.startsWith('image/')){img=true;break}if(!pdf&&/pdf/i.test(b.type))pdf=b}
 if(img||!pdf)return _readReceiptH();toast('Reading PDF\u2026');
 try{const text=await readPDF(pdf),p=parseReceipt(text),inv=parseInvoice(text);if(!X)return;const got=[],amt=p.total||inv.total,dt=p.date||inv.date;
  if(amt){X.amount=amt;got.push('amount')}if(dt){X.date=dt;got.push('date')}if(p.supplier&&!X.supplier){X.supplier=p.supplier;got.push('supplier')}
  renderExpEdit();toast(got.length?`Filled in ${got.join(', ')}. Please check.`:'Could not find details. Enter them by hand.')}catch(e){toast('Could not read that PDF')}};

/* Entry point on the Invoices page */
const _renderListH=renderList;
renderList=function(){_renderListH();const w=document.querySelector('.wrap');if(w)w.insertAdjacentHTML('beforeend','<div style="display:flex;justify-content:center;margin-top:18px"><button class="btn sm sec" onclick="go(\'past\')">+ Add past income or expenses</button></div>')};
Object.assign(VIEWS,{list:renderList,past:renderPast,pastEdit:renderPastEdit});
NAV[0][3].push('past','pastEdit');
