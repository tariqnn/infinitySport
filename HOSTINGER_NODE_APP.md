# Why you get 403 / 503 – and how to fix it

Your **public_html** has the full project (`.next`, `node_modules`, `package.json`). That means Hostinger is **copying** the repo into `public_html` and **not running** your Node app. Apache then tries to serve that folder:

- **No `index.html` at root** → 403 Forbidden  
- **`.next` is not a static site** (it needs `next start`) → 503 if you point there

So the core issue is: **the Next.js app is never started**.

---

## What Hostinger must do

On **Business / Cloud** plans, Hostinger can run Node.js as a **Web App**:

1. The app is **built** (your build command runs).
2. A **Start command** runs (e.g. `npm run start`) so the app listens on a port (e.g. 3000).
3. A **reverse proxy** sends traffic from your domain to that port.

Right now only step 1 is happening; step 2 (and so 3) is missing.

---

## What to do in Hostinger

1. **Find the Node.js / Web App section**  
   In hPanel, look for something like:
   - **“Web Apps”** or **“Node.js”**, or  
   - **“Applications”** / **“Advanced”** next to your site.

2. **Create or edit the app so it runs**
   - **Build command:** `npm run build` (you already have this).
   - **Start command:** `npm run start`  
   This must be set so Hostinger runs the app after build.
   - **Output directory:** leave empty or `.` (do **not** use `.next` for a running app).

3. **Connect your domain to the Node app**  
   Your domain (e.g. infinitysportsjo.com) must be linked to this **Node.js Web App**, not to a static “website” that only copies files into `public_html`.

4. **If there is no “Start command”**  
   Then your current product may only support “build + copy to public_html”. In that case you have two options:
   - **Upgrade / use a plan** that supports Node.js Web Apps (with a Start command), or  
   - **Switch the project to static export** so the build produces an `out/` folder with `index.html`; then you set **Output directory** to `out` and Hostinger will serve those static files (no Node process). Forms/API would need to call an external backend.

---

## Summary

| What you see              | Cause                          | Fix                                      |
|---------------------------|---------------------------------|------------------------------------------|
| 403 with output `.`       | No `index.html`, app not run   | Run the app (Start command) or static export |
| 503 with output `.next`   | `.next` is not a static site   | Run the app with `npm run start`         |
| Files in public_html      | Deploy only copies files       | Use a Node.js Web App that runs the app |

You need Hostinger to **run** `npm run start` and **proxy** your domain to that process. If your panel has no Start command, say so and we can switch the site to static export so it works with “copy to public_html” only.
