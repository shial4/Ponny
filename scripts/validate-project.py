#!/usr/bin/env python3
from pathlib import Path
import re, subprocess, sys
root=Path(__file__).resolve().parents[1]
required=['index.html','assets/pony.svg','site.webmanifest','.nojekyll','src/champion-engine.js','src/rune-engine.js','src/item-engine.js','tests/engine.test.js','tests/all-roster.test.js']
errors=[]
for rel in required:
 p=root/rel
 if not p.is_file():errors.append('missing '+rel)
html=(root/'index.html').read_text(encoding='utf-8')
for marker in ['compileSelectedChampionModel','PonyChampionEngine','PonyRuneEngine','PonyItemEngine','allLegalRunePages','Ranked Solo/Duo']:
 if marker not in html:errors.append('index missing '+marker)
if 'function simulateGeneric' in html:errors.append('generic simulator must not return')
for rel in ['src/champion-engine.js','src/rune-engine.js','src/item-engine.js']:
 p=subprocess.run(['node','--check',str(root/rel)],capture_output=True,text=True)
 if p.returncode:errors.append(rel+' syntax: '+p.stderr)
if errors:
 print('VALIDATION FAILED');[print('-',e) for e in errors];sys.exit(1)
print('PASS project validation')
