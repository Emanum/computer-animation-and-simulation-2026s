# Exercise 1 - Dependency Management

Deployed here https://emanum.github.io/computer-animation-and-simulation-2026s/exercise1/

This exercise uses a very small npm setup:

- local development loads `three` from `node_modules` via the import map in `index.html`
- submission build rewrites the import map to jsDelivr CDN URLs

## Install

```bash
npm install
```

## Local development

```bash
npm run dev
```

## Build submission bundle

```bash
npm run build
```

The output goes to `dist-submission/` and contains:

- `index.html` with CDN imports (`three@<installed-version>`)
- `main.css`
- `js/`

The CDN version is derived from the installed local package, so local and submission stay in sync.

