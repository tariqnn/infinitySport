# Fix npm install / "EPERM" and esbuild errors

Your project is in **OneDrive** (`OneDrive\Desktop\infinty sport(nino)`). That often causes:

- **EPERM / "operation not permitted"** – OneDrive (or another app) locks files in `node_modules`
- **esbuild.exe UNKNOWN** – Native binaries fail when the path is synced or has spaces/parentheses

## Option A: Move project out of OneDrive (recommended)

1. **Copy the whole project** to a local folder **not** in OneDrive, e.g.:
   - `C:\dev\infinity-sport`  
   - or `C:\projects\infinity-sport`

2. **Open that folder** in Cursor/VS Code and use it as your project from now on.

3. In a terminal in the **new** folder:
   ```bash
   npm install
   npm run dev:api
   npm run dev:admin   # in another terminal, or set PORT=3001
   npm run dev:portal  # in another terminal, set PORT=3002
   ```

4. Keep using the repo in the new location for development. Use Git to push/pull; don’t rely on OneDrive for the project folder.

## Option B: Keep project in OneDrive

1. **Stop syncing this folder** (right‑click the folder → “Free up space” / “Always keep on this device” and then pause OneDrive, or exclude this folder from OneDrive sync in settings).

2. **Close Cursor/VS Code** and any terminals that might be using the project.

3. **Delete `node_modules`** (and optionally `package-lock.json`):
   - In File Explorer go to the project folder.
   - Delete the `node_modules` folder (and `apps\api\node_modules`, `apps\admin\node_modules`, `apps\portal\node_modules` if they exist).
   - If delete fails because of locks, restart the PC and delete again before opening the project.

4. **Open the project again** in Cursor and run:
   ```bash
   npm install
   ```

5. If it still fails, try running the terminal **as Administrator** (right‑click Terminal → “Run as administrator”), then `cd` to the project and run `npm install`.

## Option C: Use npm cache outside OneDrive

Sometimes using a cache outside OneDrive helps:

```bash
npm config set cache "C:\npm-cache"
npm install
```

Then run `npm install` again in the project folder.

---

## After a successful install

- **API:** `npm run dev:api` → http://localhost:4000  
- **Admin:** `$env:PORT="3001"; npm run dev:admin` → http://localhost:3001  
- **Portal:** `$env:PORT="3002"; npm run dev:portal` → http://localhost:3002  

(Use three terminals, or start them in the background.)

---

**Summary:** The failures are from the project living in OneDrive and/or locked files. The most reliable fix is **Option A: move the project to a non‑OneDrive path** (e.g. `C:\dev\infinity-sport`) and run `npm install` and the dev commands there.
