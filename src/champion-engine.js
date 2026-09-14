(function(global){
'use strict';
// Reliability invariant: preserve AP scaling, AD scaling, HP scaling and hybrid scaling from champion mechanics before item search.

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const text=v=>String(v||'').replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').trim();
const lower=v=>text(v).toLowerCase();
const atLevel=(base,growth,level)=>num(base)+num(growth)*(Math.max(1,level)-1);
const magic=(raw,mr,pct=0,flat=0)=>raw*100/(100+Math.max(0,num(mr)*(1-num(pct))-num(flat)));
const physical=(raw,armor,pct=0,flat=0)=>raw*100/(100+Math.max(0,num(armor)*(1-num(pct))-num(flat)));
const rankValue=(arr,rank)=>{
  if(!Array.isArray(arr)||!arr.length)return 0;
  const clean=arr.map(num);
  return clean[clamp(rank-1,0,clean.length-1)]||0;
};

function cSpell(cdragon,key){
  return (cdragon?.spells||[]).find(s=>String(s?.spellKey||'').toUpperCase()===String(key).toUpperCase())||null;
}

function ddRatios(vars){
  const out={ap:0,totalAD:0,bonusAD:0,maxHP:0,bonusHP:0,armor:0,mr:0};
  for(const v of vars||[]){
    const coeff=Array.isArray(v?.coeff)?num(v.coeff[0]):num(v?.coeff);
    const link=lower(v?.link||v?.key);
    if(!coeff)continue;
    if(link.includes('spelldamage')||link==='ap'||link.includes('abilitypower'))out.ap+=coeff;
    else if(link.includes('bonusattackdamage')||link.includes('bonusad'))out.bonusAD+=coeff;
    else if(link.includes('attackdamage')||link.includes('totalad'))out.totalAD+=coeff;
    else if(link.includes('maxhealth'))out.maxHP+=coeff;
    else if(link.includes('bonushealth'))out.bonusHP+=coeff;
    else if(link.includes('armor'))out.armor+=coeff;
    else if(link.includes('spellblock')||link.includes('magicresist'))out.mr+=coeff;
  }
  return out;
}

function merakiAbility(meraki,key){
  const arr=meraki?.abilities?.[String(key).toUpperCase()]||[];
  return Array.isArray(arr)?arr[0]:arr||null;
}

function unitRatio(unit){
  const u=lower(unit);
  if(u.includes('% ap')||u==='ap')return 'ap';
  if(u.includes('% bonus ad')||u.includes('bonus attack damage'))return 'bonusAD';
  if(u.includes('% total ad')||u==='% ad'||u.includes('total attack damage'))return 'totalAD';
  if(u.includes('% max health')||u.includes('target maximum health')||u.includes("target's maximum health"))return 'maxHP';
  if(u.includes('% bonus health'))return 'bonusHP';
  if(u.includes('% armor'))return 'armor';
  if(u.includes('% magic resistance')||u.includes('% magic resist'))return 'mr';
  return null;
}

function parseMerakiDamage(meraki,key){
  const ability=merakiAbility(meraki,key);
  if(!ability)return null;
  const direct=[]; const passive=[];
  for(const effect of ability.effects||[]){
    const effectText=lower(effect?.description);
    for(const lvl of effect?.leveling||[]){
      const attr=lower(lvl?.attribute);
      if(!attr.includes('damage')||attr.includes('reduction')||attr.includes('taken'))continue;
      const component={label:lvl.attribute||'Damage',base:[],ratios:{ap:0,totalAD:0,bonusAD:0,maxHP:0,bonusHP:0,armor:0,mr:0},damageType:lower(ability.damageType).includes('magic')?'magic':lower(ability.damageType).includes('true')?'true':'physical'};
      for(const mod of lvl.modifiers||[]){
        const values=(mod?.values||[]).map(num);
        const units=mod?.units||[];
        const ratioKey=unitRatio(units[0]||'');
        if(ratioKey){
          const v=values.length?Math.max(...values):0;
          component.ratios[ratioKey]+=v/100;
        }else if(values.length && units.every(u=>!String(u||'').includes('%'))){
          component.base=values;
        }
      }
      if(component.base.length||Object.values(component.ratios).some(v=>v>0)){
        if(effectText.startsWith('passive:')||effectText.startsWith('innate:'))passive.push(component);else direct.push(component);
      }
    }
  }
  const total=direct.filter(x=>lower(x.label).startsWith('total '));
  return {ability,direct:total.length?total:direct,passive};
}

function normalizeCurrentValues(arr,maxRank){
  const vals=(arr||[]).map(num);
  if(vals.length>=maxRank+1)return vals.slice(1,maxRank+1);
  return vals.slice(0,maxRank);
}

function currentDamageBases(current,key){
  if(!current)return [];
  const maxRank=String(key).toUpperCase()==='R'?3:5;
  const damageTags=(String(current.dynamicDescription||'').match(/<(?:magicDamage|physicalDamage|trueDamage)>/g)||[]).length;
  if(!damageTags)return [];
  const arrays=[];
  for(const value of Object.values(current.effectAmounts||{})){
    if(!Array.isArray(value))continue;
    const a=normalizeCurrentValues(value,maxRank);
    if(a.length!==maxRank)continue;
    const max=Math.max(...a),min=Math.min(...a),delta=a[a.length-1]-a[0];
    if(max<=0||max>1000||min<0||delta<=0)continue;
    arrays.push(a);
  }
  arrays.sort((a,b)=>(b[b.length-1]-b[0])-(a[a.length-1]-a[0]));
  return arrays.slice(0,Math.max(1,Math.min(damageTags,2)));
}

function ddDamageBase(spell,maxRank,damageMentions=1){
  const arrays=[];
  for(const e of spell?.effectBurn||spell?.effect||[]){
    if(!Array.isArray(e))continue;
    const a=e.map(num).filter((_,i)=>i<maxRank);
    if(a.length!==maxRank)continue;
    const max=Math.max(...a),min=Math.min(...a),delta=a[a.length-1]-a[0];
    if(max<=0||max>1200||min<0||delta<0)continue;
    arrays.push(a);
  }
  arrays.sort((a,b)=>(b[b.length-1]-b[0])-(a[a.length-1]-a[0]));
  const chosen=arrays.slice(0,Math.max(1,Math.min(damageMentions,2)));
  if(!chosen.length)return Array(maxRank).fill(0);
  return Array.from({length:maxRank},(_,i)=>chosen.reduce((s,a)=>s+num(a[i]),0));
}

function ratioStrength(r){return Object.values(r||{}).reduce((a,b)=>a+Math.abs(num(b)),0)}

function fallbackAffinity(summary,cdragon,ddragon){
  const roles=new Set([...(cdragon?.roles||[]),...(summary?.tags||[]),...(ddragon?.tags||[])].map(x=>String(x).toLowerCase()));
  const damage=String(cdragon?.tacticalInfo?.damageType||'').toLowerCase();
  const attack=String(cdragon?.tacticalInfo?.attackType||'').toLowerCase();
  if(roles.has('marksman'))return {ap:.12,ad:.82,hp:.06,confidence:.80,source:'marksman role'};
  if(roles.has('assassin')&&damage.includes('magic'))return {ap:.88,ad:.08,hp:.04,confidence:.88,source:'current client magic assassin'};
  if(roles.has('assassin')&&damage.includes('physical'))return {ap:.04,ad:.92,hp:.04,confidence:.90,source:'current client physical assassin'};
  if(roles.has('mage')&&damage.includes('magic'))return {ap:.88,ad:.06,hp:.06,confidence:.85,source:'current client mage'};
  if(roles.has('assassin')&&roles.has('mage')&&!damage)return {ap:.78,ad:.16,hp:.06,confidence:.66,source:'mage-assassin role fallback'};
  if(roles.has('mage')&&!damage&&!roles.has('fighter'))return {ap:.74,ad:.12,hp:.08,confidence:.62,source:'mage role fallback'};
  if(roles.has('assassin')&&!damage)return {ap:.10,ad:.78,hp:.05,confidence:.60,source:'assassin role fallback'};
  if(roles.has('tank'))return {ap:damage.includes('magic')?.28:.08,ad:damage.includes('physical')?.22:.08,hp:.58,confidence:.68,source:'tank role'};
  if(roles.has('fighter'))return {ap:damage.includes('magic')?.30:.08,ad:damage.includes('physical')?.58:.38,hp:.20,confidence:.64,source:'fighter role'};
  if(attack==='ranged')return {ap:damage.includes('magic')?.35:.10,ad:.55,hp:.05,confidence:.52,source:'ranged fallback'};
  return {ap:damage.includes('magic')?.60:.15,ad:damage.includes('physical')?.60:.25,hp:.10,confidence:.45,source:'client fallback'};
}

function currentRatioFallback(current,baseRatios,affinity,description,tags){
  if(ratioStrength(baseRatios)>=.12)return baseRatios;
  const coeffs=Object.values(current?.coefficients||{}).map(num).filter(v=>v>0&&v<=3);
  if(!coeffs.length)return baseRatios;
  const out={...baseRatios};
  const t=lower(description); const attacky=/next attack|basic attack|attacks deal|empower.*attack/.test(t);
  if(affinity.ad>=.65){
    const sum=coeffs.reduce((a,b)=>a+b,0);
    if(tags?.hasMarksman||attacky)out.totalAD+=sum;else out.bonusAD+=sum;
  }else if(affinity.ap>=.65){
    let ap=0,ad=0;
    for(const c of coeffs){
      if(attacky&&c>=.8&&c<=1.25)ad+=c;else ap+=c;
    }
    out.ap+=ap;out.totalAD+=ad;
  }
  return out;
}

function directText(current,dd,meraki){
  return [current?.dynamicDescription,current?.description,dd?.tooltip,dd?.description,meraki?.blurb].filter(Boolean).join(' ');
}

function compileSpell(dd,key,summary,cdragon,meraki,affinity,tags){
  const current=cSpell(cdragon,key); const m=merakiAbility(meraki,key); const parsed=parseMerakiDamage(meraki,key);
  const description=directText(current,dd,m); const t=lower(description);
  const maxRank=String(key).toUpperCase()==='R'?3:5;
  const damageMentions=(String(current?.dynamicDescription||dd?.tooltip||'').match(/<(?:magicDamage|physicalDamage|trueDamage)>/g)||[]).length||1;
  let ratios=ddRatios(dd?.vars);
  // Meraki is the best source for identifying WHAT stat a spell scales from.
  if(parsed?.direct?.length){
    const combined={ap:0,totalAD:0,bonusAD:0,maxHP:0,bonusHP:0,armor:0,mr:0};
    for(const c of parsed.direct)for(const k of Object.keys(combined))combined[k]+=num(c.ratios?.[k]);
    if(ratioStrength(combined)>ratioStrength(ratios))ratios=combined;
  }
  ratios=currentRatioFallback(current,ratios,affinity,description,tags);

  let base=[];
  if(parsed?.direct?.length){
    base=Array(maxRank).fill(0);
    for(const c of parsed.direct){
      const vals=c.base||[];
      for(let i=0;i<maxRank;i++)base[i]+=num(vals[Math.min(i,vals.length-1)]);
    }
  }
  const curr=currentDamageBases(current,key);
  if(curr.length){base=Array.from({length:maxRank},(_,i)=>curr.reduce((s,a)=>s+num(a[i]),0));}
  if(!base.length||!base.some(v=>v>0))base=ddDamageBase(dd,maxRank,damageMentions);

  const activePart=String(current?.dynamicDescription||'').split(/<br><br><spellActive>/i)[1]||String(current?.dynamicDescription||'');
  const passiveOnly=/<spellPassive>/i.test(String(current?.dynamicDescription||''))&&!/(?:magicDamage|physicalDamage|trueDamage)>/.test(activePart);
  const hasDamage=!passiveOnly && (parsed?.direct?.length||/<(?:magicDamage|physicalDamage|trueDamage)>/.test(String(current?.dynamicDescription||''))||/deals? .*damage|damages|explode|detonat|strike/.test(t));
  let damageType='physical';
  if(parsed?.ability?.damageType)damageType=lower(parsed.ability.damageType).includes('magic')?'magic':lower(parsed.ability.damageType).includes('true')?'true':'physical';
  else if(/<magicDamage>|magic damage/i.test(String(current?.dynamicDescription||'')))damageType='magic';
  else if(/<trueDamage>|true damage/i.test(String(current?.dynamicDescription||'')))damageType='true';
  else if(/<physicalDamage>|physical damage/i.test(String(current?.dynamicDescription||'')))damageType='physical';
  else if(String(cdragon?.tacticalInfo?.damageType||'').toLowerCase().includes('magic'))damageType='magic';

  return {
    key:String(key).toUpperCase(),name:current?.name||dd?.name||m?.name||key,description:text(description),damageType,base,ratios,maxRank,hasDamage:Boolean(hasDamage),
    tags:{dash:/dash|blink|leap|lunge|teleport/.test(t),cc:/stun|root|snare|knock|fear|charm|taunt|sleep|slow/.test(t),shield:/shield/.test(t),heal:/heal|restore health|regener/.test(t),execute:/missing health|below \d+%|execute/.test(t),onHit:/on-hit|basic attack|next attack|empower.*attack/.test(t),multi:/twice|multiple|each|per hit|every/.test(t),percentHealth:/max health|current health|missing health/.test(t),passiveDamage:passiveOnly},
    source:[current?'CommunityDragon current':null,parsed?'Meraki mechanics':null,dd?'Riot':null].filter(Boolean).join(' + ')
  };
}

function compilePassive(dd,cdragon,meraki,affinity){
  const current=cdragon?.passive||{}; const m=merakiAbility(meraki,'P');
  const description=[current?.description,dd?.passive?.description,m?JSON.stringify(m.effects||[]):''].filter(Boolean).join(' '); const t=lower(description);
  const parsed=parseMerakiDamage(meraki,'P');
  let ratios={ap:0,totalAD:0,bonusAD:0,maxHP:0,bonusHP:0,armor:0,mr:0}; let base=[]; let damageType='magic';
  if(parsed){
    const comps=[...(parsed.direct||[]),...(parsed.passive||[])];
    for(const c of comps){for(const k of Object.keys(ratios))ratios[k]+=num(c.ratios?.[k]);if(c.base?.length&&!base.length)base=c.base;damageType=c.damageType||damageType;}
  }
  // Text fallback for common percent scalings in passive descriptions.
  const apMatch=t.match(/\(\+?\s*(\d+(?:\.\d+)?)%\s*ap\)/i);if(apMatch)ratios.ap=Math.max(ratios.ap,Number(apMatch[1])/100);
  const badMatch=t.match(/\(\+?\s*(\d+(?:\.\d+)?)%\s*bonus\s*(?:ad|attack damage)\)/i);if(badMatch)ratios.bonusAD=Math.max(ratios.bonusAD,Number(badMatch[1])/100);
  return {key:'P',name:current?.name||dd?.passive?.name||m?.name||'Passive',description:text(description),hasDamage:Boolean(parsed?.direct?.length||parsed?.passive?.length||/damage|deals|strike|hit|detonat|explode/.test(t)),stacks:/stack|mark|charge|third|three hit|every \d/.test(t),reset:/reset|new target|different target|takedown/.test(t),onHit:/on-hit|basic attack|attack/.test(t),execute:/missing health|execute|below \d+%/.test(t),ratios,base,damageType,source:[current?'CommunityDragon current':null,m?'Meraki mechanics':null,'Riot'].filter(Boolean).join(' + ')};
}

function inferAffinity(model){
  const fallback=fallbackAffinity(model.summary,model.cdragon,model.ddragon);
  const spells=Object.values(model.spells||{}).filter(s=>s.hasDamage); const all=[...spells,model.passive];
  let ap=0,ad=0,hp=0;
  for(const s of all){ap+=num(s?.ratios?.ap);ad+=num(s?.ratios?.bonusAD)+num(s?.ratios?.totalAD);hp+=num(s?.ratios?.maxHP)+num(s?.ratios?.bonusHP)}
  const observed=ap+ad+hp;
  if(observed>=.35){
    const sum=observed||1;
    const obs={ap:ap/sum,ad:ad/sum,hp:hp/sum};
    const confidence=clamp(.62+Math.min(.28,observed*.10)+(model.meraki?.08:0),.62,.96);
    const blend=.78;
    return {ap:clamp(obs.ap*blend+fallback.ap*(1-blend),0,1),ad:clamp(obs.ad*blend+fallback.ad*(1-blend),0,1),hp:clamp(obs.hp*blend+fallback.hp*(1-blend),0,1),confidence,source:'observed spell scalings + '+fallback.source};
  }
  return fallback;
}

function featuresFromModel(model){
  const spells=Object.values(model.spells||{}),dmg=spells.filter(s=>s.hasDamage); const all=lower(spells.map(s=>s.description).join(' ')+' '+model.passive?.description);
  const a=model.affinity||{ap:.33,ad:.33,hp:.1}; const tags=new Set([...(model.summary?.tags||[]),...(model.cdragon?.roles||[])].map(x=>String(x).toLowerCase()));
  const cc=spells.filter(s=>s.tags.cc).length/Math.max(1,spells.length),mob=spells.filter(s=>s.tags.dash).length/Math.max(1,spells.length),sustain=spells.filter(s=>s.tags.heal||s.tags.shield).length/Math.max(1,spells.length),onHit=spells.filter(s=>s.tags.onHit||s.tags.passiveDamage).length/Math.max(1,spells.length)+(model.passive?.onHit?.2:0);
  const physicalAssassin=tags.has('assassin')&&a.ad>.6,magicAssassin=tags.has('assassin')&&a.ap>.6,marksman=tags.has('marksman');
  return {apWeight:a.ap,adWeight:a.ad,hpWeight:a.hp,affinityConfidence:a.confidence,primaryStat:a.ap>=.62&&a.ad<.45?'AP':a.ad>=.62&&a.ap<.45?'AD':a.hp>=.45?'HP':'HYBRID',burst:clamp(.42+dmg.length*.09+(model.passive?.hasDamage?.08:0)+(tags.has('assassin')?.12:0),0,1),poke:clamp((all.includes('range')?.12:0)+(tags.has('mage')?.18:0)+(marksman?.08:0),0,1),extended:clamp(.25+onHit*.32+(tags.has('fighter')?.25:0)+(marksman?.32:0),0,1),autos:clamp(onHit+(marksman?.55:0)+(tags.has('fighter')?.22:0),0,1),tank:clamp((tags.has('tank')?.76:0)+a.hp*.35,0,1),cc:clamp(cc*1.45,0,1),mobility:clamp(mob*1.7+(tags.has('assassin')?.15:0),0,1),sustain:clamp(sustain*1.5,0,1),execute:clamp(spells.some(s=>s.tags.execute)||model.passive?.execute?.82:.18,0,1),lethalityPreference:clamp(physicalAssassin?.92:(a.ad>.6?.55:.05),0,1),magicPenPreference:clamp(magicAssassin?.92:(a.ap>.6?.60:.05),0,1),hastePreference:clamp(.42+dmg.length*.07,0,1),critPreference:marksman?.78:.03,hpPreference:tags.has('tank')?.82:tags.has('fighter')?.30:.06};
}

function rankPriority(model){
  const entries=Object.values(model.spells).filter(s=>s.key!=='R');
  const score=s=>Math.max(0,...s.base)+110*num(s.ratios.ap)+110*num(s.ratios.bonusAD)+80*num(s.ratios.totalAD)+(s.hasDamage?40:0)+(s.tags.passiveDamage?-30:0);
  return entries.sort((a,b)=>score(b)-score(a)).map(s=>s.key);
}
function ranksAt(model,level){
  const p=rankPriority(model),r={Q:1,W:1,E:1,R:level>=16?3:level>=11?2:level>=6?1:0}; let points=Math.max(0,level-1-(r.R||0));
  for(const key of p){const add=Math.min(4,points);r[key]+=add;points-=add}for(const key of p){while(points>0&&r[key]<5){r[key]++;points--}}return r;
}
function spellRaw(s,rank,stats,target){
  if(!s?.hasDamage)return 0; const r=s.ratios||{};
  return Math.max(0,rankValue(s.base,rank)+r.ap*stats.ap+r.totalAD*stats.totalAD+r.bonusAD*stats.bonusAD+r.maxHP*target.maxHealth+r.bonusHP*stats.bonusHP+r.armor*stats.armor+r.mr*stats.magicResist);
}

function getChampionBaseStats(dd,meraki,level){
  const s=dd?.stats||{}; const ms=meraki?.stats||{};
  const flat=(obj,key,ddv)=>num(obj?.[key]?.flat)||num(ddv); const per=(obj,key,ddv)=>num(obj?.[key]?.perLevel)||num(ddv);
  const baseAD=atLevel(flat(ms,'attackDamage',s.attackdamage||60),per(ms,'attackDamage',s.attackdamageperlevel||3),level);
  return {baseAD,totalAD:baseAD,maxHealth:atLevel(flat(ms,'health',s.hp||600),per(ms,'health',s.hpperlevel||100),level),armor:atLevel(flat(ms,'armor',s.armor||30),per(ms,'armor',s.armorperlevel||4),level),magicResist:atLevel(flat(ms,'magicResistance',s.spellblock||32),per(ms,'magicResistance',s.spellblockperlevel||2.05),level),attackSpeed:num(ms?.attackSpeed?.flat)||num(s.attackspeed)||.65,range:num(ms?.attackRange?.flat)||num(s.attackrange)||175};
}

function objectiveSequence(model,objective,level){
  const ranks=ranksAt(model,level); const damage=Object.values(model.spells).filter(s=>s.hasDamage&&ranks[s.key]>0&&!s.tags.passiveDamage); const priority=rankPriority(model); const map=Object.fromEntries(damage.map(s=>[s.key,s])); let keys=[];
  if(objective==='poke')keys=priority.filter(k=>map[k]).slice(0,2);else if(objective==='trade')keys=priority.filter(k=>map[k]).slice(0,3);else if(objective==='extended')keys=priority.filter(k=>map[k]).concat(priority.filter(k=>map[k]).slice(0,2));else keys=priority.filter(k=>map[k]);
  if(ranks.R>0&&map.R&&!keys.includes('R')&&(objective==='burst'||objective==='durability'||objective==='auto'))keys.push('R');
  const autos=objective==='extended'?3:objective==='trade'?1:model.features.autos>.6?2:1;
  return {keys,autos,ranks,label:[...keys,...(autos?Array(autos).fill('AA'):[])].join(' → ')};
}

function compileChampion({summary,ddragon,cdragon,bin,meraki,role}){
  if(!ddragon)throw new Error('Riot champion detail is required');
  const provisional={summary,ddragon,cdragon,meraki}; const affinitySeed=fallbackAffinity(summary,cdragon,ddragon); const roles=new Set([...(summary?.tags||[]),...(cdragon?.roles||[])].map(x=>String(x).toLowerCase())); const tags={hasMarksman:roles.has('marksman')};
  const spells={}; for(const [i,k] of ['Q','W','E','R'].entries())spells[k]=compileSpell(ddragon.spells?.[i],k,summary,cdragon,meraki,affinitySeed,tags);
  const passive=compilePassive(ddragon,cdragon,meraki,affinitySeed); const model={summary,ddragon,cdragon,bin,meraki,role,spells,passive};
  model.affinity=inferAffinity(model); model.features=featuresFromModel(model); model.sourceLabel=[cdragon?'CommunityDragon current':null,meraki?'Meraki mechanics':null,bin?'CommunityDragon bin':null,'Riot Data Dragon'].filter(Boolean).join(' + ');
  const modeled=Object.values(spells).filter(s=>s.description&&s.hasDamage).length,ratioCount=Object.values(spells).filter(s=>ratioStrength(s.ratios)>.05).length; model.coverage=clamp(.46+modeled*.07+ratioCount*.06+(cdragon?.10:0)+(meraki?.14:0),.46,1);
  model.integrity={primaryStat:model.features.primaryStat,affinity:model.affinity,coverage:model.coverage,source:model.sourceLabel};
  return model;
}

function simulateChampion({model,itemStats={},runeEffects={},level=12,target={},objective='auto'}){
  const base=getChampionBaseStats(model.ddragon,model.meraki,level);
  const stats={ap:num(itemStats.ap)+num(runeEffects.bonusAP),bonusAD:num(itemStats.ad)+num(runeEffects.bonusAD),totalAD:base.totalAD+num(itemStats.ad)+num(runeEffects.bonusAD),bonusHP:num(itemStats.hp),armor:base.armor+num(itemStats.armor),magicResist:base.magicResist+num(itemStats.mr),attackSpeed:base.attackSpeed*(1+num(itemStats.attackSpeed)+num(runeEffects.attackSpeed))};
  const tgt={maxHealth:num(target.maxHealth)||1900,currentHealth:num(target.currentHealth)||num(target.maxHealth)||1900,armor:num(target.armor)||70,magicResist:num(target.magicResist)||45}; const seq=objectiveSequence(model,objective,level); let total=0,events=[];
  const deal=(raw,type,label)=>{let d=raw;if(type==='magic')d=magic(raw,tgt.magicResist,itemStats.pctMagicPen,itemStats.flatMagicPen);else if(type==='physical')d=physical(raw,tgt.armor,itemStats.pctArmorPen,itemStats.lethality);tgt.currentHealth-=d;total+=d;events.push({label,type,damage:d});return d};
  for(const key of seq.keys){const s=model.spells[key];deal(spellRaw(s,seq.ranks[key],stats,tgt),s.damageType,key)}
  for(let i=0;i<seq.autos;i++)deal(stats.totalAD,'physical','AA');
  if(model.passive.hasDamage){
    const p=rankValue(model.passive.base,Math.min(model.passive.base?.length||1,1)) + num(model.passive.ratios?.ap)*stats.ap+num(model.passive.ratios?.totalAD)*stats.totalAD+num(model.passive.ratios?.bonusAD)*stats.bonusAD;
    if(p>0)deal(p,model.passive.damageType|| (model.features.apWeight>=model.features.adWeight?'magic':'physical'),'Passive');
    else {const fallback=30+level*4+(model.features.apWeight*.18*stats.ap)+(model.features.adWeight*.22*stats.bonusAD);deal(fallback,model.features.apWeight>=model.features.adWeight?'magic':'physical','Passive (estimated)')}
  }
  const atProc=total;
  const adaptiveType=model.features.apWeight>=model.features.adWeight?'magic':'physical';
  if(runeEffects.adaptiveDamage)deal(runeEffects.adaptiveDamage,adaptiveType,'Rune');
  if(runeEffects.magicDamage)deal(runeEffects.magicDamage,'magic','Rune');if(runeEffects.physicalDamage)deal(runeEffects.physicalDamage,'physical','Rune');if(runeEffects.trueDamage){tgt.currentHealth-=runeEffects.trueDamage;total+=runeEffects.trueDamage;events.push({label:'Rune',type:'true',damage:runeEffects.trueDamage})}
  if(runeEffects.amp)total*=1+runeEffects.amp;
  if(itemStats.procMagic)total+=magic(itemStats.procMagic+itemStats.procMagicAP*stats.ap,tgt.magicResist,itemStats.pctMagicPen,itemStats.flatMagicPen);if(itemStats.procPhysical)total+=physical(itemStats.procPhysical+itemStats.procPhysicalAD*stats.bonusAD,tgt.armor,itemStats.pctArmorPen,itemStats.lethality);
  const durability=num(itemStats.hp)*.35+num(itemStats.armor)*8+num(itemStats.mr)*8,sustain=(num(itemStats.lifeSteal)+num(itemStats.omnivamp))*total*.6+num(runeEffects.sustain),utility=model.features.cc*120+model.features.mobility*65; let performance=total;
  if(objective==='extended')performance=total*.92+durability*.18+sustain*.75+itemStats.haste*2.2;else if(objective==='durability')performance=total*.48+durability*.72+sustain*.55+utility;else if(objective==='poke')performance=total*.9+model.features.poke*170+itemStats.haste*1.8;else if(objective==='trade')performance=atProc*.82+total*.18+utility*.25;else performance=total+utility*.18;
  return {performance,total,damage:total,atProc,events,comboLabel:seq.label,rankPriority:rankPriority(model)};
}

function modelSummary(model){return {passiveSource:model.passive.source,abilitySources:Object.fromEntries(Object.entries(model.spells).map(([k,s])=>[k,s.source])),rankPriority:rankPriority(model),coverage:model.coverage,primaryStat:model.features.primaryStat,affinity:model.affinity};}
function buildCurrentChampionUrl(key){return `https://raw.communitydragon.org/latest/plugins/rcp-be-lol-game-data/global/default/v1/champions/${key}.json`;}
function buildBinUrl(id){const n=String(id||'').replace(/[^a-z0-9]/gi,'').toLowerCase();return `https://raw.communitydragon.org/latest/game/data/characters/${n}/${n}.bin.json`;}
function buildMerakiUrl(id){return `https://cdn.merakianalytics.com/riot/lol/resources/latest/en-US/champions/${encodeURIComponent(id)}.json`;}

global.PonyChampionEngine={compileChampion,simulateChampion,modelSummary,getChampionBaseStats,buildCurrentChampionUrl,buildBinUrl,buildMerakiUrl,objectiveSequence};
})(window);
