# Hostinger Environment Variables Setup - Step by Step

## 📋 Step-by-Step Instructions

### Step 1: Click "Add" Button

In Hostinger, find the **"Environment variables"** section and click the **"Add"** button.

---

### Step 2: Add Each Variable One by One

For each environment variable, you'll need to:
1. Enter the **Variable Name**
2. Enter the **Value**
3. Click **"Add"** or **"Save"**

Add them in this order:

---

## ✅ Required Environment Variables

### 1. NODE_ENV
- **Variable Name:** `NODE_ENV`
- **Value:** `production`
- Click **"Add"**

---

### 2. DATABASE_URL
- **Variable Name:** `DATABASE_URL`
- **Value:** `postgresql://user:password@host:5432/database?sslmode=require`
  - ⚠️ **Replace with your actual Neon/Postgres connection string**
  - Example: `postgresql://username:password@ep-xxx-xxx.region.aws.neon.tech/dbname?sslmode=require`
- Click **"Add"**

---

### 3. API_PORT
- **Variable Name:** `API_PORT`
- **Value:** `4000`
- Click **"Add"**

---

### 4. API_RUNNING_LOCALLY
- **Variable Name:** `API_RUNNING_LOCALLY`
- **Value:** `true`
- Click **"Add"**

---

### 5. NEXT_PUBLIC_API_SAME_DOMAIN
- **Variable Name:** `NEXT_PUBLIC_API_SAME_DOMAIN`
- **Value:** `true`
- Click **"Add"**

---

### 6. LANDING_ORIGIN
- **Variable Name:** `LANDING_ORIGIN`
- **Value:** `https://infinitysportsjo.com`
  - ⚠️ **Use your actual domain** (I see you have `infinitysportsjo.com`)
- Click **"Add"**

---

## 📝 Optional Environment Variables

These are only needed if you plan to deploy admin/portal later:

### 7. ADMIN_ORIGIN (Optional)
- **Variable Name:** `ADMIN_ORIGIN`
- **Value:** `https://admin.infinitysportsjo.com`
- Click **"Add"** (only if you'll deploy admin)

### 8. PORTAL_ORIGIN (Optional)
- **Variable Name:** `PORTAL_ORIGIN`
- **Value:** `https://portal.infinitysportsjo.com`
- Click **"Add"** (only if you'll deploy portal)

---

## ❌ DO NOT ADD These

- **`PORT`** - Hostinger sets this automatically
- **`NEXT_PUBLIC_API_BASE_URL`** - Leave empty/unset (we use relative URLs)

---

## ✅ Final Checklist

After adding all variables, verify you have:

- ✅ `NODE_ENV=production`
- ✅ `DATABASE_URL=your_actual_database_url`
- ✅ `API_PORT=4000`
- ✅ `API_RUNNING_LOCALLY=true`
- ✅ `NEXT_PUBLIC_API_SAME_DOMAIN=true`
- ✅ `LANDING_ORIGIN=https://infinitysportsjo.com`

---

## 🔍 Where to Get DATABASE_URL

If you don't have your database connection string:

1. Go to your Neon dashboard (https://neon.tech)
2. Select your project
3. Go to "Connection Details"
4. Copy the connection string
5. It should look like: `postgresql://user:pass@host/db?sslmode=require`

---

## 🚀 After Adding All Variables

1. Make sure all variables are saved
2. Verify the list shows all 6 required variables
3. Proceed with deployment!

Good luck! 🎉
