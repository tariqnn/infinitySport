# Deploying this commit (8cdc6b2) on Hostinger

This commit is a **standard Next.js app** (no static export). It **must run with Node** (`next start`) to serve the site.

---

## If Hostinger lets you set a Start command

Use these settings:

| Setting | Value |
|--------|--------|
| **Build command** | `npm run build` |
| **Output directory** | `.` (or leave empty) |
| **Start / Run command** | `npm run start` |
| **Root directory** | `/` (repo root) |
| **Node version** | 20.x |

Add **Environment variables** in the panel (e.g. `DATABASE_URL`, `NODE_ENV=production`) if your app needs them.

After deploy, Hostinger should run `npm run start` so the site is served. If you don’t see a Start command field, check under **Runtime**, **Application**, or **Process** (depends on your plan).

---

## If Hostinger has NO Start command

Then it only **builds and copies files** and never runs Node. This commit **cannot run** in that setup: you’ll get 403/503 because there is no server.

You have two options:

1. **Use the newer static-export version**  
   Switch back to `main` and deploy that. It uses **Output directory = `out`** and does not need a Start command:
   ```bash
   git switch main
   ```
   Then in Hostinger: **Build** = `npm run build`, **Output directory** = `out`.

2. **Add static export to this commit**  
   Someone with access to the repo can re-apply the static export changes (e.g. from `main`) on top of this commit so you can deploy with **Output directory = `out`** and no Start command.

---

## Summary

| Hostinger has Start command? | What to do |
|-----------------------------|------------|
| **Yes** | Build = `npm run build`, Output = `.`, Start = `npm run start`. |
| **No** | Deploy from `main` (static export, Output = `out`) or add static export to this commit. |
