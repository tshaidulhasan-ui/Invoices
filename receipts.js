'use strict';
/* ===== Receipt reading rules: reads photos and PDFs and fills in expenses by itself. Future reading fixes go here. ===== */
const SUPPLIERS=[
 [/bunnings/i,'Bunnings','Tools and equipment'],[/total\s*tools/i,'Total Tools','Tools and equipment'],[/sydney\s*tools/i,'Sydney Tools','Tools and equipment'],[/mitre\s*10/i,'Mitre 10','Tools and equipment'],
 [/blackwoods/i,'Blackwoods','Tools and equipment'],[/kennards/i,'Kennards Hire','Tools and equipment'],[/coates\s*hire/i,'Coates Hire','Tools and equipment'],
 [/middy'?s/i,"Middy's",'Tools and equipment'],[/lawrence\s*(&|and)\s*hanson/i,'Lawrence & Hanson','Tools and equipment'],[/rexel/i,'Rexel','Tools and equipment'],[/\bcnw\b/i,'CNW Electrical','Tools and equipment'],
 [/haymans/i,'Haymans Electrical','Tools and equipment'],[/ideal\s*electrical/i,'Ideal Electrical','Tools and equipment'],[/\bmmem\b/i,'MMEM','Tools and equipment'],[/corporate\s*electrical/i,'Corporate Electrical','Tools and equipment'],
 [/officeworks/i,'Officeworks','Tools and equipment'],[/\brsea\b/i,'RSEA Safety','PPE and workwear'],[/hard\s*yakka/i,'Hard Yakka','PPE and workwear'],[/workwear/i,'Workwear store','PPE and workwear'],
 [/\bampol\b/i,'Ampol','Vehicle and fuel'],[/\bbp\b/i,'BP','Vehicle and fuel'],[/\bshell\b/i,'Shell','Vehicle and fuel'],[/7[\s-]?eleven/i,'7-Eleven','Vehicle and fuel'],[/caltex/i,'Caltex','Vehicle and fuel'],
 [/\bmobil\b/i,'Mobil','Vehicle and fuel'],[/metro\s*petrol/i,'Metro Petroleum','Vehicle and fuel'],[/united\s*petrol/i,'United Petroleum','Vehicle and fuel'],[/repco/i,'Repco','Vehicle and fuel'],
 [/supercheap/i,'Supercheap Auto','Vehicle and fuel'],[/autobarn/i,'Autobarn','Vehicle and fuel'],[/linkt|e-?toll/i,'Linkt (tolls)','Vehicle and fuel'],
 [/telstra/i,'Telstra','Phone and internet'],[/optus/i,'Optus','Phone and internet'],[/vodafone/i,'Vodafone','Phone and internet'],[/\btpg\b/i,'TPG','Phone and internet'],[/aussie\s*broadband/i,'Aussie Broadband','Phone and internet'],
 [/amaysim/i,'amaysim','Phone and internet'],[/boost\s*mobile/i,'Boost Mobile','Phone and internet'],
 [/\bnrma\b/i,'NRMA','Insurance'],[/\baami\b/i,'AAMI','Insurance'],[/allianz/i,'Allianz','Insurance'],[/\bqbe\b/i,'QBE','Insurance'],[/bizcover/i,'BizCover','Insurance'],[/\bgio\b/i,'GIO','Insurance'],
 [/fair\s*trading/i,'NSW Fair Trading','Licences and training'],[/service\s*nsw/i,'Service NSW','Licences and training'],[/safework/i,'SafeWork NSW','Licences and training'],[/\btafe\b/i,'TAFE NSW','Licences and training'],
 [/\bxero\b/i,'Xero','Subscriptions and software'],[/\bmyob\b/i,'MYOB','Subscriptions and software'],[/adobe/i,'Adobe','Subscriptions and software'],[/microsoft/i,'Microsoft','Subscriptions and software'],
 [/standards\s*australia|wiring\s*rules/i,'Standards Australia','Subscriptions and software'],[/h\s*&\s*r\s*block/i,'H&R Block','Accounting and bank fees'],
 [/electrical\s*trades\s*union|\betu\b/i,'ETU','Other'],[/\bneca\b/i,'NECA','Other']];
const KEYWORD_CATS=[[/unleaded|diesel|\bu9[158]\b|\be10\b|litres|\bltrs?\b|fuel/i,'Vehicle and fuel'],[/steel\s*cap|hi[\s-]?vis|safety\s*(boot|glass)|gloves|workwear/i,'PPE and workwear'],
 [/public\s*liability|insurance|premium/i,'Insurance'],[/licen[cs]e|course|training|certificate/i,'Licences and training'],[/mobile|broadband|internet|nbn/i,'Phone and internet'],[/subscription|software/i,'Subscriptions and software']];

/* Clean up common photo-reading mistakes */
function normText(t){return String(t||'').replace(/(\d)[oO]/g,(m,a)=>a+'0').replace(/[oO](\d)/g,(m,a)=>'0'+a).replace(/\bS(?=\d)/g,'$').replace(/\$\s+/g,'$')
 .replace(/(\d)\s*[.,]\s*(\d{2})(?!\d)/g,'$1.$2')}
const amtRe=/\$?\s?(\d{1,3}(?:,\d{3})+\.\d{2}|\d+\.\d{2})(?!\d)/g;
const amountsIn=l=>[...String(l).matchAll(amtRe)].map(x=>+x[1].replace(/,/g,'')).filter(v=>v>0&&v<100000);
function findTotal(lines){
 const good=/\b(total|amount\s*due|balance\s*due|amount\s*paid|eftpos|visa|mastercard|master\s*card|amex|debit|credit|purchase|card|paid|paywave|paypass)\b/i,
  bad=/sub\s*-?\s*total|\bgst\b|\btax\b|change|cash\s*(tend|given|rec)|tendered|rounding|saving|discount|\bsave\b|points|rewards|remaining|per\s*l(itre)?\b|\/l\b|\bqty\b|\bunit\b/i,cand={};
 lines.forEach((l,k)=>{if(good.test(l)&&!bad.test(l)){let v=amountsIn(l);if(!v.length&&lines[k+1]&&!bad.test(lines[k+1]))v=amountsIn(lines[k+1]);
  const w=/total|amount\s*due|balance\s*due|amount\s*paid/i.test(l)?3:2;v.forEach(x=>cand[x]=(cand[x]||0)+w)}});
 let keys=Object.keys(cand);if(keys.length)return +keys.sort((a,b)=>cand[b]-cand[a]||b-a)[0];
 const f={};lines.forEach(l=>{if(!/\b(abn|acn|ph|phone|tel|store|terminal|tid|mid|ref|auth|invoice\s*no|receipt\s*no)\b/i.test(l))amountsIn(l).forEach(v=>f[v]=(f[v]||0)+1)});
 keys=Object.keys(f);return keys.length?+keys.sort((a,b)=>f[b]-f[a]||b-a)[0]:null}
function recDates(s){const out=[];let m;
 const r1=/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b/g;while((m=r1.exec(s))){const d=okDate(+m[3]<100?2000+(+m[3]):+m[3],+m[2],+m[1]);if(d)out.push(d)}
 const r2=/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;while((m=r2.exec(s))){const d=okDate(+m[1],+m[2],+m[3]);if(d)out.push(d)}
 const r3=/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([A-Za-z]{3,9})\.?,?[\s\-]+(\d{2,4})\b/g;while((m=r3.exec(s))){const mo=MON[m[2].slice(0,3).toLowerCase()];if(mo){const d=okDate(+m[3]<100?2000+(+m[3]):+m[3],mo,+m[1]);if(d)out.push(d)}}
 const r4=/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g;while((m=r4.exec(s))){const mo=MON[m[1].slice(0,3).toLowerCase()];if(mo){const d=okDate(+m[3],mo,+m[2]);if(d)out.push(d)}}
 return out}
function findDate(lines){const now=today(),min=addDays(now,-6*366),c=[];
 lines.forEach((l,k)=>recDates(l).forEach(d=>{if(d<=now&&d>=min)c.push({d,w:/date|dated|issued|purchase|transaction/i.test(l)?2:1,k})}));
 if(!c.length)return null;c.sort((a,b)=>b.w-a.w||a.k-b.k);return c[0].d}
function guessName(lines){const skip=/tax\s*invoice|receipt|invoice|abn|acn|phone|\btel\b|www\.|http|@|total|gst|date|time|welcome|thank|copy|eftpos|customer/i;
 const l=lines.slice(0,6).find(l=>/[A-Za-z]{3,}/.test(l)&&!skip.test(l));return l?l.replace(/[^\w &'.-]/g,'').replace(/\s+/g,' ').trim().slice(0,40)||null:null}
function parseReceiptPro(text){const lines=text.split('\n').map(s=>s.trim()).filter(Boolean),flat=lines.join(' ');
 const named=SUPPLIERS.find(([re])=>re.test(flat)),kw=KEYWORD_CATS.find(([re])=>re.test(flat));
 const gl=lines.find(l=>/\bgst\b/i.test(l)&&amountsIn(l).length);
 return{total:findTotal(lines),date:findDate(lines),supplier:named?named[1]:guessName(lines),category:named?named[2]:(kw?kw[1]:null),gst:gl?amountsIn(gl).slice(-1)[0]:null}}

/* Photo reading: enlarge and clean the image, then read it as a receipt (one column of lines) */
let OCRW=null;
async function ocrWorker(){await loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js');
 if(!OCRW){OCRW=await Tesseract.createWorker('eng');await OCRW.setParameters({tessedit_pageseg_mode:'4',preserve_interword_spaces:'1'})}return OCRW}
async function prepForOCR(blob){const url=URL.createObjectURL(blob);const img=await new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=url});
 const s=Math.min(2.5,2000/Math.max(img.width,img.height)),c=document.createElement('canvas');c.width=Math.round(img.width*s);c.height=Math.round(img.height*s);
 const x=c.getContext('2d');x.fillStyle='#fff';x.fillRect(0,0,c.width,c.height);x.drawImage(img,0,0,c.width,c.height);URL.revokeObjectURL(url);return enhance(c,'bw')}
async function readReceiptText(blob){if(/pdf/i.test(blob.type))return readPDF(blob);const w=await ocrWorker();return (await w.recognize(await prepForOCR(blob))).data.text||''}

/* Fill the expense by itself; never overwrite what you typed (unless you tap Auto-fill) */
async function autoReadReceipt(blob,manual){if(!X)return;const xid=X.id;X._reading=true;renderExpEdit();let text='';
 try{text=await readReceiptText(blob)}catch(e){}
 if(!X||X.id!==xid)return;X._reading=false;const p=parseReceiptPro(normText(text)),got=[];X._ocr=text;
 if(p.total&&(manual||!(+X.amount>0))){X.amount=p.total;got.push('amount')}
 if(p.date&&(manual||!X._dateSet)){X.date=p.date;got.push('date')}
 if(p.supplier&&(manual||!X.supplier)){X.supplier=p.supplier;got.push('supplier')}
 if(p.category&&(manual||!X._catSet)){X.category=p.category;got.push('category')}
 if(p.gst&&!/GST/i.test(X.notes||''))X.notes=((X.notes||'')+` Includes GST $${money(p.gst)}`).trim();
 X._got=got;renderExpEdit();toast(got.length?`Filled in ${got.join(', ')}. Please check.`:'Could not read the details. Please enter them.')}
const _addRecR=addRec;
addRec=async function(blob){await _addRecR(blob);if(X&&!X._reading)autoReadReceipt(blob,false)};
readReceipt=async function(){const id=X&&X.receipts[0];if(!id)return toast('Add a receipt first');const b=await loadFile(id);if(b)autoReadReceipt(b,true)};
const _saveExpR=saveExp;
saveExp=async function(){if(X)['_ocr','_got','_reading','_dateSet','_catSet'].forEach(k=>delete X[k]);return _saveExpR()};
const _renderExpEditR=renderExpEdit;
renderExpEdit=function(){_renderExpEditR();if(!X)return;loadScript('https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/tesseract.min.js').catch(()=>{});
 const top=document.querySelector('.wrap .top');let html='';
 if(X._reading)html='<div class="banner info"><b>Reading receipt\u2026</b> The details will fill in by themselves in a few seconds.</div>';
 else if(X._ocr!=null){const ok=X._got&&X._got.length;html=`<div class="banner ${ok?'info':''}">${ok?`<b>Filled in from the receipt:</b> ${X._got.join(', ')}. Please check before saving.`:"<b>Couldn't read this receipt clearly.</b> Please enter the details, or retake the photo flat and in good light."}
  <details style="margin-top:6px"><summary class="link" style="cursor:pointer;padding:0">Show the text read</summary><pre style="white-space:pre-wrap;font-size:12px;background:#fff;border-radius:8px;padding:10px;max-height:240px;overflow:auto">${esc((X._ocr||'(no text found)').slice(0,3000))}</pre></details></div>`}
 if(html&&top)top.insertAdjacentHTML('afterend',html);
 const di=$('#x_date');if(di)di.addEventListener('change',()=>{X._dateSet=true});const cs=document.querySelector('.edgrid select.inp');if(cs)cs.addEventListener('change',()=>{X._catSet=true})};
VIEWS.expEdit=renderExpEdit;
