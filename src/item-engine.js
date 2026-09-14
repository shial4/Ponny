(function(global){
'use strict';
const num=v=>Number.isFinite(Number(v))?Number(v):0;
const strip=s=>String(s||'').replace(/<[^>]+>/g,' ').replace(/&nbsp;/g,' ').replace(/\s+/g,' ');
function parseNumber(desc,label){const re=new RegExp('(\\d+(?:\\.\\d+)?)\\s*(?:' + label + ')','i');const m=strip(desc).match(re);return m?Number(m[1]):0}
function aggregate(path=[]){
 let s={ap:0,ad:0,hp:0,armor:0,mr:0,attackSpeed:0,crit:0,moveSpeed:0,haste:0,flatMagicPen:0,pctMagicPen:0,lethality:0,pctArmorPen:0,lifeSteal:0,omnivamp:0,gold:0,procMagic:0,procMagicAP:0,procPhysical:0,procPhysicalAD:0};
 for(const i of path){const st=i?.stats||{},d=strip(i?.description).toLowerCase(),name=String(i?.name||'');s.ap+=num(st.FlatMagicDamageMod);s.ad+=num(st.FlatPhysicalDamageMod);s.hp+=num(st.FlatHPPoolMod);s.armor+=num(st.FlatArmorMod);s.mr+=num(st.FlatSpellBlockMod);s.attackSpeed+=num(st.PercentAttackSpeedMod);s.crit+=num(st.FlatCritChanceMod);s.moveSpeed+=num(st.PercentMovementSpeedMod);s.lifeSteal+=num(st.PercentLifeStealMod);s.gold+=num(i?.gold?.total);
  s.haste+=parseNumber(d,'ability haste|haste');s.flatMagicPen+=parseNumber(d,'magic penetration');s.lethality+=parseNumber(d,'lethality');
  const mm=d.match(/(\d+(?:\.\d+)?)%\s*magic penetration/i);if(mm)s.pctMagicPen=Math.max(s.pctMagicPen,Number(mm[1])/100);
  const aa=d.match(/(\d+(?:\.\d+)?)%\s*armor penetration/i);if(aa)s.pctArmorPen=Math.max(s.pctArmorPen,Number(aa[1])/100);
  if(/lich bane/i.test(name)){s.procMagic+=45;s.procMagicAP+=.45}
  if(/stormsurge/i.test(name)){s.procMagic+=125;s.procMagicAP+=.10}
  if(/luden/i.test(name)){s.procMagic+=100;s.procMagicAP+=.10}
  if(/nashor/i.test(name)){s.procMagic+=30;s.procMagicAP+=.30}
  if(/rocketbelt/i.test(name)){s.procMagic+=100;s.procMagicAP+=.10}
  if(/profane hydra/i.test(name)){s.procPhysical+=100;s.procPhysicalAD+=.60}
  if(/eclipse/i.test(name)){s.procPhysical+=70}
 }
 if(path.some(i=>/rabadon/i.test(i?.name||'')))s.ap*=1.30;
 return s;
}
function compatibility(item,model,objective='auto',role='Jungle'){
 const f=model?.features||{},st=item?.stats||{},d=strip(item?.description).toLowerCase(),name=String(item?.name||'');
 const ap=num(st.FlatMagicDamageMod),ad=num(st.FlatPhysicalDamageMod),hp=num(st.FlatHPPoolMod),as=num(st.PercentAttackSpeedMod),crit=num(st.FlatCritChanceMod),armor=num(st.FlatArmorMod),mr=num(st.FlatSpellBlockMod);
 let v=ap*(.7+1.4*f.apWeight)+ad*(.7+1.4*f.adWeight)+hp*(.01+.10*f.tank)+as*130*f.autos+crit*150*f.critPreference+armor*1.5*f.tank+mr*1.5*f.tank;
 const leth=/lethality/.test(d),mpen=/magic penetration/.test(d),haste=/ability haste|haste/.test(d),lifesteal=/life steal|lifesteal/.test(d),spellblade=/spellblade/.test(d);
 if(leth)v+=60*f.lethalityPreference;if(mpen)v+=55*f.apWeight;if(haste)v+=35*f.hastePreference;if(spellblade)v+=38*(f.burst+f.autos*.4);if(lifesteal)v+=18*f.extended-20*f.burst;
 if(objective==='burst')v+=(ap*f.apWeight+ad*f.adWeight)*.4+(leth||mpen?25:0);
 if(objective==='trade')v+=(spellblade?25:0)+20*f.burst+15*f.mobility;
 if(objective==='extended')v+=as*160+hp*.05+(lifesteal?35:0)+25*f.extended;
 if(objective==='durability')v+=hp*.12+(armor+mr)*2.0;
 // Do not let raw AD alone push sustain capstones to the top for ability assassins.
 if(f.lethalityPreference>.65&&/bloodthirster/i.test(name))v-=75;
 if(f.burst>.75&&/(bloodthirster|sterak|warmog)/i.test(name))v-=45;
 return v;
}
function pathOrderScore(path,model,objective='auto',targetMR=45){
 const f=model?.features||{};let s=0;const names=path.map(i=>String(i?.name||''));
 const first=path[0],firstDesc=strip(first?.description).toLowerCase();
 if(f.lethalityPreference>.6){if(/lethality/.test(firstDesc))s+=55;if(/bloodthirster/i.test(names[0]))s-=90;if(/serylda|lord dominik/i.test(names[0]))s-=60}
 if(f.apWeight>.6){if(/lich bane|stormsurge|rocketbelt|luden|nashor/i.test(names[0]))s+=40;if(/rabadon|void staff/i.test(names[0]))s-=65}
 if(f.tank>.65){if(num(first?.stats?.FlatHPPoolMod)>250)s+=35}
 if(objective==='trade'&&/lich bane/i.test(names[0]))s+=30;
 if(objective==='extended'&&f.autos>.5&&num(first?.stats?.PercentAttackSpeedMod)>0)s+=25;
 if(names[1]&&/void staff|serylda|lord dominik/i.test(names[1]))s+=targetMR>=70?25:-20;
 if(names[2]&&/void staff|serylda|lord dominik/i.test(names[2]))s+=targetMR>=60?25:5;
 return s;
}
global.PonyItemEngine={aggregate,compatibility,pathOrderScore};
})(window);
