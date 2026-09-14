# Pony deployment checklist

## 1. Enable Pages once

Go to:

`Settings → Pages → Build and deployment`

Set:

`Source: GitHub Actions`

This is required before `actions/deploy-pages` can create a Pages deployment.

## 2. Push the repository

The workflow runs automatically for `main` and `master`.

You can also run it manually:

`Actions → Build and deploy Pony → Run workflow`

## 3. Expected workflow jobs

The workflow contains two jobs:

1. `Build static site`
2. `Deploy GitHub Pages`

The data refresh is intentionally non-blocking.

If Riot or CommunityDragon is temporarily unavailable, `Build static site` still stages the existing snapshot and Pony's browser runtime can live-fetch the newest available data.

## 4. If `Configure GitHub Pages` fails

Check:

- Settings → Pages → Source is **GitHub Actions**
- Actions are enabled for the repository
- The workflow has `pages: write` and `id-token: write`
- If the repo is private, your GitHub plan supports private Pages

## 5. If `Deploy Pony` fails

Open the failed Actions run and copy the complete text from the `Deploy Pony` step.

The deployment URL alone does not expose private repository logs.

## 6. Local validation

```bash
python scripts/validate-project.py
python3 -m http.server 8080
```

Then open:

```text
http://localhost:8080
```
