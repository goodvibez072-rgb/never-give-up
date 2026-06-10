# AmourScans Deployment Handover Report

The AmourScans platform is an offline-ready manga website designed for portability and ease of deployment. The technical stack utilizes **Node.js 20** with an **Express** backend and a **React/Vite** frontend. A key architectural feature is the reliance on a local **SQLite** database, which ensures that all user data, manga series, and administrative settings remain self-contained and portable.

## Server and Infrastructure Details

The application is hosted on a **Flokinet VPS** located in Romania. The server environment is configured to run the application under a dedicated user account, providing a layer of security and isolation. The following table summarizes the core infrastructure components:

| Component | Details |
| :--- | :--- |
| **VPS IP Address** | `185.146.232.253` |
| **SSH Access** | User: `amurscans`, Password: `Manga@Site2024!Secure99` |
| **Deployment Directory** | `/var/www/amurscans` |
| **Primary Database** | `/var/www/amurscans/data/database.db` |
| **Node.js Runtime** | `v20.20.2` |
| **Process Manager** | `systemd` (Service: `amurscans.service`) |
| **Reverse Proxy** | Nginx with SSL (Certbot) |
| **DNS Management** | Cloudflare (Proxy: ON, Full Strict SSL) |

## Deployment Execution Summary

The deployment process began with a thorough cleanup of the target directory to ensure a "fresh start" as requested. After extracting the source code, all dependencies were installed via **NPM**, followed by a production build of both the frontend and backend assets. The application service was then integrated into the system's initialization sequence using **systemd**, ensuring that the platform automatically starts upon server reboot and maintains high availability.

Verification steps confirmed that the application is successfully listening on **port 3000** and correctly interacting with the SQLite database. The Nginx reverse proxy is active, handling SSL termination and forwarding external traffic from `amurscans.com` to the local Node.js process.

## Current Status and Operational Guidance

The AmourScans service is currently **Active and Running**. The backend successfully initializes the database schema and seeds default administrative roles upon startup. The platform is accessible locally on the server and is configured to serve traffic over HTTPS.

> **Note for Future Agents**: When continuing this project, first verify the DNS propagation in Cloudflare to ensure the domain correctly points to the VPS IP. The default administrative credentials for initial configuration are `admin@localhost.com` with the password `admin123`. For ongoing maintenance, application logs can be monitored in real-time using the command `sudo journalctl -u amurscans -f`.

## Maintenance and Troubleshooting

Should any issues arise, the following procedures are recommended for troubleshooting. First, verify the service status using `systemctl status amurscans`. If the application fails to respond, check for port conflicts or permission issues within the `/var/www/amurscans` directory. Regular backups of the `data/database.db` file should be scheduled to prevent data loss during future updates or migrations.
