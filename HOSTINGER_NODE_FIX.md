# Hostinger Node mode – fix for @swc/helpers crash

## Changes made

### 1. **package.json**

- **`@swc/helpers`** added to **dependencies** (not devDependencies): `"@swc/helpers": "^0.5.0"`, so it is installed in production and the server no longer crashes with `Cannot find module '@swc/helpers/esm/_interop_require_default.js'`.
- **Scripts** updated for Hostinger Node:
  - `"build": "next build"`
  - `"start": "next start"`
- **overrides** updated to `"@swc/helpers": "^0.5.0"` for consistency.
- **devDependencies**: `@swc/helpers` removed from devDependencies (it is only in dependencies now).

### 2. **next.config.ts**

- **Removed** `output: 'export'` (static export) so the app runs in Node mode.
- **Removed** `images.unoptimized: true` (only needed for static export).

### 3. **Repository**

- **.gitignore**: added `package-lock.json` so the lock file is not committed.
- **Git**: `package-lock.json` removed from tracking (`git rm --cached package-lock.json`).  
  `node_modules/` was already in `.gitignore`.

### 4. **app/api**

- **Restored** `app/api` from `app/_api_backup_static_export` so API routes work again in Node mode.

---

## Clean build and run (do this locally and on Hostinger)

From the **repository root** (where `package.json` and `next.config.ts` are):

```bash
# 1. Clean
rm -rf node_modules package-lock.json
# Windows PowerShell:
# Remove-Item -Recurse -Force node_modules; Remove-Item -Force package-lock.json

# 2. Install
npm install

# 3. Build
npm run build

# 4. Start (verify no missing module errors)
npm start
```

If you use **Prisma** and need the client before build, run once before `npm run build`:

```bash
npm run prisma:generate
```

Then:

```bash
npm run build
npm start
```

---

## Hostinger settings (Node mode)

| Setting           | Value           |
|-------------------|-----------------|
| Build command     | `npm run build` |
| Start command     | `npm start`     |
| Output directory  | `.` or empty    |
| Root directory    | `/` (repo root) |
| Node version      | 20.x            |

Ensure **Environment variables** (e.g. `DATABASE_URL`, `NODE_ENV=production`) are set in the Hostinger panel if your app needs them.

---

## Confirmation

- **Updated:** `package.json` (scripts, `@swc/helpers` in dependencies, overrides).
- **Removed config:** `output: 'export'` and `images.unoptimized: true` from `next.config.ts`.
- **Repository:** `package-lock.json` in `.gitignore` and untracked; `node_modules` remains gitignored.
- **Server:** After a successful `npm install` and `npm run build`, `npm start` should run without the `@swc/helpers` error.  
  If your local `node_modules` is broken (e.g. after a partial delete or OneDrive sync), run the clean build steps above in a new terminal; on Hostinger, a fresh deploy will run `npm install` and `npm run build` in a clean environment.
