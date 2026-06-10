# AmourScans — VPS Deployment Guide (FlokiNET)

This guide is written specifically for Manus (or any operator) deploying AmourScans to the FlokiNET VPS at `/var/www/amurscans`.

---

## What This Package Contains

| Item | Purpose |
|---|---|
| All source code | Fixed — no more Replit-specific dependencies |
| `data/database.db` | Your complete database including all manga, chapters, and users |
| `uploads/` | Existing uploaded files (covers, chapters, profiles) |
| This guide | Step-by-step deployment instructions |

---

## Quick Summary of Fixes Made (vs Previous VPS Versions)

| Problem | Fix Applied |
|---|---|
| `@replit/object-storage` crashing on startup | Replaced with local filesystem storage |
| Replit email connector failing | Replaced with SMTP (nodemailer) — works without config too |
| Session/CSRF secret paths hardcoded | Now reads `SESSIONS_PATH` env var correctly |
| CORS referencing Replit domains | Now uses `SITE_URL` env var |
| CSP headers referencing Replit dev domain | Removed Replit-specific entries |
| OAuth callback URL using Replit domains | Now uses `SITE_URL` env var |
| Replit vite plugins in devDependencies | Removed from package.json |
| `require('fs')` in replitAuth.ts | Replaced with ESM `import { renameSync }` |
| `require('child_process').execSync('sleep 1')` in replitAuth.ts | Replaced with `Atomics.wait(...)` |
| `require('fs').renameSync` in storage.ts | Replaced with ESM `import { renameSync }` |
| `require('child_process').execSync('sleep 1')` in storage.ts | Replaced with `Atomics.wait(...)` |
| CORS blocking Replit dev preview domain (dev only) | Dev mode now allows `*.replit.dev` origins |

---

## Step-by-Step Deployment

### Step 1 — Backup the current VPS database FIRST

```bash
cp /var/www/amurscans/data/database.db /home/amurscans/database_backup_$(date +%F_%H%M).db
echo "Backup created"
```

### Step 2 — Stop the service

```bash
sudo systemctl stop amurscans
```

### Step 3 — Upload and extract the zip

Upload `amurscans-vps.zip` to `/home/amurscans/tmp/` on the VPS, then:

```bash
mkdir -p /home/amurscans/tmp
cd /home/amurscans/tmp
unzip -o amurscans-vps.zip
ls -la   # Confirm files are there
```

### Step 4 — Sync source code (NEVER overwrite data/ or .env)

```bash
rsync -av --delete \
  --exclude='data/' \
  --exclude='.env' \
  --exclude='uploads/' \
  --exclude='campus/' \
  --exclude='node_modules/' \
  --exclude='dist/' \
  /home/amurscans/tmp/amurscans/ \
  /var/www/amurscans/
```

### Step 5 — CRITICAL: Restore the database from this package

The database in this package (`data/database.db`) contains ALL your manga, chapters, and user data.
Replace the VPS database with it:

```bash
# The database.db in this package has been fully checkpointed (WAL merged in)
cp /home/amurscans/tmp/amurscans/data/database.db /var/www/amurscans/data/database.db

# Remove stale WAL/SHM files from VPS to ensure clean start
rm -f /var/www/amurscans/data/database.db-wal
rm -f /var/www/amurscans/data/database.db-shm
rm -f /var/www/amurscans/data/sessions.db-wal
rm -f /var/www/amurscans/data/sessions.db-shm

echo "Database restored"
```

### Step 6 — Add missing env vars to .env

```bash
# Check what's currently in .env
cat /var/www/amurscans/.env

# Add these two lines if they are not already present:
echo "" >> /var/www/amurscans/.env
echo "SITE_URL=https://amurscans.com" >> /var/www/amurscans/.env
echo "STORAGE_PATH=/var/www/amurscans/data/storage" >> /var/www/amurscans/.env

# Make sure DATABASE_PATH and SESSIONS_PATH are absolute paths:
grep "DATABASE_PATH\|SESSIONS_PATH\|SITE_URL\|STORAGE_PATH" /var/www/amurscans/.env
```

Your `.env` should contain at minimum:

```
NODE_ENV=production
PORT=3000
DATABASE_PATH=/var/www/amurscans/data/database.db
SESSIONS_PATH=/var/www/amurscans/data/sessions.db
STORAGE_PATH=/var/www/amurscans/data/storage
SITE_URL=https://amurscans.com
SESSION_SECRET=<your existing secret>
ADMIN_USERNAME=admin
ADMIN_EMAIL=goodvibez072@gmail.com
ADMIN_PASSWORD=Manga@Site2024!Secure99
```

### Step 7 — Install dependencies

```bash
cd /var/www/amurscans
npm install --production=false
```

> This will install the new `nodemailer` package that replaced the Replit email connector.

### Step 8 — Build the project

```bash
cd /var/www/amurscans
npm run build
```

This runs `vite build` (frontend) + `esbuild` (backend). Takes 1-2 minutes.

### Step 9 — Fix file permissions

```bash
chown -R amurscans:amurscans /var/www/amurscans/
chmod 600 /var/www/amurscans/.env
chmod -R 755 /var/www/amurscans/uploads/
chmod -R 755 /var/www/amurscans/data/
```

### Step 10 — Start the service

```bash
sudo systemctl start amurscans
sudo systemctl status amurscans
```

### Step 11 — Verify everything works

```bash
# Check the server started without errors
journalctl -u amurscans -n 50 --no-pager

# Check the API responds
curl -s http://127.0.0.1:3000/api/settings/system | head -c 200

# Check manga data is there
curl -s http://127.0.0.1:3000/api/sections/featured | head -c 500

# Check Nginx is proxying correctly
curl -I https://amurscans.com
```

---

## Troubleshooting

### 502 Bad Gateway
The Node.js server hasn't started or crashed. Run:
```bash
journalctl -u amurscans -n 100 --no-pager
```
Look for the error line. Common causes:
- Missing env var (`SITE_URL`, `DATABASE_PATH`, etc.)
- Port conflict (check `PORT=3000` in .env matches the systemd service)
- Build not done (run `npm run build` again)

### Manga/Chapters Missing
The database wasn't restored correctly. Redo Step 5.

### Cannot Login as Admin
Check that `.env` has `ADMIN_EMAIL=goodvibez072@gmail.com`. The app seeds the admin on startup.
If the admin already exists with a different email in the database, run:
```bash
sqlite3 /var/www/amurscans/data/database.db \
  "UPDATE users SET email='goodvibez072@gmail.com' WHERE username='admin';"
```

### CSRF Errors on Login/Signup
This is usually a cookie/proxy issue. Check:
1. Nginx config has `proxy_set_header X-Forwarded-Proto https;`
2. Nginx config has `proxy_set_header Host $host;`
3. The app's `trust proxy` is set to `1` (already done in code)

If CSRF errors persist, clear browser cookies for amurscans.com and try again.

### Emails Not Sending
That's normal if SMTP is not configured. The site works fine without it — email sends are silently skipped with a log warning. To enable emails, add to `.env`:
```
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password
SMTP_FROM=AmourScans <noreply@amurscans.com>
SMTP_SECURE=false
```

---

## Nginx Configuration (for reference)

The Nginx config should look like this (at `/etc/nginx/sites-available/amurscans`):

```nginx
server {
    listen 80;
    server_name amurscans.com www.amurscans.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name amurscans.com www.amurscans.com;

    ssl_certificate /etc/letsencrypt/live/amurscans.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/amurscans.com/privkey.pem;

    # CRITICAL: Tell Node.js the connection is HTTPS (fixes CSRF cookie issue)
    proxy_set_header X-Forwarded-Proto https;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header Host $host;

    proxy_connect_timeout 60s;
    proxy_send_timeout 60s;
    proxy_read_timeout 60s;
    proxy_buffering off;

    # API requests → Node.js backend
    location /api/ {
        proxy_pass http://127.0.0.1:3000;
    }

    # WebSocket support
    location /ws {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }

    # Static frontend files
    root /var/www/amurscans/dist/public;

    location / {
        try_files $uri $uri/ /index.html;
    }

    # User-uploaded files (covers, chapters, etc.)
    location /uploads/ {
        alias /var/www/amurscans/uploads/;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
```

---

## Systemd Service (for reference)

At `/etc/systemd/system/amurscans.service`:

```ini
[Unit]
Description=AmourScans Web Application
After=network.target

[Service]
Type=simple
User=amurscans
WorkingDirectory=/var/www/amurscans
ExecStart=/usr/bin/node dist/index.js
Restart=always
RestartSec=5
EnvironmentFile=/var/www/amurscans/.env
NoNewPrivileges=true
ProtectSystem=full
MemoryMax=700M
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
```

---

## Development Notes (for future agent sessions)

- **Do NOT use `REPLIT_DOMAINS` or `REPLIT_DEV_DOMAIN`** — the VPS is the permanent home now. Use `SITE_URL` for the production URL.
- **Email** is now SMTP via nodemailer — configure `SMTP_*` vars in `.env`. Works fine without SMTP (just skips silently).
- **File storage** — chapter images go to `data/storage/` (served via `/api/chapters/image/`). Covers, profile pics, ads go to `uploads/` (served statically).
- **Database** — always checkpoint WAL before packaging: `sqlite3 data/database.db "PRAGMA wal_checkpoint(TRUNCATE);"`
- **Building for VPS** — run `npm run build` then zip. Do NOT include `node_modules/` or `dist/` in the zip.
