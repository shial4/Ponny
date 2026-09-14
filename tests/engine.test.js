const fs=require('fs'),vm=require('vm'),assert=require('assert');
const ctx={window:{},console};ctx.window=ctx;vm.createContext(ctx);
for(const f of ['src/champion-engine.js','src/rune-engine.js','src/item-engine.js'])vm.runInContext(fs.readFileSync(f,'utf8'),ctx,{filename:f});
const fixture=(name,tags=['Assassin'])=>({id:name,name,tags,stats:{hp:620,hpperlevel:105,armor:30,armorperlevel:4.5,spellblock:32,spellblockperlevel:2.05,attackdamage:64,attackdamageperlevel:3.5,attackspeed:.67,attackrange:175},passive:{name:'Passive',description:'Damaging an enemy marks them and deals bonus damage after repeated hits.'},spells:['Q','W','E','R'].map((k,i)=>({name:k,description:`${k} deals physical damage`,tooltip:`Deals damage with bonus attack damage scaling`,effectBurn:[null,[80+i*10,105+i*10,130+i*10,155+i*10,180+i*10]],vars:[{link:'bonusattackdamage',coeff:[.65]}],maxrank:k==='R'?3:5}))});
for(const champ of [fixture('Qiyana'),fixture('Naafiri'),fixture('Ahri',['Mage','Assassin']),fixture('Malphite',['Tank','Fighter']),fixture('DrMundo',['Tank','Fighter'])]){
 const model=ctx.PonyChampionEngine.compileChampion({summary:champ,ddragon:champ,role:'Mid'});
 assert(model.spells.Q&&model.spells.W&&model.spells.E&&model.spells.R,champ.name+' spells');
 assert(model.coverage>=.45,champ.name+' coverage');
 const sim=ctx.PonyChampionEngine.simulateChampion({model,itemStats:{ad:60,ap:80,gold:3000},level:12,target:{maxHealth:1900,armor:70,magicResist:45},objective:'burst'});
 assert(Number.isFinite(sim.performance)&&sim.performance>0,champ.name+' performance');
}
const q=ctx.PonyChampionEngine.compileChampion({summary:fixture('Qiyana'),ddragon:fixture('Qiyana'),role:'Mid'});
const blood={name:'Bloodthirster',stats:{FlatPhysicalDamageMod:80},description:'18% Life Steal',gold:{total:3400}};
const youmuu={name:"Youmuu's Ghostblade",stats:{FlatPhysicalDamageMod:60},description:'18 Lethality 15 Ability Haste',gold:{total:2800}};
assert(ctx.PonyItemEngine.compatibility(youmuu,q,'burst','Mid')>ctx.PonyItemEngine.compatibility(blood,q,'burst','Mid'),'Qiyana assassin compatibility should prefer lethality first item');
console.log('PASS compiled champion mechanics engine');

// Current-client affinity regression: Ekko must compile AP-primary even when Riot vars are absent.
const ekkoDD={id:'Ekko',name:'Ekko',tags:['Assassin','Mage'],stats:{hp:655,hpperlevel:99,armor:32,armorperlevel:4.2,spellblock:32,spellblockperlevel:2.05,attackdamage:58,attackdamageperlevel:3,attackspeed:.688,attackrange:125},passive:{name:'Z-Drive Resonance',description:'Every third attack or damaging spell deals bonus magic damage.'},spells:[
 {name:'Timewinder',description:'Deals magic damage outbound and return.',tooltip:'magic damage',effectBurn:[null,[80,95,110,125,140],[40,65,90,115,140]],vars:[],maxrank:5},
 {name:'Parallel Convergence',description:'Passive attacks deal bonus magic damage to low health enemies.',tooltip:'shield and stun',effectBurn:[null,[0,0,0,0,0]],vars:[],maxrank:5},
 {name:'Phase Dive',description:'Empowers next attack to deal bonus magic damage.',tooltip:'bonus magic damage',effectBurn:[null,[50,75,100,125,150]],vars:[],maxrank:5},
 {name:'Chronobreak',description:'Deals magic damage.',tooltip:'magic damage',effectBurn:[null,[200,350,500]],vars:[],maxrank:3}
]};
const ekkoCG={roles:['assassin','mage'],tacticalInfo:{damageType:'kMagic',attackType:'melee'},spells:[
 {spellKey:'q',dynamicDescription:'Deals <magicDamage>@Initial@ magic damage</magicDamage> and later <magicDamage>@Return@ magic damage</magicDamage>.',coefficients:{coefficient1:.3,coefficient2:.6},effectAmounts:{Effect1Amount:[0,80,95,110,125,140,0],Effect2Amount:[0,40,65,90,115,140,0]}},
 {spellKey:'w',dynamicDescription:'<spellPassive>Passive:</spellPassive> Attacks below 30% health deal <magicDamage>missing health magic damage</magicDamage>.<br><br><spellActive>Active:</spellActive> Slows and stuns.',coefficients:{coefficient1:1.5,coefficient2:.03},effectAmounts:{}},
 {spellKey:'e',dynamicDescription:'Empowers his next Attack and deals <magicDamage>@TotalDamage@ magic damage</magicDamage>.',coefficients:{coefficient1:.4,coefficient2:1.0},effectAmounts:{Effect1Amount:[0,50,75,100,125,150,0]}},
 {spellKey:'r',dynamicDescription:'Deals <magicDamage>@TotalDamage@ magic damage</magicDamage>.',coefficients:{coefficient1:0,coefficient2:0},effectAmounts:{}}
]};
const ekkoModel=ctx.PonyChampionEngine.compileChampion({summary:ekkoDD,ddragon:ekkoDD,cdragon:ekkoCG,role:'Jungle'});
assert.equal(ekkoModel.features.primaryStat,'AP','Ekko must be AP-primary');
assert(ekkoModel.features.apWeight>.60,'Ekko AP weight must be dominant');
const lich={name:'Lich Bane',stats:{FlatMagicDamageMod:100},description:'Spellblade 10 Ability Haste',gold:{total:2900}};
const profane={name:'Profane Hydra',stats:{FlatPhysicalDamageMod:60},description:'18 Lethality 20 Ability Haste',gold:{total:3200}};
assert(ctx.PonyItemEngine.hardCompatible(lich,ekkoModel,'burst'),'Lich must be compatible with Ekko');
assert(!ctx.PonyItemEngine.hardCompatible(profane,ekkoModel,'burst'),'Profane must be rejected for AP-primary Ekko');

// Current-client affinity regression: Qiyana must be AD-primary and favor lethality over sustain capstones.
const qiyanaDD=fixture('Qiyana');
const qiyanaCG={roles:['assassin'],tacticalInfo:{damageType:'kPhysical',attackType:'melee'},spells:[
 {spellKey:'q',dynamicDescription:'Deals <physicalDamage>physical damage</physicalDamage>.',coefficients:{coefficient1:.4,coefficient2:0},effectAmounts:{}},
 {spellKey:'w',dynamicDescription:'Empowers Attacks and refreshes Q.',coefficients:{coefficient1:0,coefficient2:0},effectAmounts:{}},
 {spellKey:'e',dynamicDescription:'Deals <physicalDamage>physical damage</physicalDamage>.',coefficients:{coefficient1:.4,coefficient2:0},effectAmounts:{}},
 {spellKey:'r',dynamicDescription:'Deals <physicalDamage>physical damage</physicalDamage>.',coefficients:{coefficient1:0,coefficient2:0},effectAmounts:{}}
]};
const qiyanaModel=ctx.PonyChampionEngine.compileChampion({summary:qiyanaDD,ddragon:qiyanaDD,cdragon:qiyanaCG,role:'Mid'});
assert.equal(qiyanaModel.features.primaryStat,'AD','Qiyana must be AD-primary');
assert(ctx.PonyItemEngine.compatibility(youmuu,qiyanaModel,'burst','Mid')>ctx.PonyItemEngine.compatibility(blood,qiyanaModel,'burst','Mid'),'Qiyana should favor lethality first item over Bloodthirster');

// Corki deals lots of magic damage but is still a marksman with AD item affinity.
const corkiDD=fixture('Corki',['Marksman']);
const corkiCG={roles:['marksman'],tacticalInfo:{damageType:'kMagic',attackType:'ranged'},spells:[]};
const corkiModel=ctx.PonyChampionEngine.compileChampion({summary:corkiDD,ddragon:corkiDD,cdragon:corkiCG,role:'Mid'});
assert(corkiModel.features.adWeight>=corkiModel.features.apWeight,'Marksman role prevents magic damage type from forcing AP-only Corki');
console.log('PASS current-client stat-affinity guardrails');

// Structured Meraki mechanics mapping must preserve stat labels, not just damage colour.
const ekkoMeraki={abilities:{
 P:[{name:'Z-Drive Resonance',damageType:'MAGIC_DAMAGE',effects:[{description:'Innate: third stack deals bonus magic damage.',leveling:[{attribute:'Magic Damage',modifiers:[{values:[30,50,70,90,110],units:['','','','','']},{values:[90,90,90,90,90],units:['% AP','% AP','% AP','% AP','% AP']}]}]}]}],
 Q:[{name:'Timewinder',damageType:'MAGIC_DAMAGE',effects:[{description:'Return hit.',leveling:[{attribute:'Total Magic Damage',modifiers:[{values:[120,160,200,240,280],units:['','','','','']},{values:[90,90,90,90,90],units:['% AP','% AP','% AP','% AP','% AP']}]}]}]}],
 E:[{name:'Phase Dive',damageType:'MAGIC_DAMAGE',effects:[{description:'Active bonus magic damage.',leveling:[{attribute:'Bonus Magic Damage',modifiers:[{values:[50,75,100,125,150],units:['','','','','']},{values:[40,40,40,40,40],units:['% AP','% AP','% AP','% AP','% AP']}]}]}]}],
 R:[{name:'Chronobreak',damageType:'MAGIC_DAMAGE',effects:[{description:'Explosion.',leveling:[{attribute:'Magic Damage',modifiers:[{values:[200,350,500],units:['','','']},{values:[175,175,175],units:['% AP','% AP','% AP']}]}]}]}]
}};
const ekkoStructured=ctx.PonyChampionEngine.compileChampion({summary:ekkoDD,ddragon:ekkoDD,cdragon:ekkoCG,meraki:ekkoMeraki,role:'Jungle'});
assert(ekkoStructured.spells.R.ratios.ap>=1.75,'Meraki R AP ratio must compile');
assert(ekkoStructured.passive.ratios.ap>=.90,'Meraki passive AP ratio must compile');
assert(ekkoStructured.features.apWeight>.85,'Structured Ekko model must be strongly AP-primary');
console.log('PASS structured scaling-label compiler');
