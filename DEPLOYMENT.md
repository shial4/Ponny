# Deploy/update Pony

## GitHub Pages setting

Use:

```text
Settings → Pages
Source: Deploy from a branch
Branch: master
Folder: / (root)
```

Do not add `actions/deploy-pages`.

## Replace the current repo

Extract this ZIP into your local `Ponny` repository so `index.html` is at repository root.

Then:

```bash
git add -A
git status
git commit -m "Fix Pony SoloQ optimiser and loading UX"
git push
```

Verify that `git status` shows deletion of any old Pages deployment workflow.

## Validate first

```bash
python scripts/validate-project.py
```

## Expected URL

```text
https://shial4.github.io/Ponny/
```
