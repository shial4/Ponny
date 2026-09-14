(function(global){
'use strict';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const text=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const lower=v=>text(v).toLowerCase();
const atLevel=(base,growth,level)=>num(base)+num(growth)*(Math.max(1,level)-1);
const rankValue=(arr,rank)=>{
  if(!Array.isArray(arr)||!arr.length)return 0;
  const clean=arr.map(num);
  return clean[clamp(rank-1,0,clean.length-1)]||0;
};
const magic=(raw,mr,pct=0,flat=0)=>raw*100/(100+Math.max(0,num(mr)*(1-num(pct))-num(flat)));
const physical=(raw,armor,pct=0,flat=0)=>raw*100/(100+Math.max(0,num(armor)*(1-num(pct))-num(flat)));

function sourceText(dd,cg,meraki){
  return [
    dd?.passive?.description,
    ...(dd?.spells||[]).flatMap(s=>[s?.description,s?.tooltip]),
    cg?JSON.stringify(cg):'',
    meraki?JSON.stringify(meraki?.abilities||{}):''
  ].map(text).join(' ');
}

function ratioFromVars(vars){
  const r={ap:0,totalAD:0,bonusAD:0,maxHP:0,bonusHP:0,armor:0,mr:0};
  for(const v of vars||[]){
    const coeff=Array.isArray(v?.coeff)?num(v.coeff[0]):num(v?.coeff);
    const link=lower(v?.link||v?.key);
    if(!coeff)continue;
    if(link.includes('spelldamage')||link==='ap'||link.includes('abilitypower'))r.ap=Math.max(r.ap,coeff);
    else if(link.includes('bonusattackdamage')||link.includes('bonusad'))r.bonusAD=Math.max(r.bonusAD,coeff);
    else if(link.includes('attackdamage')||link.includes('totalad'))r.totalAD=Math.max(r.totalAD,coeff);
    else if(link.includes('maxhealth'))r.maxHP=Math.max(r.maxHP,coeff);
    else if(link.includes('bonushealth'))r.bonusHP=Math.max(r.bonusHP,coeff);
    else if(link.includes('armor'))r.armor=Math.max(r.armor,coeff);
    else if(link.includes('spellblock')||link.includes('magicresist'))r.mr=Math.max(r.mr,coeff);
  }
  return r;
}

function detectDamageType(s,champion){
  const t=lower([s?.description,s?.tooltip].join(' '));
  if(t.includes('true damage'))return 'true';
  if(t.includes('magic damage'))return 'magic';
  if(t.includes('physical damage'))return 'physical';
  const tags=(champion?.tags||[]).map(String);
  return tags.includes('Mage')?'magic':'physical';
}

function extractBaseFromDD(s){
  const candidates=[];
  const effects=s?.effectBurn||s?.effect||[];
  for(let i=1;i<effects.length;i++){
    const e=effects[i];
    if(Array.isArray(e)){
      const arr=e.map(num);
      if(arr.some(v=>v>0))candidates.push(arr);
    }
  }
  if(!candidates.length)return [0,0,0,0,0];
  // Favor a plausible champion-damage sequence rather than mana/cooldown-like arrays.
  candidates.sort((a,b)=>{
    const av=Math.max(...a),bv=Math.max(...b);
    const am=a.reduce((x,y)=>x+y,0)/a.length,bm=b.reduce((x,y)=>x+y,0)/b.length;
    return (bv+bm*.25)-(av+am*.25);
  });
  return candidates[0];
}

function merakiSpell(meraki,key){
  const groups=meraki?.abilities||{};
  const arr=groups[String(key).toUpperCase()]||groups[String(key).toLowerCase()]||[];
  return Array.isArray(arr)?arr[0]:arr;
}

function extractMerakiRatios(obj){
  const out={ap:0,totalAD:0,bonusAD:0,maxHP:0,bonusHP:0,armor:0,mr:0};
  const blob=JSON.stringify(obj||{}).toLowerCase();
  const patterns=[
    ['ap',/(?:ap|ability power)[^0-9]{0,12}(0?\.\d+|\d+(?:\.\d+)?%)/g],
    ['bonusAD',/bonus ad[^0-9]{0,12}(0?\.\d+|\d+(?:\.\d+)?%)/g],
    ['totalAD',/(?:total ad|attack damage)[^0-9]{0,12}(0?\.\d+|\d+(?:\.\d+)?%)/g],
  ];
  for(const [k,re] of patterns){
    let m; while((m=re.exec(blob))){let v=Number(String(m[1]).replace('%',''));if(String(m[1]).includes('%'))v/=100;if(v>0&&v<5)out[k]=Math.max(out[k],v)}
  }
  return out;
}

function compileSpell(ddSpell,key,champion,meraki){
  const m=merakiSpell(meraki,key);
  const desc=[ddSpell?.description,ddSpell?.tooltip,m?.effects?JSON.stringify(m.effects):'',m?.notes].filter(Boolean).join(' ');
  const t=lower(desc);
  let ratios=ratioFromVars(ddSpell?.vars);
  const mr=extractMerakiRatios(m);
  for(const k of Object.keys(ratios))ratios[k]=Math.max(ratios[k],mr[k]||0);
  const base=extractBaseFromDD(ddSpell);
  const rankMax=num(ddSpell?.maxrank)|| (key==='R'?3:5);
  const hasDamage=/damage|damages|deals|strike|blast|explode|detonat|hit/.test(t)&&!(/shield only|does not deal damage/.test(t));
  const hits=Math.max(1,(/twice|two times|2 times|second hit/.test(t)?2:1),(/three times|3 times/.test(t)?3:1));
  const tags={
    dash:/dash|blink|leap|lunge|teleport/.test(t),
    cc:/stun|root|snare|knock|fear|charm|taunt|sleep|slow/.test(t),
    shield:/shield/.test(t),
    heal:/heal|restore health|regener/.test(t),
    execute:/missing health|below \d+%|execute/.test(t),
    onHit:/on-hit|basic attack|next attack|empower.*attack/.test(t),
    multi:/twice|multiple|each|per hit|every/.test(t),
    percentHealth:/max health|current health|missing health/.test(t),
  };
  return {key,name:ddSpell?.name||key,description:text(desc),damageType:detectDamageType(ddSpell,champion),base,ratios,rankMax,hasDamage,hits,tags,source:m?'Meraki+Riot':'Riot'};
}

function compilePassive(dd,cg,meraki,champion){
  const d=dd?.passive||{};
  const desc=[d.description,cg?.passive?.description,meraki?.abilities?.P?JSON.stringify(meraki.abilities.P):''].filter(Boolean).join(' ');
  const t=lower(desc);
  return {
    key:'P',name:d.name||'Passive',description:text(desc),
    hasDamage:/damage|deals|strike|hit|detonat|explode/.test(t),
    stacks:/stack|mark|charge|third|three hit|every \d/.test(t),
    reset:/reset|new target|different target|takedown/.test(t),
    onHit:/on-hit|basic attack|attack/.test(t),
    execute:/missing health|execute|below \d+%/.test(t),
    source:(cg||meraki)?'current+Riot':'Riot'
  };
}

function featuresFromModel(model){
  const spells=Object.values(model.spells||{}); const all=spells.map(s=>lower(s.description)).join(' ')+' '+lower(model.passive?.description);
  const dmg=spells.filter(s=>s.hasDamage);
  const ap=dmg.reduce((n,s)=>n+(s.ratios.ap||0),0);
  const ad=dmg.reduce((n,s)=>n+(s.ratios.totalAD||0)+(s.ratios.bonusAD||0),0);
  const cc=spells.filter(s=>s.tags.cc).length/Math.max(1,spells.length);
  const mobility=spells.filter(s=>s.tags.dash).length/Math.max(1,spells.length);
  const sustain=spells.filter(s=>s.tags.heal||s.tags.shield).length/Math.max(1,spells.length);
  const onHit=spells.filter(s=>s.tags.onHit).length/Math.max(1,spells.length)+(model.passive?.onHit?.2:0);
  const tags=(model.summary?.tags||model.ddragon?.tags||[]).map(String);
  return {
    apWeight:clamp(ap/(ap+ad+0.4),0,1),adWeight:clamp(ad/(ap+ad+0.4),0,1),
    burst:clamp(.45+dmg.length*.09+(model.passive?.hasDamage?.08:0),0,1),
    poke:clamp((all.includes('range')?.12:0)+(spells.filter(s=>/700|800|900|1000/.test(s.description)).length*.12)+(tags.includes('Mage')?.18:0),0,1),
    extended:clamp(.30+(onHit*.35)+(all.includes('cooldown')?.05:0)+(tags.includes('Fighter')?.25:0)+(tags.includes('Marksman')?.30:0),0,1),
    autos:clamp(onHit+(tags.includes('Marksman')?.55:0)+(tags.includes('Fighter')?.25:0),0,1),
    tank:clamp((tags.includes('Tank')?.75:0)+(all.includes('armor')||all.includes('health')?.15:0),0,1),
    cc:clamp(cc*1.4,0,1),mobility:clamp(mobility*1.7,0,1),sustain:clamp(sustain*1.5,0,1),
    execute:clamp(spells.some(s=>s.tags.execute)||model.passive?.execute?.8:.2,0,1),
    lethalityPreference:clamp((ad>ap?0.6:0)+(tags.includes('Assassin')?.35:0),0,1),
    hastePreference:clamp(.45+dmg.length*.07,0,1),critPreference:tags.includes('Marksman')?.8:.05,
    hpPreference:tags.includes('Tank')?.8:tags.includes('Fighter')?.35:.08,
  };
}

function rankPriority(model,level){
  const entries=Object.values(model.spells).filter(s=>s.key!=='R');
  const score=s=>Math.max(...s.base)+100*s.ratios.ap+100*s.ratios.bonusAD+70*s.ratios.totalAD+(s.hasDamage?40:0);
  return entries.sort((a,b)=>score(b)-score(a)).map(s=>s.key);
}
function ranksAt(model,level){
  const p=rankPriority(model,level),r={Q:1,W:1,E:1,R:level>=16?3:level>=11?2:level>=6?1:0};
  let points=Math.max(0,level-1-(r.R||0));
  for(const key of p){const add=Math.min(4,points);r[key]+=add;points-=add}
  for(const key of p){while(points>0&&r[key]<5){r[key]++;points--}}
  return r;
}
function spellRaw(s,rank,stats,target){
  if(!s?.hasDamage)return 0;
  const r=s.ratios||{}; const base=rankValue(s.base,rank);
  return Math.max(0,(base+r.ap*stats.ap+r.totalAD*stats.totalAD+r.bonusAD*stats.bonusAD+r.maxHP*target.maxHealth+r.bonusHP*stats.bonusHP+r.armor*stats.armor+r.mr*stats.magicResist)*Math.max(1,s.hits||1));
}

function getChampionBaseStats(dd,meraki,level){
  const s=dd?.stats||{};
  const baseAD=atLevel(s.attackdamage||60,s.attackdamageperlevel||3,level);
  const hp=atLevel(s.hp||600,s.hpperlevel||100,level);
  const armor=atLevel(s.armor||30,s.armorperlevel||4,level);
  const mr=atLevel(s.spellblock||32,s.spellblockperlevel||2.05,level);
  return {baseAD,totalAD:baseAD,maxHealth:hp,armor,magicResist:mr,attackSpeed:num(s.attackspeed)||.65,range:num(s.attackrange)||175};
}

function objectiveSequence(model,objective,level){
  const ranks=ranksAt(model,level);
  const damageSpells=Object.values(model.spells).filter(s=>s.hasDamage&&ranks[s.key]>0);
  const priority=rankPriority(model,level);
  const map=Object.fromEntries(damageSpells.map(s=>[s.key,s]));
  let keys=[];
  if(objective==='poke')keys=priority.filter(k=>map[k]).slice(0,2);
  else if(objective==='trade')keys=priority.filter(k=>map[k]).slice(0,3);
  else if(objective==='extended')keys=priority.filter(k=>map[k]).concat(priority.filter(k=>map[k]).slice(0,2));
  else keys=priority.filter(k=>map[k]);
  if(ranks.R>0&&map.R&&!keys.includes('R')&&(objective==='burst'||objective==='durability'||objective==='auto'))keys.push('R');
  const autos=objective==='extended'?3:objective==='trade'?1:model.features.autos>.6?2:1;
  return {keys,autos,ranks,label:[...keys, ...(autos?Array(autos).fill('AA'):[])].join(' → ')};
}

function compileChampion({summary,ddragon,cdragon,bin,meraki,role}){
  if(!ddragon)throw new Error('Riot champion detail is required');
  const spells={}; const keys=['Q','W','E','R'];
  keys.forEach((k,i)=>spells[k]=compileSpell(ddragon.spells?.[i],k,ddragon,meraki));
  const passive=compilePassive(ddragon,cdragon,meraki,ddragon);
  const model={summary,ddragon,cdragon,bin,meraki,role,spells,passive};
  model.features=featuresFromModel(model);
  const sources=[cdragon?'CommunityDragon current':null,meraki?'Meraki':null,bin?'CommunityDragon bin':null,'Riot Data Dragon'].filter(Boolean);
  model.sourceLabel=sources.join(' + ');
  const fields=[passive.description,...Object.values(spells).map(s=>s.description)];
  const modeled=Object.values(spells).filter(s=>s.description&&s.base.length).length;
  const ratioCount=Object.values(spells).filter(s=>Object.values(s.ratios).some(v=>v>0)).length;
  model.coverage=clamp(.45+modeled*.08+ratioCount*.045+(cdragon?.12:0)+(meraki?.10:0),.45,1);
  return model;
}

function simulateChampion({model,itemStats={},runeEffects={},level=12,target={},objective='auto',role}){
  const base=getChampionBaseStats(model.ddragon,model.meraki,level);
  const stats={
    ap:num(itemStats.ap),bonusAD:num(itemStats.ad),totalAD:base.totalAD+num(itemStats.ad),bonusHP:num(itemStats.hp),
    armor:base.armor+num(itemStats.armor),magicResist:base.magicResist+num(itemStats.mr),
    attackSpeed:base.attackSpeed*(1+num(itemStats.attackSpeed)+num(runeEffects.attackSpeed)),
  };
  const tgt={maxHealth:num(target.maxHealth)||1900,currentHealth:num(target.currentHealth)||num(target.maxHealth)||1900,armor:num(target.armor)||70,magicResist:num(target.magicResist)||45};
  const seq=objectiveSequence(model,objective,level); let total=0,atProc=0,events=[];
  const deal=(raw,type,label)=>{let d=raw;if(type==='magic')d=magic(raw,tgt.magicResist,itemStats.pctMagicPen,itemStats.flatMagicPen);else if(type==='physical')d=physical(raw,tgt.armor,itemStats.pctArmorPen,itemStats.lethality);tgt.currentHealth-=d;total+=d;events.push({label,type,damage:d});return d};
  for(const key of seq.keys){const s=model.spells[key];deal(spellRaw(s,seq.ranks[key],stats,tgt),s.damageType,key)}
  for(let i=0;i<seq.autos;i++)deal(stats.totalAD,'physical','AA');
  // Passive: data-driven approximation only when passive explicitly contains damage semantics.
  if(model.passive.hasDamage){
    const ratio=(model.features.apWeight*.22*stats.ap)+(model.features.adWeight*.28*stats.bonusAD);
    const p=35+level*5+ratio;deal(p,model.features.apWeight>=model.features.adWeight?'magic':'physical','Passive');
  }
  atProc=total;
  if(runeEffects.magicDamage)deal(runeEffects.magicDamage,'magic','Rune');
  if(runeEffects.physicalDamage)deal(runeEffects.physicalDamage,'physical','Rune');
  if(runeEffects.trueDamage){tgt.currentHealth-=runeEffects.trueDamage;total+=runeEffects.trueDamage;events.push({label:'Rune',type:'true',damage:runeEffects.trueDamage})}
  if(runeEffects.amp)total*=1+runeEffects.amp;
  // Item proc estimates are derived from actual purchased stats/keywords in item-engine.
  if(itemStats.procMagic)total+=magic(itemStats.procMagic+itemStats.procMagicAP*stats.ap,tgt.magicResist,itemStats.pctMagicPen,itemStats.flatMagicPen);
  if(itemStats.procPhysical)total+=physical(itemStats.procPhysical+itemStats.procPhysicalAD*stats.bonusAD,tgt.armor,itemStats.pctArmorPen,itemStats.lethality);
  const durability=num(itemStats.hp)*.35+num(itemStats.armor)*8+num(itemStats.mr)*8;
  const sustain=(num(itemStats.lifeSteal)+num(itemStats.omnivamp))*total*.6+num(runeEffects.sustain);
  const utility=model.features.cc*120+model.features.mobility*65;
  let performance=total;
  if(objective==='extended')performance=total*.92+durability*.18+sustain*.75+itemStats.haste*2.2;
  else if(objective==='durability')performance=total*.48+durability*.72+sustain*.55+utility;
  else if(objective==='poke')performance=total*.9+model.features.poke*170+itemStats.haste*1.8;
  else if(objective==='trade')performance=atProc*.82+total*.18+utility*.25;
  else performance=total+utility*.18;
  return {performance,total,damage:total,atProc,events,comboLabel:seq.label,rankPriority:rankPriority(model,level)};
}

function modelSummary(model,objective='auto',level=12,itemStats={},target={}){
  const sim=simulateChampion({model,itemStats,level,target,objective,runeEffects:{}});
  return {
    passiveSource:model.passive.source,
    abilitySources:Object.fromEntries(Object.entries(model.spells).map(([k,s])=>[k,s.source])),
    comboLabel:sim.comboLabel,
    rankPriority:sim.rankPriority,
    coverage:model.coverage,
  };
}

function buildCurrentChampionUrl(key){return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/${key}.json`;}
function buildBinUrl(id){const n=String(id||'').replace(/[^a-z0-9]/gi,'').toLowerCase();return `https://raw.communitydragon.org/latest/game/data/characters/${n}/${n}.bin.json`;}
function buildMerakiUrl(id){return `https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/${encodeURIComponent(id)}.json`;}

global.PonyChampionEngine={compileChampion,simulateChampion,modelSummary,getChampionBaseStats,buildCurrentChampionUrl,buildBinUrl,buildMerakiUrl,objectiveSequence};
})(window);
