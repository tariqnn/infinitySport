# Hostinger Output Directory Workaround - Can't Leave Empty

## ⚠️ Problem

Hostinger won't let you leave Output Directory empty, but setting it to a path causes 403 (static file serving instead of Node.js).

## ✅ Workarounds to Try

### Option 1: Use "." (Single Dot)

If Hostinger allows you to type or select:
- Set Output Directory to: `.` (single dot, no quotes)
- This might work as it means "current directory" but Hostinger might not copy files

### Option 2: Use a Non-Existent Path

Try setting Output Directory to a path that doesn't exist:
- `__not_used__`
- `build_output` (but make sure this folder doesn't exist)
- `dist` (if your build doesn't create a dist folder)

This might make Hostinger skip the copy step.

### Option 3: Change Framework Preset

Try changing the Framework Preset:
1. Change from "Next.js" to **"Node.js"** or **"Custom"**
2. This might give you more control over Output Directory
3. Then try leaving Output Directory empty or using `.`

### Option 4: Use Different Start Command

If Output Directory is causing issues, try this:

1. Keep Output Directory as is (even if it's `.next`)
2. Change **Start Command** to: `cd apps/web && npm run start`
   - This runs Next.js directly from the web app directory
   - Might bypass the Output Directory issue

### Option 5: Contact Hostinger Support

If none of the above work:
1. Contact Hostinger support
2. Tell them: "I need to deploy a Node.js/Next.js app, but the Output Directory field is forcing me to set a path, which makes it serve static files instead of running Node.js"
3. Ask them how to configure it for Node.js runtime instead of static file serving

---

## 🔧 Quick Test

Try this first:

1. Set Output Directory to: `.` (single dot)
2. Make sure Start Command is: `npm run start`
3. Save and redeploy
4. Check if it works

If `.` doesn't work, try the other options above.

---

## 📋 What Each Option Does

- **`.`** - Current directory, might not trigger file copy
- **Non-existent path** - Hostinger might skip copy if path doesn't exist
- **Change Framework** - Might give you empty option
- **Different Start Command** - Bypasses Output Directory by running from subdirectory
- **Contact Support** - Get Hostinger to help configure it correctly

---

## 🚨 Last Resort

If nothing works, you might need to:
1. Use a different hosting provider (Vercel, Netlify, Railway, Render)
2. Or deploy API and Web separately

Try Option 1 (`.`) first - that's the most likely to work!
