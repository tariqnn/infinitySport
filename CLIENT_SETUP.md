# Infinity Sports – Setup on Your Device

This guide tells you how to get the **API**, **Admin**, and **Portal** running on your computer so you can work with the project locally.

**Prefer Docker?** You can run the **API** and **database** with Docker (no Node.js or PostgreSQL install needed for those). See **[CLIENT_SETUP_DOCKER.md](CLIENT_SETUP_DOCKER.md)** for the Docker option. You’ll still need Node.js to run Admin and Portal, or use the Docker guide for full steps.

---

## 1. What to Download (and How)

You need these on your computer before running the project:

---

### 1.1 Node.js (required)

**What it is:** The runtime that runs the API and the Admin/Portal apps. It also includes **npm**, which installs the project’s dependencies.

**How to download and install:**

1. Go to **https://nodejs.org**
2. Download the **LTS** version (e.g. “22.x.x LTS” or “20.x.x LTS”).
3. Run the installer and follow the steps (you can leave the default options).
4. **Restart your terminal** (or computer if needed).
5. Check that it worked:
   - Open a **terminal** (Command Prompt, PowerShell, or Terminal app).
   - Run: `node -v`  
     You should see a version like `v20.x.x` or `v22.x.x`.
   - Run: `npm -v`  
     You should see a version like `10.x.x`.

**If you already have Node.js:** Run `node -v`. If the version is below **18.18**, uninstall the old Node.js and install the LTS version from the link above.

---

### 1.2 Git (optional – only if you use Git to get the project)

**What it is:** A tool to clone the project from a repository (e.g. GitHub). You only need it if the client gives you a Git repo link. If they give you a **ZIP file**, you do **not** need Git.

**How to download and install:**

1. Go to **https://git-scm.com/downloads**
2. Choose your operating system (Windows / Mac / Linux).
3. Download and run the installer. Default options are fine.
4. Restart your terminal.
5. Check: run `git --version` in the terminal.

---

### 1.3 A code editor (optional but useful)

**What it is:** An app to open and edit the project files (and run the terminal). You can use any editor; Cursor or VS Code are common.

**How to download:**

- **Cursor:** https://cursor.com → Download and install.
- **VS Code:** https://code.visualstudio.com → Download and install.

You can also use Notepad or another editor; you just need a **terminal** to run the commands in this guide.

---

### 1.4 A database (no download – use a free cloud database)

**What it is:** PostgreSQL database where the API stores data (bookings, members, etc.). You don’t install PostgreSQL on your PC; you use a free online service.

**How to get it:**

1. Go to **https://neon.tech**
2. Sign up (free account).
3. Click **“Create a project”** (e.g. name it “infinity-sports”).
4. After the project is created, you’ll see a **connection string** that looks like:
   ```text
   postgresql://user:password@ep-xxxx.region.aws.neon.tech/neondb?sslmode=require
   ```
5. **Copy** that string. You will paste it into the project’s `.env` file as `DATABASE_URL` (see section 3 in this guide).

---

### Summary – what you need

| Item        | Required? | How to get it |
|------------|-----------|----------------|
| **Node.js** (includes npm) | Yes       | https://nodejs.org → download LTS, install, then run `node -v` and `npm -v` |
| **Git**    | No (only if you clone a repo) | https://git-scm.com/downloads |
| **Code editor** (e.g. Cursor / VS Code) | No (but helpful) | https://cursor.com or https://code.visualstudio.com |
| **Database** | Yes       | https://neon.tech → sign up, create project, copy connection string → put in `.env` as `DATABASE_URL` |

---

## 2. What You Need First (quick check)

- **Node.js** version **18.18 or higher**  
  - Check: open a terminal and run `node -v`  
  - If missing or too old: install from [https://nodejs.org](https://nodejs.org) (LTS).
- **npm** (comes with Node.js)  
  - Check: `npm -v`
- A **PostgreSQL database**  
  - Easiest: free account at [https://neon.tech](https://neon.tech), create a project, copy the connection string.  
  - Put it in `.env` as `DATABASE_URL` (see section 3).

---

## 3. Get the Project

- If you receive a **ZIP**: extract it to a folder (e.g. `infinity-sports`).
- If you use **Git**: clone the repo into a folder, then open that folder in your terminal.

All commands below are run from the **project root** (the folder that contains `package.json`).

---

## 4. Create the `.env` File

In the **root** of the project (same level as `package.json`), create a file named **`.env`** (no name before the dot, extension is `.env`).

Put this inside (replace the database URL with your real one):

```env
# Database – REQUIRED. Use your Neon or PostgreSQL connection string.
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE?sslmode=require"

# API (optional – these are the defaults)
PORT=4000
LANDING_ORIGIN=http://localhost:3000
ADMIN_ORIGIN=http://localhost:3001
PORTAL_ORIGIN=http://localhost:3002

# Frontends: where they find the API (optional in dev – defaults to http://localhost:4000)
NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
```

- **DATABASE_URL** is required. Get it from Neon (dashboard → connection string) or your PostgreSQL provider.  
- The rest can stay as above for local use.

Save the file.

---

## 5. Install Dependencies

In a terminal, in the project root, run:

```bash
npm install
```

Wait until it finishes. This also runs Prisma generate (needed for the API).

---

## 6. Set Up the Database

Run migrations so the database has the right tables:

```bash
npm run prisma:migrate
```

If you are told there is no migration history yet, you may need to run:

```bash
npx prisma migrate dev --schema=./prisma/schema.prisma --name init
```

(Use the exact command the terminal suggests if it differs.)

Optional: seed some initial data (e.g. hero, footer, blocked slots):

```bash
npm run prisma:seed
```

---

## 7. Run the API, Admin, and Portal

You need **three** processes: API first, then Admin and Portal. Use **three separate terminals** (or run two in the background).

**Terminal 1 – API (must be running first):**

```bash
npm run dev:api
```

Wait until you see something like “API server running on http://0.0.0.0:4000”. Leave this running.

**Terminal 2 – Admin:**

```bash
npm run dev:admin
```

When it’s ready, open in the browser: **http://localhost:3001**

**Terminal 3 – Portal:**

```bash
npm run dev:portal
```

When it’s ready, open: **http://localhost:3002**

---

## 8. Quick Reference

| What        | Command           | URL                    |
|------------|-------------------|------------------------|
| API        | `npm run dev:api` | http://localhost:4000 |
| Admin      | `npm run dev:admin` | http://localhost:3001 |
| Portal     | `npm run dev:portal` | http://localhost:3002 |
| Landing (web) | `npm run dev:web` | http://localhost:3000 |

- **Admin** and **Portal** need the **API** to be running; otherwise they cannot load data.
- The **API** needs a valid **DATABASE_URL** in `.env`; otherwise it will fail to start or to read/write data.

---

## 9. Portal: Choosing a Company

The Portal works per company. If the database has no company yet:

- Create one from the **Admin** (if you have a company management section), or  
- The **landing booking** flow creates a default company when the first public booking is made.

In the Portal, you usually pick the company from a dropdown or login; that sets **company ID**. All portal data (members, bookings, subscriptions, etc.) is then scoped to that company.

---

## 10. If Something Fails

- **“Cannot find module” or “Prisma” errors**  
  - Run again from the project root: `npm install` then `npm run prisma:generate`.
- **API won’t start or “database” error**  
  - Check that `.env` is in the **root** and **DATABASE_URL** is correct (no extra spaces, one line).  
  - Test the URL in Neon (or your DB provider) to be sure it works.
- **Admin or Portal loads but no data**  
  - Make sure the **API** is running on port 4000.  
  - Make sure **NEXT_PUBLIC_API_BASE_URL** is `http://localhost:4000` (or not set, so it defaults to that in dev).
- **Port already in use**  
  - Close any other app using that port, or change **PORT** (API) / the dev server port for Admin/Portal in their config if you need to.

---

## 11. Summary Checklist

1. Install Node.js 18+ and npm.
2. Get the project (ZIP or Git) and open its root in the terminal.
3. Create **`.env`** in the root with **DATABASE_URL** (and optional vars above).
4. Run **`npm install`**.
5. Run **`npm run prisma:migrate`** (or `npx prisma migrate dev ...` if prompted).
6. (Optional) Run **`npm run prisma:seed`**.
7. Start **API**: `npm run dev:api` (leave running).
8. Start **Admin**: `npm run dev:admin` → open http://localhost:3001.
9. Start **Portal**: `npm run dev:portal` → open http://localhost:3002.

After that, the API, Admin, and Portal are running on your device and using your database.
