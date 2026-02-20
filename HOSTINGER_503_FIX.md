# Fix 503 on Hostinger

Your **build succeeds** (logs show "✓ Generating static pages"). The 503 happens because the **Node app is not running** after deploy.

---

## Option A: Static export (no Start command needed)

If you **cannot find a Start / Run command** in Hostinger, the app is now set up for **static export**. Use these settings:

| Setting           | Value             |
|-------------------|-------------------|
| Build command     | `npm run build`   |
| Output directory  | **`out`**         |
| Start command     | *(leave empty)*   |

After deploy, Hostinger will copy the contents of the **`out`** folder to your site root. The site will have `index.html` at the root, so it will load without 403/503.

**Forms (contact, booking, package registration)** need your backend URL:

- In Hostinger, add an **environment variable**:  
  **`NEXT_PUBLIC_API_BASE_URL`** = your backend base URL (e.g. `https://api.infinitysportsjo.com`).  
  Set it **before** the build so it’s baked into the static files.
- If you don’t set it, form submissions will try the same origin and will fail (no API routes in static export).

---

## Option B: Run Next.js with a Start command

If your plan supports a **Start / Run command**:

1. In Hostinger, open **Settings** or **Build and deploy** for your site.
2. Find **Start command**, **Run command**, or **Application start** (may be under "Runtime" or a second tab).
3. Set it to: **`npm run start`**
4. **Output directory** = **`.`** or leave **empty** (so the full project is deployed and Node can run).
5. Save and **Redeploy**.

If you use this option, you must **revert static export**: remove `output: 'export'` from `next.config.ts`, restore `app/api` from `app/_api_backup_static_export`, and remove `images.unoptimized: true` if you want optimized images.

---

## Summary

| Setting           | Option A (static) | Option B (Node)   |
|-------------------|-------------------|-------------------|
| Build command     | `npm run build`   | `npm run build`   |
| Output directory | **`out`**         | `.` or empty      |
| Start command     | *(none)*          | `npm run start`   |
| Node version      | 20.x              | 20.x              |

Without a Start command, Option A (static export with **Output = out**) is the way to avoid 503.
