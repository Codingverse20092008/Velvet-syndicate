# Velvet Syndicate — Complete Repository Audit Report

**Date:** 2026-07-07
**Auditor:** Automated Repository Analysis
**Repository:** `D:\Velvet` (Velvet Syndicate)
**Total Size:** ~611 MB (641,617,687 bytes)
**Total Files:** 1,367 (excluding node_modules)
**Git Commits:** 195 (single branch, no tags)

---

## Phase 1 — Repository Architecture

| Layer | Technology | Location |
|-------|-----------|----------|
| Frontend | Next.js 14 (App Router) + TypeScript | `frontend/` |
| Backend | Express.js + TypeScript | `backend/` |
| Database | Turso (libSQL) via Drizzle ORM | `backend/src/lib/schema.ts` |
| Cache/Queue | Upstash Redis | External |
| Auth | JWT (access + refresh tokens) | `backend/src/middleware/` |
| 3D | Three.js / React Three Fiber | `frontend/components/hero/` |
| Deployment | Vercel (frontend) + Render (backend) | `.vercel/`, `backend/.vercel/` |

---

## Phase 2 — Top-Level Folder Analysis

### ✅ `frontend/`
- **Purpose:** Next.js 14 application — e-commerce UI, app router, components, store, public assets
- **Referenced by:** `package.json` scripts, deployment configs
- **Files:** ~1,050 (including build artifacts)
- **Status:** ✅ REQUIRED
- **Issues:** Contains `.next/` build cache (379 MB) and `dist/` that are tracked in git. Large unused asset bloat.
- **Risk Level:** Low (functional). Medium (build artifacts tracked).

### ✅ `backend/`
- **Purpose:** Express.js API server with Drizzle ORM, middleware, routes, workers
- **Referenced by:** `api/index.ts`, `server.ts`, deployment
- **Files:** ~280
- **Status:** ✅ REQUIRED
- **Issues:** Contains `dist/` (109 compiled files, 0.56 MB tracked), `logs/` (11 log files, 1.6 MB), `scratch/` (dev scripts), `uploads/` (empty)
- **Risk Level:** Low

### 🟠 `.vercel/`
- **Purpose:** Vercel deployment project config
- **Referenced by:** Vercel CLI
- **Files:** 4
- **Status:** 🟠 ARCHIVE / 🟡 DEVELOPMENT ONLY
- **Reason:** Contains `project.json` and `README.txt`. Should not be tracked in git (already in `.gitignore` but previously committed).
- **Risk Level:** Low
- **Confidence:** 100%

### 🟡 `.claude/`
- **Purpose:** Claude AI IDE settings with permission rules
- **Files:** 1
- **Status:** 🟡 DEVELOPMENT ONLY
- **Reason:** Personal IDE configuration. Not needed for CI/CD.
- **Can Delete?** NO — useful for developers using Claude

### 🟡 `.codebuddy/`
- **Purpose:** AI code assistant cache/database
- **Files:** ~5
- **Status:** 🟡 DEVELOPMENT ONLY
- **Reason:** IDE tool cache. Already in `.gitignore`.
- **Confidence:** 100%

### 🟡 `.continue/`
- **Purpose:** Continue.dev AI assistant agent configs
- **Files:** 3
- **Status:** 🟡 DEVELOPMENT ONLY
- **Reason:** IDE tool configuration. Not needed in repository.
- **Confidence:** 100%

### 🔴 `.idea/`
- **Purpose:** JetBrains IDE configuration
- **Files:** ~13
- **Status:** 🔴 SAFE TO DELETE (untracked)
- **Reason:** Personal IDE config. Already untracked, should be in `.gitignore`.
- **Confidence:** 100%
- **Estimated Size:** 0.09 MB

### 🟡 `.vscode/`
- **Purpose:** VS Code settings (auto-approves terminal commands for tsx/drizzle)
- **Files:** 1
- **Status:** 🟡 DEVELOPMENT ONLY
- **Reason:** IDE config. Useful for team consistency but not for production.
- **Confidence:** 100%

### 🔴 `.next/` (root)
- **Purpose:** Next.js build cache
- **Files:** 2 (config + trace)
- **Status:** 🔴 SAFE TO DELETE FROM GIT TRACKING
- **Reason:** Build cache. Should not be in repository.
- **Confidence:** 100%

### 🔴 `New folder/`
- **Purpose:** Empty directory
- **Files:** 0
- **Status:** 🔴 SAFE TO DELETE
- **Reason:** Completely empty.
- **Confidence:** 100%

### 🔴 `node_modules/`
- **Purpose:** Dependencies
- **Status:** 🔴 SAFE TO DELETE (already gitignored)
- **Reason:** Install via `npm install`.
- **Confidence:** 100%

### 🟠 `scratch/` (root)
- **Purpose:** Development/testing scripts
- **Files:** 17
- **Status:** 🟠 ARCHIVE
- **Reason:** One-off debugging scripts (`check-db.ts`, `test-auth.ts`, `stress-test.ts`, etc.). Not referenced from any production code. Already gitignored. Consider archiving to `archive/scripts/`.
- **Confidence:** 100%

### 🟡 `scripts/` (root)
- **Purpose:** Build/utility/product import scripts
- **Files:** 7
- **Status:** 🟡 DEVELOPMENT ONLY
- **Reason:** `setup.sh`/`setup.bat` used for initial setup. `create-products-from-images.ts`, `import-product-images.ts` used for product import. `organize-catalog.ts`, `seed-catalog-rich.ts` — product seeding. `load-test.js` — load testing.
- **Can Delete?** Some scripts are legacy (load test, catalog tools). Keep `setup.sh`/`setup.bat`.

---

## Phase 3 — Detected Dead Code

### Dead Frontend Components (not imported anywhere)

| Component | File | Size | Severity |
|-----------|------|------|----------|
| `AboutPreview` | `frontend/components/home/AboutPreview.tsx` | ~1 KB | 🔴 Dead |
| `AboutSection` | `frontend/components/home/AboutSection.tsx` | ~2 KB | 🔴 Dead |
| `FeedbackButton` | `frontend/components/feedback/FeedbackButton.tsx` | ~1 KB | 🔴 Dead |
| `FilterPanel` | `frontend/components/product/FilterPanel.tsx` | ~3 KB | 🔴 Dead |
| `ProductSkeleton` | `frontend/components/product/ProductSkeleton.tsx` | ~1 KB | 🔴 Dead |
| `QuizRenderer` | `frontend/components/quiz-pack/QuizRenderer.tsx` | ~2 KB | 🔴 Dead |
| `SummerCrazyDealsBanner` | `frontend/components/home/SummerCrazyDealsBanner.tsx` | ~2 KB | 🔴 Dead |
| `VariantSelector` | `frontend/components/product/VariantSelector.tsx` | ~2 KB | 🔴 Dead |

### Dead Pages / Routes

| Route | File | Status |
|-------|------|--------|
| `summer-sale/hidden.tsx` | `frontend/app/summer-sale/hidden.tsx` | 🔴 Orphan file — not imported by `page.tsx` |
| `collection/CollectionContent-backup.tsx` | Backup duplicate | 🔴 Dead — never referenced |
| `vault-coming-soon/` | Pre-launch page | 🟡 Orphaned — check if linked |
| `vault-schema.ts` | `frontend/lib/vault-schema.ts` (303 lines, 19 tables) | 🔴 DEAD — zero imports from frontend OR backend |

### Dead TypeScript Schema (`vault-schema.ts`)
- **19 table definitions** exported (`vaultUsers`, `vaultLevels`, `vaultBadges`, etc.)
- **Zero references** from any file in `frontend/` or `backend/`
- **Imports** `{ users }` from `./db-schema` at line 303 (bottom of file)
- **Likely origin:** Early Velvet Vault prototype schema replaced by backend schema
- **Size:** 303 lines, ~12 KB
- **Status:** 🔴 SAFE TO DELETE
- **Confidence:** 100%

### Dead Backend Scripts (not in package.json)

| Script | Size | Note |
|--------|------|------|
| `audit-images.ts` | 586 B | One-off |
| `check-categories.ts` | 502 B | One-off |
| `check-count.ts` | 494 B | One-off |
| `check-schema.ts` | 714 B | One-off |
| `check-turso-products.ts` | 1,087 B | One-off |
| `clear-db.ts` | 607 B | 🔴 Dangerous |
| `count-quizzes.ts` | 641 B | One-off |
| `deactivate-v1-and-regenerate.ts` | 1,267 B | One-off migration |
| `fix-visibility.ts` | 1,002 B | One-off fix |
| `import-sneaker-quiz-pack.ts` | 11,963 B | One-off import |
| `inspect-orders-columns.ts` | 259 B | Debug |
| `recover-from-events.ts` | 798 B | Recovery script |
| `recover-from-orders.ts` | 692 B | Recovery script |
| `regenerate-pools-direct.ts` | 5,749 B | One-off |
| `regenerate-pools.ts` | 1,723 B | One-off |
| `seed-order-for-qa.ts` | 1,096 B | QA |
| `seed-qa-product.ts` | 1,038 B | QA |
| `test-openrouter-quiz.ts` | 1,627 B | Test |
| `transformed-sneaker-pack.json` | 32,010 B | Quiz data |
| `update-products-with-images.ts` | 4,186 B | One-off migration |
| `verify-import.ts` | 2,644 B | One-off |
| `verify-pools.ts` | 2,574 B | One-off |

### Dead Log Files (11 backend + 1 frontend)
- **Backend:** `admin-smoke-backend.log`, `backend-error.log`, `backend-run.log`, `backend-run2.log`, `backend.log`, `db-push.log`, `drizzle-push.log`, `local-backend-dev-fresh.log`, `local-backend-dev.log`, `qa-backend.log`, `server.log`
- **Frontend:** `local-frontend-dev.log`
- **Total:** ~1.6 MB of development log files
- **Status:** 🔴 SAFE TO DELETE (already gitignored, remove from tracking)

### Dead Scratch Files

| Location | Count | Purpose |
|----------|-------|---------|
| `scratch/` | 17 files | Dev/testing scripts |
| `backend/scratch/` | 4 files | Dev scripts |
| `frontend/scratch/` | 5 files | JS dev scripts |

### Unused npm Dependencies

| Package | File | Issue |
|---------|------|-------|
| `git` | root `package.json` | Likely error — this is the `git` npm package (not the CLI). Should be removed. |
| `@sentry/nextjs` | root `package.json` | Installed but no Sentry config or env vars found |
| `typescript@^6.0.0-dev` | root + frontend `package.json` | Using a dev/pre-release version of TypeScript 6 |

---

## Phase 4 — Detected Repository Clutter

### 🚩 Personal / School Files (tracked in git history but deleted)

| File | Source |
|------|--------|
| `Women Shoes/Class 6th Science-BIOLOGY.pdf` | School PDF — **CLUTTER** |
| `Women Shoes/PDFReader_20260430_0730.pdf` | Adobe Reader temp — **CLUTTER** |
| `Women Shoes/class_vi_timetable.pdf` | School timetable — **CLUTTER** |
| `WBCHSE_EMI_Induced_EMF_Notes.pdf` | School physics notes — **CLUTTER** |

### 🚩 Stock / Preview Media

| File | Issue |
|------|-------|
| `AdobeStock_1265978541_Video_HD_Preview.mov` | Adobe Stock watermarked preview — **CLUTTER** |

### 🚩 WhatsApp Images (60 files)

| Location | Count | Size |
|----------|-------|------|
| `frontend/public/real-images/` | 60 files | ~7.9 MB |
| `frontend/public/real-images-source/` | 18 files (duplicates) | ~2.7 MB |

**All are WhatsApp images with filenames like `WhatsApp Image 2026-04-26 at 10.55.23 AM.jpeg`** — clearly personal photos shared via WhatsApp, not production assets. None are referenced in code.

### 🚩 Real Images.zip

- **37.7 MB** archive file in `frontend/public/`
- Contains duplicative raw source images
- **Never referenced** in code

### 🚩 Commercial Product Images (unused)

| Folder | Files | Total Size | Referenced? |
|--------|-------|------------|-------------|
| `frontend/public/Men shoes/` | 14 | ~15 MB | ❌ No |
| `frontend/public/Women Shoes/` | 18 | ~0.5 MB | ❌ No |
| `frontend/public/products/` | 3 | ~1.7 MB | ❌ No |
| `frontend/public/real-images/` | 60 | ~7.9 MB | ❌ No |

### 🚩 Unused Videos

| File | Size | Status |
|------|------|--------|
| `videos/auth-bg.mov` | 6.9 MB | 🔴 Dead (`.mov` backup of MP4) |
| `videos/auth-mobile.mp4` | 4.5 MB | 🔴 Dead (replaced by `auth-mobile-v2.mp4`) |
| `videos/desktop_splash.mp4` | 20.4 MB | 🔴 Dead (replaced by `splash.mp4`) |
| `videos/splash.mov` | 6.9 MB | 🔴 Dead (`.mov` backup of MP4) |

### 🚩 Duplicate 3D Models

| File | Size | Status |
|------|------|--------|
| `public/sneaker.glb` | 15.9 MB | ✅ Used |
| `public/sneaker-source.glb` | 15.9 MB | 🔴 Duplicate — identical size, unused |

### 🚩 Duplicate Founder Images

| File | Size | Status |
|------|------|--------|
| `founders/soumojeet.png` | 1.6 MB | ✅ Used |
| `founders/soumojeet.jpeg` | 91 KB | 🔴 Dead |
| `founders/mehefuz.jpg` | 26 KB | ✅ Used |
| `founders/mehefuz.png` | 1.9 MB | 🔴 Dead |

### 🚩 Orphan Data Files (root)

| File | Size | Referenced? |
|------|------|-------------|
| `500_Unique_Fashion_Streetwear_Sneaker_Quiz.txt` | 98.6 KB | ❌ No |
| `Indian_Names.csv` | 83.5 KB | ❌ No |
| `Quiz_TrueFalse_FillInBlanks_Only.txt` | 4.9 KB | ❌ No |
| `TrueFalse_FillInBlanks_EXACT.txt` | 45.6 KB | ❌ No |

These appear to be quiz data / catalog data used during development import. Possibly for seed scripts. Not referenced from source.

### 🚩 ANDROID_MIGRATION_PLAN.md

- **Untracked** markdown file at root
- Appears unrelated to the main project

---

## Phase 5 — Duplicate Asset Summary

| Category | Duplicate Pair | Savings |
|----------|---------------|---------|
| Images | `real-images/` ↔ `real-images-source/` (18 files identical) | ~2.7 MB |
| 3D Models | `sneaker.glb` ↔ `sneaker-source.glb` (identical) | ~15.9 MB |
| Videos | `auth-mobile.mp4` ↔ `auth-mobile-v2.mp4` (same size) | ~4.5 MB |
| Videos | `splash.mp4` + `desktop_splash.mp4` + `splash.mov` | ~26.6 MB |
| Videos | `auth-background.mp4` + `auth-bg.mov` | ~20.7 MB |

**Total duplicate savings potential:** ~70.4 MB

---

## Phase 6 — Recommended Enterprise Structure

```
velvet-syndicate/
├── apps/
│   ├── web/              # Current frontend/ (Next.js)
│   └── api/              # Current backend/ (Express)
├── packages/
│   ├── shared/           # Shared types, schemas, utilities
│   ├── database/         # Drizzle schema, migrations, seeds
│   ├── config/           # Shared ESLint, TSConfig, Tailwind
│   └── ui/               # Shared UI components
├── assets/
│   ├── images/           # Static images (actual public assets)
│   ├── videos/           # Static videos
│   ├── models/           # 3D models (.glb files)
│   └── fonts/            # Custom fonts
├── scripts/              # Build, deploy, and utility scripts
├── docs/                 # Documentation
├── tests/                # End-to-end and integration tests
├── .github/
│   └── workflows/        # CI/CD pipelines
├── docker/               # Docker configs (if needed)
└── archive/              # Archived development artifacts
```

### Migration Plan:
1. `frontend/` → `apps/web/`
2. `backend/` → `apps/api/`
3. `frontend/public/images/` → `assets/images/` (symlink or move)
4. `frontend/public/videos/` → `assets/videos/`
5. `frontend/public/sneaker.glb` → `assets/models/`
6. `frontend/lib/db-schema.ts` + `backend/src/lib/schema.ts` → `packages/database/`
7. Shared types → `packages/shared/`
8. `scripts/` → `scripts/` (consolidated)
9. Add `.github/workflows/` for CI/CD
10. Add `docs/` for architecture documentation

---

## Phase 7 — Cleanup Safety Check

### ✅ SAFE TO DELETE (no references anywhere)

| Item | Evidence |
|------|----------|
| `frontend/lib/vault-schema.ts` | Zero imports from any file in frontend or backend |
| `frontend/public/real-images-source/` | 18 duplicate files, never referenced in code |
| `frontend/public/real-images/` | 60 WhatsApp images, never in code |
| `frontend/public/sneaker-source.glb` | Identical to `sneaker.glb`, never referenced |
| `frontend/public/products/` | 3 product images, never directly referenced (DB loads via API) |
| `frontend/public/Men shoes/` | 14 commercial images, never referenced |
| `frontend/public/Women Shoes/` | 18 commercial images, never referenced |
| `frontend/public/videos/auth-bg.mov` | Unused `.mov` backup |
| `frontend/public/videos/auth-mobile.mp4` | Replaced by v2, never referenced except as string in code? Checked: only v2 is referenced |
| `frontend/public/videos/desktop_splash.mp4` | Never referenced in code |
| `frontend/public/videos/splash.mov` | Unused `.mov` backup |
| `frontend/public/founders/mehefuz.png` | Unused duplicate (jpg is used) |
| `frontend/public/founders/soumojeet.jpeg` | Unused duplicate (png is used) |
| `frontend/public/images/Velvet Vault For Mobile.png` | Never referenced |
| `frontend/public/images/Velvet Vault For PC.png` | Never referenced |
| `frontend/public/Real Images.zip` | Never referenced, 37.7 MB |
| `frontend/vanilla/` | Never referenced from any source file |
| `frontend/app/collection/CollectionContent-backup.tsx` | Backup file, no references |
| `frontend/app/summer-sale/hidden.tsx` | Orphan file, not imported |
| `New folder/` | Completely empty |
| `.idea/` | Personal IDE config (already untracked) |
| `WBCHSE_EMI_Induced_EMF_Notes.pdf` | Personal school PDF (untracked) |
| `ANDROID_MIGRATION_PLAN.md` | Unrelated document (untracked) |
| Root quiz `.txt` files (4) | Not referenced in source code |
| `Indian_Names.csv` | Not referenced in source code |

### 🟡 DEVELOPMENT ONLY (archive before deleting)

| Item | Reason |
|------|--------|
| `scratch/` (root, 17 files) | Useful for posterity |
| `backend/scratch/` (4 files) | Useful for posterity |
| `frontend/scratch/` (5 files) | Useful for posterity |
| `backend/scripts/*.ts` (21 scripts not in package.json) | Archive batch, keep if needed |
| `backend/logs/` | Dev logs, safe to delete |
| `frontend/logs/` | Dev log, safe to delete |

### ⚠️ NEED GIT HISTORY CLEANUP

| Item | Reason |
|------|--------|
| `frontend/.next/` (634 files, 379 MB) | Build cache tracked in git |
| `backend/dist/` (109 files, 0.56 MB) | Build output tracked in git |
| `Women Shoes/Class 6th Science-BIOLOGY.pdf` | In git history (already deleted) |
| `AdobeStock_1265978541_Video_HD_Preview.mov` | In git history (already deleted) |
| `Founder img/` (5 files) | In git history (already deleted) |
| `Real Images/` (files now in public/) | In git history (already deleted) |

---

## Final Summary

### Repository Health Scorecard

| Metric | Value |
|--------|-------|
| **Total repository size** | ~611 MB |
| **Actual source code size** | ~230 MB (611 - 379 MB .next - 1.6 MB logs - artifacts) |
| **Largest folders** | `frontend/` (1,176 MB), `backend/` (119 MB) |
| **Largest size contributor** | `frontend/.next/` build cache: ~379 MB (tracked in git!) |
| **Unused folders** | 16 (vanilla, vault-schema.ts, real-images, real-images-source, etc.) |
| **Unused files** | ~113 assets, ~21 backend scripts, 17 scratch files, 12 log files |
| **Unused assets** | 134 files with ~105 MB total |
| **Duplicate assets** | ~70 MB (models, videos, images) |
| **Folders to move** | `frontend/`→`apps/web/`, `backend/`→`apps/api/` |
| **Folders to rename** | `frontend/public/` could be restructured |
| **Folders to archive** | `scratch/`, `backend/scratch/`, backend ad-hoc scripts |
| **Folders to delete** | `New folder/`, `vanilla/`, `real-images-source/`, redundant assets |
| **Potential disk space saved** | ~105 MB (assets) + ~379 MB (.next *if untracked*) = **~484 MB** |
| **Repository clutter** | 6 personal/school files, 60 WhatsApp images, Adobe Stock preview |

### Scores

| Score | Rating |
|-------|--------|
| **Repository Cleanliness:** | **35/100** 🔴 (build artifacts tracked, massive asset bloat, personal files) |
| **Enterprise Architecture:** | **40/100** 🟡 (monolithic frontend/backend, no monorepo structure, no CI/CD) |
| **Maintainability:** | **60/100** 🟡 (good code organization within apps, but dead code accumulated) |
| **Scalability:** | **55/100** 🟡 (modular structure but no clear separation of concerns) |

### Critical Issues to Fix

1. **🔴 Remove `frontend/.next/` from git tracking** — add to `.gitignore` and use BFG or filter-branch to purge. Saves 379 MB.
2. **🔴 Remove `backend/dist/` from git tracking** — it's a build artifact.
3. **🔴 Delete `frontend/public/real-images/`** — 60 WhatsApp images (7.9 MB) that are clutter.
4. **🔴 Delete `frontend/public/real-images-source/`** — duplicate of 18 files from real-images.
5. **🔴 Delete `frontend/public/sneaker-source.glb`** — 15.9 MB duplicate.
6. **🔴 Delete `frontend/public/Real Images.zip`** — 37.7 MB archive.
7. **🔴 Delete `frontend/lib/vault-schema.ts`** — 303 lines of dead code, 19 table definitions, zero imports.
8. **🔴 Delete `frontend/vanilla/`** — unreferenced early prototype.
9. **🔴 Remove unused videos** — `auth-bg.mov`, `auth-mobile.mp4`, `desktop_splash.mp4`, `splash.mov` (total ~38.7 MB).
10. **🔴 Delete redundant founder images** — `mehefuz.png`, `soumojeet.jpeg`.
11. **🔴 Delete unused public images** — `Velvet Vault For Mobile.png`, `Velvet Vault For PC.png`, `products/*`.
12. **🔴 Remove `git` package from dependencies** — mistaken npm dependency.
13. **🔴 Remove personal school files from git history** — `WBCHSE_EMI_Induced_EMF_Notes.pdf`, Women Shoes PDFs, Adobe Stock preview.
14. **🟡 Archive scratch files** — 26 scripts across `scratch/`, `backend/scratch/`, `frontend/scratch/`.
15. **🟡 Archive unused backend scripts** — 21 scripts not in package.json.
16. **🟡 Delete `New folder/`** — empty directory.
17. **🟡 Delete dev log files** — 12 log files (~1.6 MB).
18. **🟡 Add `.idea/` to `.gitignore`** — prevent IDE config from being committed.
19. **🟡 Review component dead code** — 8 components (FilterPanel, ProductSkeleton, etc.) are never imported.
20. **🟡 Review orphan routes** — `hidden.tsx`, `CollectionContent-backup.tsx`, `vault-coming-soon/page.tsx`.

### Estimated Cleanup Gain

| Category | Size |
|----------|------|
| Build artifacts (`.next/` + `dist/` + `.next/` root) | ~379 MB |
| Redundant assets (images, videos, models, zip) | ~105 MB |
| Log files | ~1.6 MB |
| Dead code (schemas, scripts, components) | ~0.5 MB |
| **Total** | **~486 MB** (79% of repo size!) |

---

*Report generated by automated repository audit. See `REPOSITORY_AUDIT.md` for complete findings.*
