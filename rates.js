/* ATO rates by financial year. Key = year the FY starts (2026 = 1 July 2026 to 30 June 2027).
   Update once a year in July. Check figures at ato.gov.au. */
const RATES={
 2025:{label:'2025\u201326',
  brackets:[[18200,0],[45000,.16],[135000,.30],[190000,.37],[Infinity,.45]],
  medicare:{rate:.02,low:28011,high:35013},
  lito:{max:700,t1:37500,t2:45000,t3:66667,r1:.05,r2:.015},
  help:{t:67000,b2:125000,b3:179285,r1:.15,r2:.17,flat:.10},
  mls:[[101000,0],[118000,.01],[158000,.0125],[Infinity,.015]],
  sbto:{rate:.16,max:1000},carKm:.88,homeHr:.70},
 2026:{label:'2026\u201327',
  brackets:[[18200,0],[45000,.15],[135000,.30],[190000,.37],[Infinity,.45]],
  medicare:{rate:.02,low:28011,high:35013},
  lito:{max:700,t1:37500,t2:45000,t3:66667,r1:.05,r2:.015},
  help:{t:69528,b2:129717,b3:186051,r1:.15,r2:.17,flat:.10},
  mls:[[101000,0],[118000,.01],[158000,.0125],[Infinity,.015]],
  sbto:{rate:.16,max:1000},carKm:.91,homeHr:.70,
  notes:'Medicare levy low-income and surcharge thresholds use 2025\u201326 values until the ATO publishes 2026\u201327 figures.'}
};
function ratesFor(y){if(RATES[y])return RATES[y];const ks=Object.keys(RATES).map(Number).sort((a,b)=>a-b);return RATES[y<ks[0]?ks[0]:ks[ks.length-1]]}
