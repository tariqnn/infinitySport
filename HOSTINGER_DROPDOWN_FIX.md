# Hostinger Dropdown-Only Settings - Fix

## ⚠️ Problem

Hostinger only shows dropdown options for:
- Build command (can't type custom commands)
- Output directory (can't leave empty)

## ✅ Solution

I've updated your `package.json` so the dropdown options will work correctly.

---

## 📋 What to Select in Hostinger

### Build Command Dropdown:
Select: **`npm run build`**

This now includes `npm install` automatically, so it will:
1. Install dependencies
2. Generate Prisma client
3. Build API
4. Build Web app

### Output Directory:
Since you can't leave it empty, try one of these:

**Option 1 (Best):**
```
.
```
(single dot - means current directory, but Hostinger won't copy files)

**Option 2:**
```
/
```
(if `.` doesn't work, but this might still copy files - we'll need to test)

**Option 3:**
If Hostinger shows `.next` as the only option, select it, but we'll need to check if it causes issues.

### Start Command Dropdown:
Select: **`npm run start`**

This runs `node start-combined.js` which starts both API and Web.

---

## 🔧 What I Changed

Updated `package.json`:
- Changed `build` script to include `npm install` at the start
- Now `npm run build` does everything needed

---

## ⚠️ Important Notes

1. **Output Directory:** If selecting `.` or `/` still causes Hostinger to copy files to `public_html`, we may need to:
   - Contact Hostinger support
   - Or use a different deployment approach

2. **After Deployment:** Check Runtime Logs to see if the app starts correctly. If you still get 403, the Output Directory setting is likely the issue.

---

## ✅ Next Steps

1. In Hostinger, select:
   - Build command: `npm run build` (from dropdown)
   - Output directory: `.` (if available) or `/` (if `.` not available)
   - Start command: `npm run start` (from dropdown)

2. Add environment variables (click "Add")

3. Deploy and check Runtime Logs

Let me know what options you see in the dropdowns!
