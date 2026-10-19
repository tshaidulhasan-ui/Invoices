'use strict';
/* ===== Pay less tax (legally): personalised suggestions from your own records ===== */
const TIP_CATS=[
 ['Tools and equipment','Tools and equipment','Hand and power tools, testers, multimeters, ladders, tool bags, and repairs or calibration of test equipment.'],
 ['PPE and workwear','Protective gear','Steel-cap boots, hi-vis, gloves, safety glasses and hearing protection. Sunscreen, sunglasses and hats count too if you work outdoors.'],
 ['Licences and training','Licences and training','Electrical licence renewal, Working at Heights, first aid, and courses linked to your current work.'],
 ['Insurance','Business insurance','Public liability insurance and tool insurance.'],
 ['Vehicle and fuel','Car expenses','Driving between job sites or carrying bulky tools. Use the cents per km calculator (up to 5,000 km) or keep a logbook to claim more.'],
 ['Phone and internet','Phone and internet','The work share of your mobile plan and home internet, for example 60% if most of your calls are for work.'],
 ['Accounting and bank fees','Accountant and bank fees',"Your tax agent's fee (claim it in the year you pay it) and business bank account fees."],
 ['Subscriptions and software','Subscriptions and references','Software and apps you use for work, and technical references such as the Wiring Rules standard.'],
 ['Other','Union or association fees','Trade union or industry association membership.']];
let TIPSHOW=false;
const tipState=()=>S.settings.tips||(S.settings.tips={});
const pctS=m=>Math.round(m*100)+'%';
async function tipMark(k,v){tipState()[k]=v;await save();renderTips()}
function tipExp(cat){newExp();X.category=cat;renderExpEdit()}
function margRate(c){return Math.max(0,(c.a.total-taxRun(c.net-1000,c.R,c.P).total)/1000)}
function superSave(c,A){return c.a.total-taxRun(c.net,c.R,Object.assign({},c.P,{superDed:(+c.P.superDed||0)+A})).total-A*.15}

function buildTips(){const y=fy(today()),c=calcTax(y,'proj'),R=c.R,P=c.P,m=margRate(c),per100=m*100,M=v=>'$'+money(v),list=[];
 const ex=liveExp().filter(x=>fy(x.date)===y),has=cat=>ex.some(x=>x.category===cat),txt=x=>(x.supplier||'')+' '+(x.notes||'');
 /* Super */
 const cap=R.superCap||(typeof SUPER_CAP!=='undefined'&&SUPER_CAP[y])||32500,used=(S.super||[]).filter(s=>!s.deleted&&fy(s.date)===y&&s.type!=='nodeduct').reduce((a,s)=>a+(+s.amount||0),0),left=Math.max(0,cap-used);
 if(left>0&&m>.2){const A=Math.min(left,5000),sv=superSave(c,A);if(sv>0)list.push({k:'super'+y,title:'Make a tax-deductible super contribution',save:sv,
  body:`Personal super contributions you claim are taxed at 15% in your fund instead of your rate of about ${pctS(m)}. Putting in ${M(A)} this year would cut your tax by about ${M(sv)} after the fund's 15% tax. You have ${M(left)} of concessional cap left for ${fyLabel(y)}.`,
  steps:['Pay it into your fund well before 30 June so it arrives in time.','Send your fund a notice of intent to claim a deduction, and wait for their acknowledgement before you lodge your return.','The money stays in super until you retire, so only put in what you can spare.'],
  acts:`<button class="btn sm" onclick="go('super')">Open super tracker</button>`})}
 /* Missing deduction categories */
 const miss=TIP_CATS.filter(([cat])=>cat==='Other'?!ex.some(x=>/union|etu|neca|association|membership/i.test(txt(x))):!has(cat));
 if(miss.length&&m>0)list.push({k:'missing'+y+'-'+miss.length,title:`Deductions you may be missing (${miss.length})`,save:null,sort:per100*miss.length,
  body:`You haven't recorded any of these yet this year. Only claim genuine work costs you've actually paid. Every $100 you can claim saves you about ${M(per100)}.`,
  rows:miss.map(([cat,t,d])=>`<div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start;border-top:1px solid var(--ln);padding:10px 0;margin-top:6px"><div><b>${t}</b><div class="mu small">${d}</div></div><button class="btn sm sec" style="flex:none" onclick="tipExp('${cat}')">Add</button></div>`).join('')});
 /* Missing receipts */
 const nr=ex.filter(x=>!x.receipts||!x.receipts.length);
 if(nr.length){const amt=nr.reduce((a,x)=>a+deductible(x),0);list.push({k:'rec'+y+'-'+nr.length,title:`Protect ${M(amt)} of claims: add the missing receipts`,save:null,sort:amt*m,
  body:`${nr.length} expense${nr.length>1?'s have':' has'} no receipt. If the ATO asks, claims without records can be refused, which would cost you about ${M(amt*m)}.`,acts:`<button class="btn sm" onclick="go('expenses')">Go to expenses</button>`})}
 /* Home office */
 if(!has('Home office')){const v=96*R.homeHr;list.push({k:'home'+y,title:'Claim your paperwork time at home',save:v*m,
  body:`If you do quotes, invoicing and admin at home, you can claim ${Math.round(R.homeHr*100)} cents per hour. Two hours a week for 48 weeks is about ${M(v)} of deductions, saving about ${M(v*m)}. Keep a simple record of your hours.`,
  acts:`<button class="btn sm sec" onclick="tipExp('Home office');calcHome()">Use the calculator</button>`})}
 /* Instant asset write-off */
 list.push({k:'iawo'+y,title:'Time needed tool and equipment purchases',save:null,sort:per100*5,
  body:"Small businesses can usually claim the full cost of each business asset under $20,000 in the year it's first used, instead of spreading it over several years. This was announced as permanent from 1 July 2026, so confirm with your tax agent that it's law before a big purchase. If you were going to buy something anyway, buying before 30 June brings the deduction into this year.",
  steps:[`Only buy what the business needs. Spending $1,000 saves about ${M(1000*m)} in tax but still costs you ${M(1000*(1-m))}.`,'Keep the tax invoice and note the date the item was first used.']});
 /* Prepay (March to June) */
 const mo=D(today()).getMonth();if(mo>=2&&mo<=5)list.push({k:'prepay'+y,title:'Prepay some expenses before 30 June',save:null,sort:per100*3,
  body:'Small businesses can usually claim prepaid expenses covering 12 months or less in the year they pay them, such as public liability insurance, licence renewals, subscriptions or your tax agent fee. Paying before 30 June brings the deduction into this year.'});
 /* Income protection */
 if(!ex.some(x=>/income protection/i.test(txt(x))))list.push({k:'ip'+y,title:'Income protection insurance is deductible',save:null,sort:per100*2,
  body:`As a sole trader you have no sick pay if you can't work. Income protection premiums you pay yourself (not through super) are generally tax-deductible, which lowers their real cost by about ${pctS(m)}. Worth comparing quotes, especially in a physical trade.`,
  acts:`<button class="btn sm sec" onclick="tipExp('Insurance')">Add a premium</button>`});
 /* Medicare levy surcharge */
 if(!P.phi&&c.a.mls>0)list.push({k:'mls'+y,title:'Avoid the Medicare levy surcharge',save:c.a.mls,
  body:`Without private hospital cover, your estimated surcharge this year is ${M(c.a.mls)}. A basic hospital policy can sometimes cost less than that. Compare a policy's yearly premium with this amount.`});
 /* Car logbook */
 if(ex.some(x=>x.category==='Vehicle and fuel'&&/5000 business km/.test(x.notes||'')))list.push({k:'logbook'+y,title:'Try the logbook method for your car',save:null,sort:per100*5,
  body:"You've reached the 5,000 km limit for cents per km. A 12-week logbook lets you claim the business share of all car costs (fuel, rego, insurance, servicing and depreciation), which is often more if you drive a lot for work."});
 /* PSI */
 const sh=clientShares(c.F.inv)[0];if(sh&&sh.pct>=80)list.push({k:'psi'+y,title:'Check the personal services income rules first',save:null,sort:0,
  body:`${esc(sh.name)} pays ${sh.pct.toFixed(0)}% of your income. Unless you pass the results test, the PSI rules stop you claiming some costs, such as rent or interest on your home, or paying a partner for work. Ask your tax agent before relying on those. Tools, protective gear, licences, insurance and work car costs are generally still fine.`});
 /* Donations */
 list.push({k:'donate'+y,title:'Keep receipts for donations of $2 or more',save:null,sort:1,
  body:'Gifts of $2 or more to registered charities (deductible gift recipients) are tax-deductible. Record them with the receipt so your tax agent can include them.',acts:`<button class="btn sm sec" onclick="tipExp('Other')">Add a donation</button>`});
 const score=t=>t.save!=null?t.save:(t.sort||0);
 return{list:list.sort((a,b)=>score(b)-score(a)),c,m}}

function renderTips(){const{list,c,m}=buildTips(),st=tipState(),open=list.filter(t=>!st[t.k]),done=list.filter(t=>st[t.k]);
 const card=t=>`<div class="card" style="margin-bottom:12px"><div class="pad"><div style="display:flex;justify-content:space-between;gap:12px;align-items:flex-start"><b style="font-size:16px">${t.title}</b>${t.save>0?`<span class="pill p-paid" style="white-space:nowrap;margin:0">Save ~$${money(t.save)}</span>`:''}</div>
 <p style="margin:8px 0 0">${t.body}</p>${t.steps?`<ul class="mu small" style="margin:8px 0 0;padding-left:18px">${t.steps.map(s=>`<li style="margin:3px 0">${s}</li>`).join('')}</ul>`:''}${t.rows||''}
 <div style="display:flex;gap:14px;align-items:center;flex-wrap:wrap;margin-top:12px">${t.acts||''}${st[t.k]?`<span class="mu small">${st[t.k]==='done'?'Marked done':'Hidden'}</span><button class="link" onclick="tipMark('${t.k}',0)">Show again</button>`:`<button class="link" onclick="tipMark('${t.k}','done')">Done</button><button class="link" style="color:var(--mu)" onclick="tipMark('${t.k}','hide')">Not for me</button>`}</div></div></div>`;
 app.innerHTML=`<div class="wrap"><div class="top"><button class="link" onclick="go('tax')">\u2039 Tax</button><b>Pay less tax</b><span style="width:50px"></span></div>
 <div class="stats"><div class="stat"><div class="mu small">Estimated tax ${fyLabel(fy(today()))}</div><b>$${money(c.a.total)}</b></div>
 <div class="stat"><div class="mu small">Your tax rate on extra income</div><b>${pctS(m)}</b></div>
 <div class="stat"><div class="mu small">Tax saved per $100 deducted</div><b style="color:var(--gr)">$${money(m*100)}</b></div>
 <div class="stat"><div class="mu small">Ideas for you</div><b>${open.length}</b></div></div>
 <p class="mu small" style="margin:12px 4px 4px">Legal ways to lower your tax, based on your own records. Only claim genuine costs of running your business that you can back up with records, and leave out any personal share. These are estimates, so check big decisions with your tax agent.</p>
 <h2 class="sec">Suggestions</h2>${open.map(card).join('')||'<div class="empty">You\'ve worked through every suggestion. Check back as your records grow.</div>'}
 ${done.length?`<div style="text-align:center;margin:6px 0 12px"><button class="link" onclick="TIPSHOW=!TIPSHOW;renderTips()">${TIPSHOW?'Hide':'Show'} done and hidden (${done.length})</button></div>${TIPSHOW?done.map(card).join(''):''}`:''}</div>`}

/* Entry points on the Tax and Dashboard pages */
function tipsBanner(){const n=buildTips().list.filter(t=>!tipState()[t.k]).length;
 return `<div class="banner info" style="display:flex;justify-content:space-between;align-items:center;gap:12px"><span><b>Pay less tax.</b> ${n} suggestion${n===1?'':'s'} based on your records.</span><button class="btn sm" style="flex:none" onclick="go('tips')">View</button></div>`}
const _renderTaxT=renderTax;
renderTax=function(){_renderTaxT();const seg=document.querySelector('.wrap > .seg');if(seg)seg.insertAdjacentHTML('beforebegin',tipsBanner())};
const _renderDashT=renderDash;
renderDash=function(){_renderDashT();const st=document.querySelector('.wrap > .stats');if(st)st.insertAdjacentHTML('beforebegin',tipsBanner())};
Object.assign(VIEWS,{tax:renderTax,dash:renderDash,tips:renderTips});
NAV.find(n=>n[0]==='tax')[3].push('tips');
