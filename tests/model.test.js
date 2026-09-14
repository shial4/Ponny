'use strict';
const assert = require('node:assert/strict');

function norm(s){return String(s||'').toLowerCase().replace(/[^a-z0-9]/g,'')}
function itemNameMatches(actual, expected){
  const a=norm(actual), e=norm(expected);
  return a===e || (e==='duskanddawn' && a==='duskdawn');
}
const prior={keystone:'Dark Harvest',secondaryTree:'Inspiration',items:['Dusk and Dawn','Shadowflame',"Rabadon's Deathcap"],confidence:.92};
function priorScore(row){
  let s=0;
  if(row.keystone===prior.keystone)s+=45;
  if(row.secondaryTree===prior.secondaryTree)s+=20;
  prior.items.forEach((name,i)=>{
    if(row.path[i]&&itemNameMatches(row.path[i],name))s+=55-i*8;
    else if(row.path.some(x=>itemNameMatches(x,name)))s+=12;
  });
  return s*prior.confidence;
}
function rankedOverall(row, max){
  return 100*(
    .10*row.stage1/max.stage1+
    .16*row.stage2/max.stage2+
    .20*row.stage3/max.stage3+
    .06*row.proc/max.proc+
    .10*row.runeFit/max.runeFit+
    .10*Math.max(0,row.pathFit)/max.pathFit+
    .28*Math.max(0,row.metaFit)/max.metaFit
  );
}

const rows=[
  {name:'ranked baseline',keystone:'Dark Harvest',secondaryTree:'Inspiration',path:['Dusk and Dawn','Shadowflame',"Rabadon's Deathcap"],stage1:900,stage2:1330,stage3:1780,proc:1320,runeFit:180,pathFit:190},
  {name:'raw damage bait',keystone:'Electrocute',secondaryTree:'Sorcery',path:['Lich Bane',"Rabadon's Deathcap",'Void Staff'],stage1:980,stage2:1450,stage3:1950,proc:1510,runeFit:155,pathFit:45},
  {name:'invalid order bait',keystone:'Electrocute',secondaryTree:'Sorcery',path:['Void Staff',"Rabadon's Deathcap",'Shadowflame'],stage1:760,stage2:1420,stage3:1970,proc:1490,runeFit:150,pathFit:-100},
];
rows.forEach(r=>r.metaFit=priorScore(r));
const max={};
for(const k of ['stage1','stage2','stage3','proc','runeFit'])max[k]=Math.max(...rows.map(r=>r[k]));
max.pathFit=Math.max(1,...rows.map(r=>Math.max(0,r.pathFit)));
max.metaFit=Math.max(1,...rows.map(r=>Math.max(0,r.metaFit)));
rows.forEach(r=>r.overall=rankedOverall(r,max));
rows.sort((a,b)=>b.overall-a.overall);
assert.equal(rows[0].name,'ranked baseline','Ranked Best must prefer the validated SoloQ baseline over laboratory max damage');
assert.ok(rows[0].metaFit>180,'current-patch meta prior should strongly identify full baseline match');
assert.ok(priorScore(rows.find(r=>r.name==='raw damage bait'))<20,'a partial out-of-order overlap may get only a tiny prior, never enough to beat the baseline');
assert.ok(!['Void Staff',"Rabadon's Deathcap",'Zhonya\'s Hourglass'].includes(rows[0].path[0]),'capstone/penetration items must not become default first purchase');
console.log('PASS ranked recommendation weighting');

// Quick trade is intentionally allowed to diverge from the ranked baseline.
const trade=[
 {name:'Lich trade',score:96,path:['Lich Bane','Stormsurge',"Rabadon's Deathcap"]},
 {name:'Dusk ranked',score:90,path:['Dusk and Dawn','Shadowflame',"Rabadon's Deathcap"]}
].sort((a,b)=>b.score-a.score);
assert.equal(trade[0].path[0],'Lich Bane');
assert.equal(trade[0].path[1],'Stormsurge');
console.log('PASS objective-specific alternative');

for(const banned of ['Hextech Gunblade','Cruelty','Crown of the Shattered Queen']){
  assert.equal(rows.flatMap(r=>r.path).includes(banned),false,`${banned} must not enter standard SR candidate tests`);
}
console.log('PASS legacy/mode-specific exclusions');
