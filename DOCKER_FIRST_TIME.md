# Docker – First Time Use (Step by Step)

This guide is for **first-time Docker users**. It tells you exactly what to do on your computer so the API and database run with Docker.

---

## Step 1: Install Docker Desktop

1. Open your browser and go to:  
   **https://www.docker.com/products/docker-desktop/**

2. Click **“Download for Windows”** (or Mac / Linux if you use that).

3. Run the file you downloaded (e.g. `Docker Desktop Installer.exe`).

4. Follow the installer:
   - Accept the terms.
   - Leave the default options unless you know you need to change them.
   - Click **Install** and wait until it finishes.

5. When it asks, **restart your computer** (or at least log out and back in).

6. After restart, **open Docker Desktop** from the Start menu (or Applications on Mac).
   - Wait until it says **“Docker Desktop is running”** or shows a green icon.
   - This can take 1–2 minutes the first time.

7. Check that Docker works:
   - Press **Windows + R** (or open **Terminal** on Mac).
   - Type **`cmd`** and press Enter (Windows) or open **Terminal** (Mac).
   - Type:
     ```bash
     docker --version
     ```
   - Press Enter. You should see something like `Docker version 24.x.x`.  
   - If you see “docker is not recognized”, Docker is not in your PATH yet: close the window, open Docker Desktop again, wait until it’s running, then try a **new** terminal.

**You only need to do Step 1 once.** After that, you just need Docker Desktop to be **running** (open the app and wait for the green/running state) before you use the project.

---

## Step 2: Open the Project Folder

1. **Find the project folder** on your computer (the one that contains `docker-compose.yml` and `package.json`).  
   For example: `C:\Users\YourName\Desktop\infinty sport(nino)` or wherever you put it.

2. **Open a terminal in that folder:**
   - **Windows:**  
     - Open File Explorer and go to the project folder.  
     - Click the **address bar** at the top, type **`cmd`** and press Enter.  
     - A black window (Command Prompt) will open **in that folder**.  
     - Or: right‑click inside the folder, choose **“Open in Terminal”** or **“Open PowerShell window here”** if you see it.
   - **Mac:**  
     - Open **Finder**, go to the project folder.  
     - Right‑click the folder → **“New Terminal at Folder”** (or open Terminal and type `cd` then drag the folder onto the terminal and press Enter).

3. **Check you’re in the right place:**  
   In the terminal, type:
   ```bash
   dir
   ```
   (Windows) or
   ```bash
   ls
   ```
   (Mac). You should see files like `docker-compose.yml`, `package.json`, `Dockerfile`. If you see them, you’re in the project root.

---

## Step 3: Start the API and Database with Docker

**Make sure Docker Desktop is running** (Step 1). Then in the same terminal (in the project folder):

1. Type this and press **Enter**:
   ```bash
   docker compose up -d --build
   ```

2. **What happens:**
   - Docker will download a “PostgreSQL” image (database) and build the “API” image.  
   - The first time can take **5–15 minutes** (downloads and installs).  
   - You’ll see a lot of text; that’s normal.  
   - When it’s done, you should see something like “Container infinity-postgres  Started” and “Container infinity-api  Started”.

3. **If you see an error:**  
   - Check that Docker Desktop is **running** (green/running state).  
   - Make sure you’re in the **project root** (folder with `docker-compose.yml`).  
   - Copy the exact error message and ask for help (e.g. send it to the person who gave you the project).

---

## Step 4: Apply Database Migrations (First Time Only)

Still in the same terminal, in the project folder, run:

```bash
docker compose run --rm api npx prisma migrate deploy --schema=./prisma/schema.prisma
```

- You may see some lines of output; that’s normal.  
- When it finishes without a red error, the database is ready.  
- **You only need to run this once** (or again if you’re told to after a project update).

---

## Step 5: Check That the API Is Working

1. Open your **web browser** (Chrome, Edge, Firefox, etc.).

2. In the address bar type:
   ```text
   http://localhost:4000
   ```
   and press Enter.

3. You should see a short **JSON** message, for example:
   ```json
   {"message":"Infinity Sports API","version":"1.0.0",...}
   ```

4. If you see that:
   - **The API is running.**  
   - The **database** is running in Docker too.  
   - You can now use the **Admin** and **Portal** apps (they need Node.js – see [CLIENT_SETUP.md](CLIENT_SETUP.md)) or any app that points to `http://localhost:4000`.

---

## Step 6: Using Admin and Portal

- **API and database** are running in Docker (you did that above).  
- **Admin** and **Portal** are separate apps that need **Node.js** on your computer.

To run Admin and Portal:

1. Install **Node.js** (see [CLIENT_SETUP.md](CLIENT_SETUP.md) – “What to Download”).
2. In the **project root**, create a file named **`.env`** with this inside:
   ```env
   DATABASE_URL="postgresql://infinity:infinity@localhost:5432/infinity_sports"
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```
3. In a terminal (in the project folder) run:
   ```bash
   npm install
   npm run dev:admin
   ```
   Then open **http://localhost:3001** in the browser.
4. In **another** terminal (same project folder) run:
   ```bash
   npm run dev:portal
   ```
   Then open **http://localhost:3002** in the browser.

So: **Docker = API + database**. **Node.js + npm = Admin + Portal.**

---

## Step 7: When You’re Done – Stop Docker

When you finish working and want to stop the API and database:

1. Open a terminal in the **project folder** (same as before).
2. Run:
   ```bash
   docker compose down
   ```
3. The containers will stop. The **data** (database) is kept; next time you run `docker compose up -d` it will start again with the same data.

To **start again later:**  
- Open Docker Desktop (wait until it’s running).  
- Open a terminal in the project folder.  
- Run: `docker compose up -d`  
- Then open http://localhost:4000 to confirm the API.

---

## Quick Reference (Copy-Paste)

**First time (after installing Docker Desktop):**

```bash
cd path\to\your\project
docker compose up -d --build
docker compose run --rm api npx prisma migrate deploy --schema=./prisma/schema.prisma
```

Then open **http://localhost:4000** in the browser.

**Next times (start API + DB):**

```bash
cd path\to\your\project
docker compose up -d
```

**Stop API + DB:**

```bash
docker compose down
```

---

## Summary

| Step | What you do |
|------|------------------|
| 1 | Install **Docker Desktop** from docker.com and restart if asked. |
| 2 | Open a **terminal in the project folder** (where `docker-compose.yml` is). |
| 3 | Run **`docker compose up -d --build`** and wait until it finishes. |
| 4 | Run **`docker compose run --rm api npx prisma migrate deploy --schema=./prisma/schema.prisma`** (first time only). |
| 5 | Open **http://localhost:4000** in the browser to confirm the API. |
| 6 | To use Admin/Portal: install Node.js, create `.env`, then `npm install` and `npm run dev:admin` / `npm run dev:portal` (see [CLIENT_SETUP.md](CLIENT_SETUP.md)). |
| 7 | When done: **`docker compose down`** to stop. |

That’s how you use Docker on the client side the first time.
