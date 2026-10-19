'use strict';
/* ===== Invoice PDF reading rules (v3). Weekly invoices: finds the 7-day work period and the invoice date from all dates on the page. ===== */
const WDAY=/^(mon|tue|wed|thu|fri|sat|sun)[a-z]*\b/i;
const monNum=w=>MON[String(w||'').slice(0,3).toLowerCase()];
const dayDiff=(a,b)=>Math.round((D(b)-D(a))/864e5);
/* Every date on the page with its position: 12.10.26, 12/10/2026, 2026-10-12, 12 Oct 2026, Oct 12, 2026, "12 Oct – 18 Oct 2026", "Monday 12 to Friday 16 October 2026" */
function datesWithPos(s){const out=[],add=(d,i)=>{if(d)out.push({d,i})};let m;
 const r1=/\b(\d{1,2})\s?[\/\-.]\s?(\d{1,2})\s?[\/\-.]\s?(\d{4}|\d{2})\b/g;while((m=r1.exec(s)))add(okDate(+m[3]<100?2000+(+m[3]):+m[3],+m[2],+m[1]),m.index);
 const r2=/\b(\d{4})[\/\-.](\d{1,2})[\/\-.](\d{1,2})\b/g;while((m=r2.exec(s)))add(okDate(+m[1],+m[2],+m[3]),m.index);
 const r3=/\b(\d{1,2})(?:st|nd|rd|th)?[\s\-]+([A-Za-z]{3,9})\.?,?[\s\-]+(\d{4}|\d{2})\b/g;while((m=r3.exec(s))){const mo=monNum(m[2]);if(mo)add(okDate(+m[3]<100?2000+(+m[3]):+m[3],mo,+m[1]),m.index)}
 const r4=/\b([A-Za-z]{3,9})\.?\s+(\d{1,2}),?\s+(\d{4})\b/g;while((m=r4.exec(s))){const mo=monNum(m[1]);if(mo)add(okDate(+m[3],mo,+m[2]),m.index)}
 const r5=/\b(\d{1,2})\s+([A-Za-z]{3,9})\.?\s*(?:[-\u2010-\u2015~]|\bto\b)\s*[^\d]{0,80}?(\d{1,2})\s+([A-Za-z]{3,9})\.?,?\s+(\d{4})/g;
 while((m=r5.exec(s))){const sm=monNum(m[2]),em=monNum(m[4]);if(sm&&em){let y=+m[5];if(sm>em)y--;add(okDate(y,sm,+m[1]),m.index)}}
 const r6=/\b(\d{1,2})\s*(?:\bto\b|[-\u2013])\s*(?:[A-Za-z]+day\s+)?(\d{1,2})\s+([A-Za-z]{3,9})\s+(\d{4})/gi;while((m=r6.exec(s))){const mo=monNum(m[3]);if(mo)add(okDate(+m[4],mo,+m[1]),m.index)}
 return out.sort((a,b)=>a.i-b.i)}
function analyseDates(text){const lines=text.split('\n').map(s=>s.trim()).filter(Boolean),flat=lines.join(' '),all=datesWithPos(flat);
 const isDue=x=>/(due|pay\s*by|payable\s*by)[^0-9]{0,25}$/i.test(flat.slice(Math.max(0,x.i-30),x.i));
 const use=all.filter(x=>!isDue(x));let start=null,end=null,guess=false,best=1e9;
 /* 1. Weekly: two dates exactly 6 days apart, closest together on the page */
 for(const a of use)for(const b of use){const gap=b.i-a.i;if(gap>0&&gap<200&&dayDiff(a.d,b.d)===6&&gap<best){best=gap;start=a.d;end=b.d}}
 /* 2. Any "date – date" pair up to 31 days apart */
 if(!start)for(const a of use)for(const b of use){const gap=b.i-a.i,dd=dayDiff(a.d,b.d);if(gap>0&&gap<200&&dd>=1&&dd<=31&&/[-\u2010-\u2015~]|\bto\b/i.test(flat.slice(a.i,b.i))){start=a.d;end=b.d;break}if(start)break}
 /* 3. Work days in the Hours Worked table */
 if(!start){const days=[];lines.forEach(l=>{if(WDAY.test(l)){const ds=datesWithPos(l);if(ds.length)days.push(ds[0].d)}});if(days.length){days.sort();start=days[0];end=days[days.length-1]}}
 /* Invoice date: labelled first, then the period end (or the first later date within 2 weeks), else the latest date */
 let date=null;const lab=flat.match(/(?:invoice\s*date|date\s*of\s*issue|issue\s*date|date\s*issued|week\s*ending|w\/e)\s*:?\s*([0-9A-Za-z .\/\-,]{6,24})/i);
 if(lab){const d=datesWithPos(lab[1])[0];if(d)date=d.d}
 if(!date&&end){const later=[...new Set(use.map(x=>x.d))].filter(d=>d>end&&d<=addDays(end,14)).sort();date=use.some(x=>x.d===end)?end:(later[0]||end)}
 if(!date&&use.length)date=use.map(x=>x.d).sort().pop();
 if(!start&&date){start=addDays(date,-6);end=date;guess=true}
 return{start,end,date,guess}}
const _parseInvoiceP=parseInvoice;
parseInvoice=function(t){const r=_parseInvoiceP(t),a=analyseDates(t);delete r.start;delete r.end;delete r.periodGuess;
 if(a.start){r.start=a.start;r.end=a.end}if(a.date)r.date=a.date;if(a.guess)r.periodGuess=true;return r};

/* Past records keep the exact From and To dates; "Paid on" starts as the invoice date */
const _pastBaseP=pastBase;
pastBase=function(p={}){const r=_pastBaseP(p);if(p.start)r.weekStart=p.start;r.pEnd=p.end||addDays(r.weekStart,6);if(p.date){r.date=p.date;r.paidDate=p.date}if(p.periodGuess)r._periodGuess=true;return r};
const _renderPastEditP=renderPastEdit;
renderPastEdit=function(){_renderPastEditP();const p=PX;if(!p)return;if(!p.pEnd)p.pEnd=addDays(p.weekStart,6);const dis=p.locked?'disabled':'';
 const f=[...document.querySelectorAll('.fld')].find(x=>/Work period/i.test(x.textContent));
 if(f)f.outerHTML=`<div class="fld"><label>Work period from</label><input class="inp" type="date" ${dis} value="${p.weekStart}" onchange="if(this.value){PX.weekStart=this.value;if(PX.pEnd<this.value)PX.pEnd=this.value;renderPastEdit()}"></div>
 <div class="fld"><label>Work period to</label><input class="inp" type="date" ${dis} value="${p.pEnd}" onchange="if(this.value){PX.pEnd=this.value;delete PX._periodGuess;renderPastEdit()}">${p._periodGuess?'<div class="small" style="margin-top:4px;color:var(--am)">Not found in the PDF, so this is a guess. Please check.</div>':''}</div>`};
VIEWS.pastEdit=renderPastEdit;
const _savePastP=savePast;
savePast=async function(){if(PX){delete PX._periodGuess;if(PX.pEnd&&PX.pEnd<PX.weekStart)return toast('The "to" date is before the "from" date')}return _savePastP()};
const _pastDiffP=pastDiff;
pastDiff=function(a,b){const c=_pastDiffP(a,b);if((a.pEnd||'')!==(b.pEnd||''))c.push(`Period end: ${a.pEnd?fmtD(a.pEnd):'\u2014'} \u2192 ${b.pEnd?fmtD(b.pEnd):'\u2014'}`);return c};

/* Re-check dates of past records that already have a saved PDF */
let DATEFIX=[];
async function recheckDates(){const recs=live().filter(i=>isLump(i)&&i.file);if(!recs.length)return toast('No saved PDFs to check');DATEFIX=[];
 for(let k=0;k<recs.length;k++){const i=recs[k];toast(`Checking ${k+1} of ${recs.length}\u2026`);
  try{const b=await loadFile(i.file);if(!b)continue;const p=parseInvoice(await readPDF(b));if(p.periodGuess||!p.start)continue;
   const cur=i.pEnd||addDays(i.weekStart,6),dt=p.date||i.date;
   if(p.start!==i.weekStart||p.end!==cur||dt!==i.date)DATEFIX.push({id:i.id,ws:p.start,pe:p.end,dt})}catch(e){}}
 if(!DATEFIX.length)return toast('All dates already match their PDFs');
 modal(`<h3>Fix ${DATEFIX.length} record${DATEFIX.length>1?'s':''}?</h3><p class="mu small">These dates don't match the original PDFs. Each change is saved in the record's history.</p>
 <div style="max-height:45vh;overflow:auto;border:1px solid var(--ln);border-radius:10px">${DATEFIX.map(f=>{const i=find(f.id);return `<div class="hist"><b>${esc(i.number)}</b><br>Period: ${period(i)} \u2192 <b>${period({weekStart:f.ws,pEnd:f.pe})}</b><br>Invoice date: ${fmtD(i.date)} \u2192 <b>${fmtD(f.dt)}</b></div>`}).join('')}</div>
 <div class="mbtns"><button class="btn sec" onclick="closeModal()">Cancel</button><button class="btn" onclick="applyDateFix()">Fix all</button></div>`)}
async function applyDateFix(){const fx=DATEFIX;DATEFIX=[];closeModal();
 fx.forEach(f=>{const i=find(f.id);if(!i)return;const b=clone(i);i.weekStart=f.ws;i.pEnd=f.pe;if(!i.paidDate||i.paidDate===i.date||i.paidDate<f.ws)i.paidDate=f.dt;i.date=f.dt;
  i.history=[...(i.history||[]),{ts:Date.now(),changes:pastDiff(b,i),reason:'Dates re-read from the original PDF'}]});
 addLog(`${fx.length} past record date${fx.length>1?'s':''} corrected from their PDFs`);await save();toast('Dates fixed');render()}
const _renderPastP=renderPast;
renderPast=function(){_renderPastP();const st=document.querySelector('.wrap .stack');if(st&&live().some(i=>isLump(i)&&i.file))st.insertAdjacentHTML('beforeend','<button class="btn ghost full" onclick="recheckDates()">Re-check dates from saved PDFs</button>')};
VIEWS.past=renderPast;
