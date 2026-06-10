# VPS Architecture: AmourScans (amurscans.com)

This document provides a comprehensive map of the AmourScans production environment on the FlokiNET Linux VPS. It is designed to ensure that any developer or AI agent can understand the system's structure, routing, and management.

## 1. Server Overview
- **Provider**: FlokiNET
- **Operating System**: Ubuntu 24.04 LTS (Noble Numbat)
- **Primary IP**: 185.146.232.253
- **Primary User**: amurscans (Sudo access enabled)
- **Web Root**: /var/www/amurscans
- **Node.js Version**: v20.20.2
- **NPM Version**: 10.8.2

## 2. Directory Structure
The application is installed in /var/www/amurscans. Key directories and files include:

| Path | Description |
| :--- | :--- |
| /var/www/amurscans/dist/ | Compiled production build (Backend + Frontend) |
| /var/www/amurscans/dist/public/ | Static frontend assets served by Nginx |
| /var/www/amurscans/data/ | **CRITICAL**: Contains database.db and sessions.db (SQLite) |
| /var/www/amurscans/uploads/ | User-uploaded content (covers, chapters, etc.) |
| /var/www/amurscans/campus/ | Project intelligence and documentation |
| /var/www/amurscans/.env | **CRITICAL**: Production environment variables |
| /var/www/amurscans/node_modules/ | Server-side dependencies |

## 3. Web Server & Routing (Nginx)
Nginx acts as a reverse proxy and handles SSL termination.

- **Config Path**: /etc/nginx/sites-enabled/amurscans
- **SSL Certificate**: Managed by Certbot (/etc/letsencrypt/live/amurscans.com/)
- **DNS**: Cloudflare (Proxy: ON, Mode: Full Strict)

### Routing Logic:
1. **HTTP (Port 80)**: Redirects all traffic to HTTPS.
2. **HTTPS (Port 443)**:
   - /api/: Proxied to the Node.js backend at http://127.0.0.1:3000.
   - /ws: Proxied for WebSocket support.
   - /: Serves static files from /var/www/amurscans/dist/public.
   - **Fallback**: All non-file requests are routed to index.html for React Router (try_files $uri $uri/ /index.html).

### Proxy Optimizations:
- proxy_connect_timeout: 60s
- proxy_send_timeout: 60s
- proxy_read_timeout: 60s
- proxy_buffering: off

## 4. Process Management (systemd)
The application is kept alive using a systemd service named amurscans.

- **Service File**: /etc/systemd/system/amurscans.service
- **Key Settings**:
  - User=amurscans
  - WorkingDirectory=/var/www/amurscans
  - ExecStart=/usr/bin/node dist/index.js
  - Restart=always
  - MemoryMax=700M
- **Commands**:
  - **Check Status**: sudo systemctl status amurscans
  - **Restart**: sudo systemctl restart amurscans
  - **Stop**: sudo systemctl stop amurscans
  - **View Logs**: journalctl -u amurscans -f

## 5. Database Setup
- **Type**: SQLite
- **Main DB**: /var/www/amurscans/data/database.db
- **Session DB**: /var/www/amurscans/data/sessions.db
- **ORM**: Drizzle
- **Note**: The database paths MUST be absolute in the .env file to ensure stability under systemd.

## 6. Critical Fixes & Configurations
- **HTTPS Loopback**: The backend is configured to ignore HTTPS redirection for 127.0.0.1 and localhost to prevent Nginx proxy loops.
- **Environment Variables**: The .env file is restricted to the amurscans user (600 permissions).
- **Security Hardening**: The systemd service uses NoNewPrivileges=true and ProtectSystem=full.
