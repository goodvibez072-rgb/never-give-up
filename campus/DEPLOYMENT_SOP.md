# Replit-to-VPS Deployment SOP (Standard Operating Procedure)

This guide provides the exact steps for an AI agent or developer to update the live AmourScans site on the FlokiNET VPS using a ZIP export from Replit.

## 1. Preparation
Before starting the deployment, ensure you have the project ZIP file from Replit. **DO NOT** simply overwrite the entire directory on the VPS, as this will destroy the production database and environment settings.

## 2. Step-by-Step Deployment

| Step | Action | Command / Note |
| :--- | :--- | :--- |
| **1** | **Backup Database** | `cp /var/www/amurscans/data/database.db /home/amurscans/database_backup_$(date +%F).db` |
| **2** | **Upload & Unpack** | Upload the ZIP to `/home/amurscans/tmp/`. Unzip it there. |
| **3** | **Pre-Build Cleanup** | Delete `node_modules`, `dist`, and `package-lock.json` from the unpacked folder to ensure a clean build. |
| **4** | **Clean Replit Files** | Remove `.replit`, `replit.nix`, and check `vite.config.ts` for any Replit-specific plugins. |
| **5** | **Sync Files** | Use `rsync -av --exclude='data/' --exclude='.env' --exclude='uploads/' --exclude='campus/' /home/amurscans/tmp/ /var/www/amurscans/` |
| **6** | **Install Deps** | `cd /var/www/amurscans && npm install` |
| **7** | **Build Project** | `npm run build` |
| **8** | **Restart Service** | `sudo systemctl restart amurscans` |

## 3. Critical: Files to PROTECT
The following files and directories **MUST NOT** be overwritten or deleted during deployment:

> ### 🛑 CRITICAL PROTECTION LIST
> - **/var/www/amurscans/data/**: Contains the production SQLite database (`database.db`) and session store (`sessions.db`).
> - **/var/www/amurscans/uploads/**: Contains all user-uploaded images, covers, and manga chapters.
> - **/var/www/amurscans/.env**: Contains production-specific secrets, API keys, and absolute database paths.
> - **/var/www/amurscans/campus/**: Contains the system documentation and session logs.
> - **/etc/nginx/sites-available/amurscans**: The Nginx configuration with SSL and timeout fixes.
> - **/etc/systemd/system/amurscans.service**: The systemd service manager configuration.

## 4. Post-Deployment Verification
After restarting the service, perform these checks:
1. **Check Logs**: `journalctl -u amurscans -n 50` to ensure no startup errors.
2. **Verify API**: Run `curl -I http://127.0.0.1:3000/api/settings/system` to ensure the backend is responsive.
3. **Verify Frontend**: Visit `https://amurscans.com` and ensure the page loads correctly.

## 5. Troubleshooting
- **502 Bad Gateway**: The Node.js application hasn't started yet or crashed. Check `journalctl -u amurscans`.
- **Missing Images**: Ensure the `uploads/` directory was not overwritten and has correct permissions: `sudo chown -R amurscans:amurscans /var/www/amurscans/uploads`.
- **Login Issues**: Check that `.env` has the correct `ADMIN_EMAIL` and `DATABASE_PATH` is an absolute path.
