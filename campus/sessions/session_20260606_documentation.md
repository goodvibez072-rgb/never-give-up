# Session Log: VPS Architecture Mapping & Deployment SOP
**Date**: June 06, 2026
**Architect**: Manus AI

## 1. Objectives
- Completely map the VPS architecture for future AI/developer reference.
- Create a foolproof Replit-to-VPS Deployment SOP.
- Ensure all critical production files are identified and protected.

## 2. Actions Taken
### VPS Architecture Mapping
- **Action**: Performed a deep audit of the VPS environment, including Nginx configurations, systemd service files, and directory structures.
- **Deliverable**: Updated `campus/VPS_ARCHITECTURE.md` with absolute paths, Node.js versions, Nginx routing logic, and systemd management commands.
- **Key Discovery**: Confirmed that Nginx is handling SSL via Certbot and proxying to port 3000 with specific timeout optimizations (60s).

### Deployment SOP Creation
- **Action**: Drafted a step-by-step Standard Operating Procedure for migrating code from Replit to the VPS.
- **Deliverable**: Updated `campus/DEPLOYMENT_SOP.md`.
- **Key Instruction**: Explicitly detailed the `rsync` command to exclude critical production directories (`data/`, `uploads/`, `.env`, `campus/`) during updates.

### System Verification
- **Action**: Verified current service status and log health.
- **Result**: System is stable, running on Node v20.20.2, with valid SSL certificates (expiring in 89 days).

## 3. Files Modified
- `campus/VPS_ARCHITECTURE.md`
- `campus/DEPLOYMENT_SOP.md`
- `campus/sessions/session_20260606_documentation.md`

## 4. Transition Notes for Future Agents
1. **Zero-Overwrite Policy**: Never overwrite the `data/` or `uploads/` directories. These contain the lifeblood of the site (database and images).
2. **Environment Integrity**: The `.env` file on the VPS is the source of truth for production. Do not replace it with a development `.env`.
3. **Build Process**: Always run `npm install` and `npm run build` on the VPS after syncing files to ensure the production `dist/` is correctly generated for the Linux environment.
