# Session Log: 001 - Initial VPS Audit & Critical Fixes
**Date**: June 6, 2026
**Agent**: Manus AI

## Objectives
1. Audit the current VPS deployment.
2. Fix the database/content rendering issue.
3. Establish the Campus knowledge base.

## Actions Taken
- **SSH Access**: Connected to the FlokiNET VPS (185.146.232.253).
- **System Audit**:
    - Verified `amurscans.service` status (Active).
    - Inspected SQLite database (`data/database.db`). Found 4 series and 1 chapter.
    - Analyzed Nginx configuration. Verified SSL and Proxy settings.
- **Bug Investigation**:
    - Identified that API requests were returning 301 redirects to HTTPS even for local loopback calls.
    - Discovered this caused Nginx to fail when proxying to the backend.
- **Fixes Applied**:
    - Modified `server/index.ts` to bypass HTTPS redirection for `127.0.0.1`.
    - Rebuilt the project using `npm run build`.
    - Restarted the service.
- **Verification**:
    - Verified that `amurscans.com` now renders manga series correctly in all sections.
    - Confirmed static assets are serving correctly via Nginx.

## Results
- **Website Status**: Fully Functional.
- **Content Rendering**: Fixed.
- **Documentation**: Campus folder structure created.
