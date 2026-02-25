# Hostinger Path Hard Fix (Copy-Paste)

Use this when Hostinger logs show:

- `Error setting directory ... /domains/.../public_html`
- `Cannot find module ... /public_html/server.js`

## 1) Public HTML bootstrap

Create or replace:

- `/home/u232002055/domains/infinitysportsjo.com/public_html/server.js`

With content from repo file:

- `hostinger-public_html-server.js`

## 2) NodeJS bootstrap

Create or replace:

- `/home/u232002055/domains/infinitysportsjo.com/nodejs/server.js`

With content from repo file:

- `hostinger-nodejs-server.js`

## 3) Runtime env

Ensure this file exists:

- `/home/u232002055/domains/infinitysportsjo.com/nodejs/hostinger-output/runtime-env.json`

And has:

```json
{
  "DATABASE_URL": "postgresql://...?...&sslmode=require&pgbouncer=true&connect_timeout=5&pool_timeout=5"
}
```

## 4) Restart

In Hostinger Node.js panel:

1. Stop app
2. Start app

## 5) If still failing

Clear `stderr.log`, restart once, and inspect only fresh lines. If it still tries a wrong path, Hostinger support must reset the Node app root mapping.

