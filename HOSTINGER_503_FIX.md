# Fix 503 on Hostinger

Your **build succeeds** (logs show "✓ Generating static pages"). The 503 happens because the **Node app is not running** after deploy.

## You must set a Start / Run command

Next.js needs to **run** as a process (`npm run start`), not just have its files copied.

1. In Hostinger, open **Settings** or **Build and deploy** for your site.
2. Find **Start command**, **Run command**, or **Application start** (may be under "Runtime" or a second tab).
3. Set it to exactly:
   ```
   npm run start
   ```
4. **Output directory** must be **empty** or **`.`** (not `.next`). If it is `.next`, change it to `.` so Hostinger runs the app instead of copying files.
5. Save and **Redeploy**.

## If there is no Start command field

- Some panels hide it when "Next.js" is selected. Try changing **Framework** to **Node.js** or **Custom** so the Start command field appears.
- Or check **Application** / **Runtime** / **Process** settings in another tab.

## Summary

| Setting        | Use this                          |
|----------------|-----------------------------------|
| Build command  | `npm run build`                   |
| Start command  | `npm run start`                   |
| Output directory | `.` or leave **empty**         |
| Node version   | 20.x                              |

Without a Start command, nothing listens for requests → 503.
