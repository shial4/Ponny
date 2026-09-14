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
