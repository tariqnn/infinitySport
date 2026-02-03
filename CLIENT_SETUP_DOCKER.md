# Infinity Sports – Setup with Docker

You can run the **API** and **database** with Docker so you don’t need to install Node.js or PostgreSQL on your machine. You still run **Admin** and **Portal** on your computer (they need Node.js, or you can run them in Docker too – see below).

**First time using Docker?** Use **[DOCKER_FIRST_TIME.md](DOCKER_FIRST_TIME.md)** – it walks you step by step (install Docker Desktop, open the project folder, run the commands, check the API in the browser, stop when done).

---

## 1. What You Need

### Docker Desktop (required for Docker setup)

**What it is:** Runs the API and database (and optionally Admin/Portal) in containers so you don’t install Node.js or PostgreSQL directly.

**How to download and install:**

1. Go to **https://www.docker.com/products/docker-desktop/**
2. Download **Docker Desktop** for your OS (Windows / Mac / Linux).
3. Run the installer and follow the steps.
4. **Restart** your computer if asked.
5. Open **Docker Desktop** and wait until it says it’s running.
6. Check in a terminal:
   ```bash
   docker --version
   docker compose version
   ```
   You should see version numbers.

**That’s the only thing you must install** if you use Docker for the API and database.

---

## 2. What Docker Runs for You

- **PostgreSQL** – database (no Neon sign-up needed).
- **API** – backend at http://localhost:4000.

Admin and Portal are **Next.js** apps. You can either:

- **Option A:** Run them on your machine with Node.js (see [CLIENT_SETUP.md](CLIENT_SETUP.md) for Node.js install, then run `npm run dev:admin` and `npm run dev:portal`), **or**
- **Option B:** Run them in Docker too (see section 5 below).

---

## 3. Run API + Database with Docker

All commands are run from the **project root** (folder that contains `docker-compose.yml`).

### First time: build and start

```bash
docker compose up -d --build
```

- `--build` builds the API image.
- `-d` runs in the background.

Wait until both containers are running (check in Docker Desktop or run `docker compose ps`).

### Apply database migrations (first time only)

```bash
docker compose run --rm api npx prisma migrate deploy --schema=./prisma/schema.prisma
```

(Optional) Seed initial data:

```bash
docker compose run --rm api npx prisma db seed
```

(If seed fails, you can skip it; the API will still work.)

### Check that the API is up

- Open **http://localhost:4000** in the browser. You should see a short JSON message (e.g. “Infinity Sports API”).
- Or run: `curl http://localhost:4000`

---

## 4. Run Admin and Portal on Your Machine

With the API and database running in Docker:

1. Install **Node.js** (see [CLIENT_SETUP.md](CLIENT_SETUP.md) section 1).
2. In the project root, create a **`.env`** file with:
   ```env
   DATABASE_URL="postgresql://infinity:infinity@localhost:5432/infinity_sports"
   NEXT_PUBLIC_API_BASE_URL=http://localhost:4000
   ```
   (This matches the database and API from `docker-compose.yml`.)
3. Install dependencies and run:
   ```bash
   npm install
   npm run dev:admin
   ```
   In another terminal:
   ```bash
   npm run dev:portal
   ```
4. Open **http://localhost:3001** (Admin) and **http://localhost:3002** (Portal).

---

## 5. Optional: Run Admin and Portal in Docker Too

If you want to avoid installing Node.js at all, you can run Admin and Portal in Docker. That requires extra Dockerfiles and services (not included in this repo by default). For most users, running **only the API + database in Docker** and Admin/Portal with Node.js (section 4) is enough.

---

## 6. Useful Docker Commands

| What you want           | Command |
|-------------------------|--------|
| Start API + DB          | `docker compose up -d` |
| Start and rebuild API   | `docker compose up -d --build` |
| Stop everything         | `docker compose down` |
| View logs (API)         | `docker compose logs -f api` |
| View logs (DB)           | `docker compose logs -f postgres` |
| Run migrations          | `docker compose run --rm api npx prisma migrate deploy --schema=./prisma/schema.prisma` |
| Open DB (psql)           | `docker compose exec postgres psql -U infinity -d infinity_sports` |

---

## 7. If You Prefer Neon (cloud DB) Instead of Docker PostgreSQL

You can run **only the API** in Docker and use **Neon** as the database:

1. Create a database at [https://neon.tech](https://neon.tech) and copy the connection string.
2. Create a file **`.env`** in the project root with:
   ```env
   DATABASE_URL="postgresql://user:password@host/db?sslmode=require"
   ```
3. Run only the API with Docker, and pass your `.env`:
   ```bash
   docker compose --profile api-only up -d --build
   ```
   Or use a small `docker-compose.override.yml` that has only the `api` service and `env_file: .env`.  
   (By default, `docker-compose.yml` in this repo starts both `postgres` and `api`; you can stop postgres and set `DATABASE_URL` in `.env` to your Neon URL, then run only the api service.)

Simplest: use the included `docker-compose.yml` as-is so Docker runs both PostgreSQL and the API with no extra sign-up.

---

## 8. Summary

| What to install   | Where to get it |
|-------------------|------------------|
| **Docker Desktop** | https://www.docker.com/products/docker-desktop/ |

Then:

1. Open the project in a terminal (project root).
2. Run: `docker compose up -d --build`
3. Run: `docker compose run --rm api npx prisma migrate deploy --schema=./prisma/schema.prisma`
4. Open http://localhost:4000 to confirm the API.
5. To use Admin and Portal: install Node.js, then `npm install` and `npm run dev:admin` / `npm run dev:portal` (see [CLIENT_SETUP.md](CLIENT_SETUP.md)).

You can use Docker for the API (and database) and run the rest with Node.js, or follow [CLIENT_SETUP.md](CLIENT_SETUP.md) without Docker.
