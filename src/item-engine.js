(function(global){
'use strict';
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
function parseNumber(desc,label){const re=new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:'+label+')','i');const m=strip(desc).match(re);return m?Number(m[1]):0}
function aggregate(path=[]){
 let s={ap:0,ad:0,hp:0,armor:0,mr:0,attackSpeed:0,crit:0,moveSpeed:0,haste:0,flatMagicPen:0,pctMagicPen:0,lethality:0,pctArmorPen:0,lifeSteal:0,omnivamp:0,gold:0,procMagic:0,procMagicAP:0,procPhysical:0,procPhysicalAD:0};
 for(const i of path){const st=i?.stats||{},d=strip(i?.description).toLowerCase(),name=String(i?.name||'');s.ap+=num(st.FlatMagicDamageMod);s.ad+=num(st.FlatPhysicalDamageMod);s.hp+=num(st.FlatHPPoolMod);s.armor+=num(st.FlatArmorMod);s.mr+=num(st.FlatSpellBlockMod);s.attackSpeed+=num(st.PercentAttackSpeedMod);s.crit+=num(st.FlatCritChanceMod);s.moveSpeed+=num(st.PercentMovementSpeedMod);s.lifeSteal+=num(st.PercentLifeStealMod);s.gold+=num(i?.gold?.total);s.haste+=parseNumber(d,'ability haste|haste');s.flatMagicPen+=parseNumber(d,'magic penetration');s.lethality+=parseNumber(d,'lethality');const mm=d.match(/(\d+(?:\.\d+)?)%\s*magic penetration/i);if(mm)s.pctMagicPen=Math.max(s.pctMagicPen,Number(mm[1])/100);const aa=d.match(/(\d+(?:\.\d+)?)%\s*armor penetration/i);if(aa)s.pctArmorPen=Math.max(s.pctArmorPen,Number(aa[1])/100);if(/lich bane/i.test(name)){s.procMagic+=45;s.procMagicAP+=.45}if(/stormsurge/i.test(name)){s.procMagic+=125;s.procMagicAP+=.10}if(/luden/i.test(name)){s.procMagic+=100;s.procMagicAP+=.10}if(/nashor/i.test(name)){s.procMagic+=30;s.procMagicAP+=.30}if(/rocketbelt/i.test(name)){s.procMagic+=100;s.procMagicAP+=.10}if(/profane hydra/i.test(name)){s.procPhysical+=100;s.procPhysicalAD+=.60}if(/eclipse/i.test(name)){s.procPhysical+=70}}
 if(path.some(i=>/rabadon/i.test(i?.name||'')))s.ap*=1.30;return s;
}
function hardCompatible(item,model,objective='auto'){
 const f=model?.features||{},st=item?.stats||{},d=strip(item?.description).toLowerCase();const ap=num(st.FlatMagicDamageMod),ad=num(st.FlatPhysicalDamageMod),crit=num(st.FlatCritChanceMod),as=num(st.PercentAttackSpeedMod),hp=num(st.FlatHPPoolMod),tankStats=hp+num(st.FlatArmorMod)*8+num(st.FlatSpellBlockMod)*8;const leth=/lethality/.test(d),mpen=/magic penetration/.test(d);const high=f.affinityConfidence>=.62;
 if(high&&f.primaryStat==='AP'){
   if(ad>0&&ap===0&&tankStats<250&&objective!=='durability')return false;
   if((leth||crit>0)&&ap===0)return false;
 }
 if(high&&f.primaryStat==='AD'){
   if(ap>0&&ad===0&&tankStats<250&&objective!=='durability')return false;
   if(mpen&&ad===0)return false;
 }
 if(f.primaryStat==='HP'&&objective==='durability'&&(ap>100||ad>70)&&tankStats<200)return false;
 return true;
}
function compatibility(item,model,objective='auto',role='Jungle'){
 if(!hardCompatible(item,model,objective))return -1e6;
 const f=model?.features||{},st=item?.stats||{},d=strip(item?.description).toLowerCase(),name=String(item?.name||'');const ap=num(st.FlatMagicDamageMod),ad=num(st.FlatPhysicalDamageMod),hp=num(st.FlatHPPoolMod),as=num(st.PercentAttackSpeedMod),crit=num(st.FlatCritChanceMod),armor=num(st.FlatArmorMod),mr=num(st.FlatSpellBlockMod);let v=ap*(.55+1.75*f.apWeight)+ad*(.55+1.75*f.adWeight)+hp*(.01+.10*f.tank)+as*130*f.autos+crit*150*f.critPreference+armor*1.5*f.tank+mr*1.5*f.tank;const leth=/lethality/.test(d),mpen=/magic penetration/.test(d),haste=/ability haste|haste/.test(d),lifesteal=/life steal|lifesteal/.test(d),spellblade=/spellblade/.test(d);if(leth)v+=75*f.lethalityPreference;if(mpen)v+=75*f.magicPenPreference;if(haste)v+=35*f.hastePreference;if(spellblade)v+=38*(f.burst+f.autos*.4);if(lifesteal)v+=18*f.extended-25*f.burst;if(objective==='burst')v+=(ap*f.apWeight+ad*f.adWeight)*.45+(leth||mpen?28:0);if(objective==='trade')v+=(spellblade?28:0)+22*f.burst+15*f.mobility;if(objective==='extended')v+=as*160+hp*.05+(lifesteal?35:0)+25*f.extended;if(objective==='durability')v+=hp*.12+(armor+mr)*2.0;
 if(f.lethalityPreference>.65&&/bloodthirster/i.test(name))v-=120;if(f.burst>.75&&/(bloodthirster|sterak|warmog)/i.test(name))v-=55;if(f.primaryStat==='AP'&&ad>0&&ap===0)v-=180;if(f.primaryStat==='AD'&&ap>0&&ad===0)v-=180;return v;
}
function pathOrderScore(path,model,objective='auto',targetMR=45){
 const f=model?.features||{};let s=0;const names=path.map(i=>String(i?.name||'')),first=path[0],firstDesc=strip(first?.description).toLowerCase();if(!path.every(i=>hardCompatible(i,model,objective)))return -1e6;if(f.lethalityPreference>.6){if(/lethality/.test(firstDesc))s+=65;if(/bloodthirster/i.test(names[0]))s-=120;if(/serylda|lord dominik/i.test(names[0]))s-=70}if(f.apWeight>.6){if(/lich bane|stormsurge|rocketbelt|luden|nashor|dusk/i.test(names[0]))s+=48;if(/rabadon|void staff/i.test(names[0]))s-=80}if(f.tank>.65){if(num(first?.stats?.FlatHPPoolMod)>250)s+=35}if(objective==='trade'&&/lich bane/i.test(names[0]))s+=30;if(objective==='extended'&&f.autos>.5&&num(first?.stats?.PercentAttackSpeedMod)>0)s+=25;if(names[1]&&/void staff|serylda|lord dominik/i.test(names[1]))s+=targetMR>=70?25:-25;if(names[2]&&/void staff|serylda|lord dominik/i.test(names[2]))s+=targetMR>=60?25:5;return s;
}
global.PonyItemEngine={aggregate,compatibility,pathOrderScore,hardCompatible};
})(window);
