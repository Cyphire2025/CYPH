# Full Security Scan Runbook (Cyphire)

This runbook is for complete coverage of:
- `frontend` SPA
- `admin` SPA
- `workroom` SPA
- `backend` API

## 1) Start Production-like Targets

Use preview builds for frontend apps (not Vite dev).

Terminal A:
```powershell
cd backend
npm run dev
```

Terminal B:
```powershell
cd frontend
npm run build
npm run preview -- --host --port 4173
```

Terminal C:
```powershell
cd admin
npm run build
npm run preview -- --host --port 4174
```

Terminal D:
```powershell
cd workroom
npm run build
npm run preview -- --host --port 4175
```

## 2) Why Previous ZAP Scan Looked Incomplete

If you scan `http://localhost:5173` (Vite dev):
- ZAP mostly crawls `@vite` + `src` loader paths
- React HMR adds `unsafe-inline`/`unsafe-eval` behavior by design
- SPA fallback returns the same `index.html` for many paths, reducing real coverage

## 3) Route Seed Lists

Use these to force broad crawl coverage:
- `security/zap/frontend-urls.txt`
- `security/zap/admin-urls.txt`
- `security/zap/workroom-urls.txt`
- `security/zap/backend-urls.txt`

Coverage pre-check:
```powershell
node security/scripts/check-seed-coverage.mjs
```
This verifies all seeded URLs are reachable before starting ZAP.

In ZAP:
1. Add each URL list as starting points.
2. Run Traditional Spider.
3. Run AJAX Spider (critical for React routing).

## 4) Authenticated Coverage (Required)

Many important routes are protected. Do this in ZAP:
1. Use HUD/Browser mode.
2. Log in manually for:
   - main user app (`frontend`)
   - admin app (`admin`)
3. Mark authenticated session/context.
4. Re-run spider + active scan inside authenticated context.

Without this, `/choose`, `/dashboard`, workroom messaging/payment paths and admin controls are not truly tested.

## 5) Backend API Coverage

Target `http://localhost:5000` separately:
1. Spider using `security/zap/backend-urls.txt`.
2. Active scan API endpoints in:
   - `/api/auth/*`
   - `/api/payment/*`
   - `/api/admin/*`
   - `/api/workrooms/*`
3. Test with and without auth cookies.

## 6) Must-Run Checks Beyond ZAP

Dependency vulnerabilities (already observed):
- frontend: high (`axios`, `glob`, `minimatch`)
- admin/workroom: react-router advisories
- backend: high (`cloudinary`, `axios`, `jws`, `qs`) + moderate (`body-parser`, `lodash`)

Run:
```powershell
cd frontend; npm audit --omit=dev
cd ../admin; npm audit --omit=dev
cd ../workroom; npm audit --omit=dev
cd ../backend; npm audit --omit=dev
```

## 7) Interpreting CSP Alerts

- `unsafe-eval` / `unsafe-inline` under Vite dev are expected and not production-representative.
- Use preview/deployed targets for final reports.
- Current production policy still allows `style-src 'unsafe-inline'` due to runtime library constraints.

SPA fallback note:
- Frontend preview/hosting uses SPA fallback to `/index.html`.
- ZAP probes like `/swagger`, `/v3/api-docs`, `/openapi.json` can return `200` on frontend targets even when no such API exists.
- Treat those as frontend fallback responses unless the same paths resolve on backend target (`http://localhost:5000`).

## 8) Completion Criteria

A scan is "complete enough" only when all are true:
1. Frontend, admin, workroom, backend scanned as separate targets.
2. Traditional + AJAX spider both run.
3. Authenticated contexts scanned for user + admin.
4. API active scan executed with auth and without auth.
5. Dependency audit results triaged and fixes scheduled.
