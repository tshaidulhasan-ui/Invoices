'use strict';
/* ===== Invoice PDF reading rules, matched to your invoice layout. Future reading fixes go here. ===== */
const WDAY=/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i;
function allDates(s){const out=[],re=/\b(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})\b|\b(\d{1,2})(?:st|nd|rd|th)?\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})\b/g;let m;
 while((m=re.exec(s))){let d=null;if(m[1])d=okDate(+m[3]<100?2000+(+m[3]):+m[3],+m[2],+m[1]);else{const mo=MON[m[5].slice(0,3).toLowerCase()];if(mo)d=okDate(+m[6],mo,+m[4])}if(d)out.push(d)}return out}
function periodInfo(lines,flat){
 /* 1. Hours Worked table: rows that start with a day name and contain a date */
 const days=[];lines.forEach(l=>{if(WDAY.test(l)){const ds=allDates(l);if(ds.length)days.push(ds[0])}});
 if(days.length){days.sort();return{start:monday(days[0]),end:days[days.length-1]}}
 /* 2. Pay Period "12 Oct – 18 Oct 2026", including weeks that cross into a new year */
 const sep='\\s*(?:[-\u2010-\u2015~]|to|until|till)\\s*';
 let m=flat.match(new RegExp('(\\d{1,2})\\s+([A-Za-z]{3,9})(?:\\s+(\\d{4}))?'+sep+'(\\d{1,2})\\s+([A-Za-z]{3,9})\\s+(\\d{4})'));
 if(m){const sm=MON[m[2].slice(0,3).toLowerCase()],em=MON[m[5].slice(0,3).toLowerCase()];
  if(sm&&em){const ey=+m[6];let sy=m[3]?+m[3]:ey;if(!m[3]&&sm>em)sy=ey-1;const s=okDate(sy,sm,+m[1]),e=okDate(ey,em,+m[4]);if(s&&e&&e>=s)return{start:monday(s),end:e}}}
 /* 3. Sentence "Monday 12 to Friday 16 October 2026" */
 m=flat.match(/(?:[A-Za-z]+day\s+)?(\d{1,2})\s*(?:to|[-\u2013])\s*(?:[A-Za-z]+day\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/i);
 if(m){const mo=MON[m[3].slice(0,3).toLowerCase()];if(mo&&+m[1]<=+m[2]){const s=okDate(+m[4],mo,+m[1]),e=okDate(+m[4],mo,+m[2]);if(s&&e)return{start:monday(s),end:e}}}
 /* 4. "Week ending 18.10.2026" */
 m=flat.match(/week\s*ending\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\s+\d{4})/i);
 if(m){const e=pDate(m[1]);if(e)return{start:monday(addDays(e,-6)),end:e}}
 return null}
function invoiceDate(lines,flat){
 const lab=flat.match(/invoice\s*date\s*:?\s*(\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4}|\d{1,2}\s+[A-Za-z]{3,9}\.?,?\s+\d{4})/i);if(lab&&pDate(lab[1]))return pDate(lab[1]);
 const solo=lines.slice(0,8).find(l=>allDates(l).length===1&&l.replace(/[^A-Za-z]/g,'').length<=12);if(solo)return allDates(solo)[0];
 return null}
const _parseInvoiceP=parseInvoice;
parseInvoice=function(t){const r=_parseInvoiceP(t),lines=t.split('\n').map(s=>s.trim()).filter(Boolean),flat=lines.join(' '),per=periodInfo(lines,flat);
 delete r.start;delete r.end;if(per){r.start=per.start;r.end=per.end}
 const d=invoiceDate(lines,flat);if(d)r.date=d;
 if(r.start&&(!r.date||r.date<r.start||D(r.date)-D(r.start)>90*864e5))r.date=addDays(r.start,6);
 if(!r.start&&r.date)r.start=monday(addDays(r.date,-6));
 return r};

/* Re-check dates of past records that already have a saved PDF */
let DATEFIX=[];
async function recheckDates(){const recs=live().filter(i=>isLump(i)&&i.file);if(!recs.length)return toast('No saved PDFs to check');DATEFIX=[];
 for(let k=0;k<recs.length;k++){const i=recs[k];toast(`Checking ${k+1} of ${recs.length}\u2026`);
  try{const b=await loadFile(i.file);if(!b)continue;const p=parseInvoice(await readPDF(b)),ws=p.start||i.weekStart,dt=p.date||i.date;if(ws!==i.weekStart||dt!==i.date)DATEFIX.push({id:i.id,ws,dt})}catch(e){}}
 if(!DATEFIX.length)return toast('All dates already match their PDFs');
 modal(`<h3>Fix ${DATEFIX.length} record${DATEFIX.length>1?'s':''}?</h3><p class="mu small">These dates don't match the original PDFs. Each change is saved in the record's history.</p>
 <div style="max-height:45vh;overflow:auto;border:1px solid var(--ln);border-radius:10px">${DATEFIX.map(f=>{const i=find(f.id);return `<div class="hist"><b>${esc(i.number)}</b><br>Period: ${period(i)} \u2192 <b>${period({weekStart:f.ws})}</b><br>Date: ${fmtD(i.date)} \u2192 <b>${fmtD(f.dt)}</b></div>`}).join('')}</div>
 <div class="mbtns"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="applyDateFix()">Fix all</button></div>`)}
async function applyDateFix(){const fx=DATEFIX;DATEFIX=[];closeModal();
 fx.forEach(f=>{const i=find(f.id);if(!i)return;const b=clone(i);i.weekStart=f.ws;if(i.paidDate===i.date)i.paidDate=f.dt;i.date=f.dt;
  i.history=[...(i.history||[]),{ts:Date.now(),changes:pastDiff(b,i),reason:'Dates re-read from the original PDF'}]});
 addLog(`${fx.length} past record date${fx.length>1?'s':''} corrected from their PDFs`);await save();toast('Dates fixed');render()}
const _renderPastP=renderPast;
renderPast=function(){_renderPastP();const st=document.querySelector('.wrap .stack');if(st&&live().some(i=>isLump(i)&&i.file))st.insertAdjacentHTML('beforeend','<button class="btn ghost full" onclick="recheckDates()">Re-check dates from saved PDFs</button>')};
VIEWS.past=renderPast;
