# AmourScans Project Knowledge Base

Welcome to the **Campus** folder. This is the central repository for project intelligence, architecture documentation, and handoff logs for all AI agents working on AmourScans.

## Project Overview
AmourScans is a high-performance manga/manhwa reading platform designed for romantic series.

- **Frontend**: React + Vite + TailwindCSS + Radix UI
- **Backend**: Node.js + Express
- **Database**: SQLite (via Drizzle ORM)
- **Deployment**: FlokiNET VPS (Ubuntu)
- **Reverse Proxy**: Nginx with SSL (Certbot)
- **DNS/CDN**: Cloudflare (Proxy: ON)

## Architecture Details
- **App Location**: `/var/www/amurscans`
- **Database Path**: `/var/www/amurscans/data/database.db`
- **Static Assets**: Served via Nginx from `/var/www/amurscans/dist/public`
- **API Proxy**: Nginx proxies `/api/*` to `localhost:3000`

## Operational Commands
- **Restart Service**: `sudo systemctl restart amurscans`
- **View Logs**: `journalctl -u amurscans -f`
- **Rebuild App**: `npm run build` (runs both Vite and Esbuild)

## AI Handoff Protocol
Every AI agent **MUST** follow the protocol defined in `campus/AI_PROMPT_DIRECTIVE.txt`. Always document your session in `campus/sessions/`.
