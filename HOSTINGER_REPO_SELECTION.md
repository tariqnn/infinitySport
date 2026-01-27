# Hostinger Repository Selection - "Unsupported Framework" Warning

## ⚠️ Expected Warning

When selecting your repository in Hostinger, you'll see:
```
Unsupported framework or invalid project structure. 
Check files and supported frameworks.
```

**This is NORMAL for monorepo projects.** You can safely ignore this warning and proceed.

---

## ✅ What to Do

### Step 1: Select Repository Anyway

1. **Click on `infinitySport` repository** (even with the warning)
2. **Proceed** to the next step
3. The warning is just Hostinger's auto-detection failing - we'll configure it manually

### Step 2: Manual Configuration

After selecting the repository, Hostinger will ask you to configure settings. Use these:

**Framework Preset:**
- Select **"Node.js"** (NOT "Next.js")
- OR select **"Custom"** if "Node.js" isn't available

**Then configure:**
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Output Directory: **(LEAVE EMPTY)**
- Root Directory: `./`

---

## 🔍 Why This Happens

Hostinger tries to auto-detect the framework by looking for:
- `next.config.js` at the root ✅ (we have this)
- `package.json` with `next` dependency ❌ (it's in `apps/web`, not root)

Since your Next.js app is in `apps/web` (monorepo structure), auto-detection fails.

**Solution:** We manually configure it as "Node.js" and use custom build commands.

---

## ✅ After Repository Selection

Once you've selected the repository and configured it as "Node.js":

1. Set all the build settings (see `DEPLOY_FROM_SCRATCH.md`)
2. Add environment variables
3. Deploy

The `.hostinger.json` file in your repo will help Hostinger understand the configuration.

---

## 📝 Quick Summary

1. ✅ **Ignore the warning** - it's expected for monorepos
2. ✅ **Select `infinitySport` repository**
3. ✅ **Choose "Node.js" or "Custom"** as framework
4. ✅ **Configure manually** with custom build/start commands

You're good to proceed! 🚀
