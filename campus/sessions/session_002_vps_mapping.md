# Session Log: 002 - VPS Architecture Mapping & Deployment SOP

**Date**: June 06, 2026
**Agent**: Manus Senior Full-Stack Architect
**Objective**: Map the current VPS setup and create a transition guide from Replit to Production.

## Summary of Actions
1. **Environment Audit**: 
   - Connected via SSH to `185.146.232.253`.
   - Verified application status: Running via `systemd` (service: `amurscans`).
   - Inspected Nginx configuration for SSL and reverse proxy routing.
2. **Documentation Generation**:
   - Created `campus/VPS_ARCHITECTURE.md`: A full map of the server, including absolute paths, Nginx routing logic, and process management.
   - Created `campus/DEPLOYMENT_SOP.md`: A step-by-step guide for future AI agents to deploy Replit updates to the VPS without breaking production.
3. **Safety Measures**:
   - Explicitly documented critical files that must **NEVER** be overwritten (Database, `.env`, Nginx configs).

## Files Modified/Created
- `/var/www/amurscans/campus/VPS_ARCHITECTURE.md` (New)
- `/var/www/amurscans/campus/DEPLOYMENT_SOP.md` (New)
- `/var/www/amurscans/campus/sessions/session_002_vps_mapping.md` (New)

## Transition Notes for Next AI
- The site is live at `amurscans.com`.
- Always check `systemctl status amurscans` if the site is down.
- The database is local SQLite in `/var/www/amurscans/data/database.db`.
- When applying updates from Replit, ensure the `vite.config.ts` is cleaned of Replit plugins.
