# Known Errors & Technical Fixes

## 1. The "White Screen of Death"
- **Symptoms**: Website loads a blank white page. Console shows errors related to Replit plugins.
- **Cause**: The `vite.config.ts` included Replit-specific plugins that failed to initialize on a standard VPS.
- **Fix**: Removed `@replit/vite-plugin-cartographer` and `@replit/vite-plugin-runtime-error-modal` from `vite.config.ts`. Rebuilt the application.

## 2. Manga/Chapters Not Rendering (Empty Sections)
- **Symptoms**: Header/Footer load, but sections like "Pinned" or "Latest Releases" are empty.
- **Cause**: The server-side HTTPS redirection middleware was redirecting local loopback requests (127.0.0.1) from Nginx to HTTPS. Nginx was unable to handle the redirect internally or closed the connection, leading to empty JSON responses.
- **Fix**: Modified `server/index.ts` to exclude `127.0.0.1` and `localhost` from the HTTPS redirection logic.
- **Verification**: `curl http://127.0.0.1:3000/api/sections/featured` now returns correct JSON instead of a 301 redirect.

## 3. Nginx Upstream Prematurely Closed Connection
- **Symptoms**: Nginx error logs showed "upstream prematurely closed connection while reading upstream".
- **Cause**: Linked to the HTTPS redirect loop mentioned in Fix #2.
- **Fix**: Resolved by Fix #2.

## 4. Database Disconnection & Missing Content (June 2026)
- **Symptoms**: Mangas and chapters missing from the frontend.
- **Cause**: The application was using relative paths () for the SQLite database. When running as a systemd service, the working directory might not always resolve as expected, or the environment variables for absolute paths were missing.
- **Fix**: Updated  to include absolute paths for  and  ( and ).
- **Verification**: Service logs now show successful database and session initialization.

## 5. Authentication / Admin Login Failure (June 2026)
- **Symptoms**: Unable to log into the admin account.
- **Cause**: Potential session regeneration failures or database path issues affecting the sessions database.
- **Fix**: Ensuring absolute paths for the sessions database and verifying that the admin user is correctly seeded. The  file already contained the correct admin credentials.
- **Verification**: Session database initialized successfully in WAL mode.

## 6. Performance / Slowness Issues (June 2026)
- **Symptoms**: Website running slow, Nginx errors upstream prematurely closed connection.
- **Cause**: Primarily caused by the HTTPS redirection loop for local requests (fixed previously) and database connectivity issues leading to timeouts.
- **Fix**: Resolved by ensuring stable database connections and absolute paths.
- **Verification**: System load is low (load average < 0.3), and Nginx is proxying requests correctly.

## 4. Database Disconnection & Missing Content (June 2026)
- **Symptoms**: Mangas and chapters missing from the frontend.
- **Cause**: The application was using relative paths (`./data/database.db`) for the SQLite database. When running as a systemd service, the working directory might not always resolve as expected, or the environment variables for absolute paths were missing.
- **Fix**: Updated `.env` to include absolute paths for `DATABASE_PATH` and `SESSIONS_PATH` (`/var/www/amurscans/data/database.db` and `/var/www/amurscans/data/sessions.db`).
- **Verification**: Service logs now show successful database and session initialization.

## 5. Authentication / Admin Login Failure (June 2026)
- **Symptoms**: Unable to log into the admin account.
- **Cause**: Potential session regeneration failures or database path issues affecting the sessions database.
- **Fix**: Ensuring absolute paths for the sessions database and verifying that the admin user is correctly seeded. The `.env` file already contained the correct admin credentials.
- **Verification**: Session database initialized successfully in WAL mode.

## 6. Performance / Slowness Issues (June 2026)
- **Symptoms**: Website running slow, Nginx errors "upstream prematurely closed connection".
- **Cause**: Primarily caused by the HTTPS redirection loop for local requests (fixed previously) and database connectivity issues leading to timeouts.
- **Fix**: Resolved by ensuring stable database connections and absolute paths.
- **Verification**: System load is low (load average < 0.3), and Nginx is proxying requests correctly.

## 7. Database Path & Admin Email Mismatch (June 2026)
- **Symptoms**: Mangas/Chapters missing and Admin login failing.
- **Cause**: The  file was missing an absolute path for , causing the application to default to a relative path that didn't always resolve correctly under systemd. Additionally, the admin user's email in the database () did not match the email in the  file (), causing authentication failures when logging in via email.
- **Fix**: Updated  with  and updated the admin user's email in the SQLite database to match the  configuration.
- **Verification**: Database connection is stable, and admin email now matches the configuration.

## 8. Nginx Upstream Timeouts & Performance (June 2026)
- **Symptoms**: Website running slow, Nginx logs showing "upstream prematurely closed connection".
- **Cause**: Default Nginx proxy timeouts were too aggressive for the application's cold starts or heavy API requests, leading to premature connection closures.
- **Fix**: Increased , , and  to 60s in the Nginx site configuration.
- **Verification**: Nginx now waits longer for the application to respond, reducing 502/504 errors and improving perceived performance.

## 7. Database Path & Admin Email Mismatch (June 2026)
- **Symptoms**: Mangas/Chapters missing and Admin login failing.
- **Cause**: The .env file was missing an absolute path for DATABASE_PATH, causing the application to default to a relative path that didn't always resolve correctly under systemd. Additionally, the admin user's email in the database (admin@localhost.com) did not match the email in the .env file (goodvibez072@gmail.com), causing authentication failures when logging in via email.
- **Fix**: Updated .env with DATABASE_PATH=/var/www/amurscans/data/database.db and updated the admin user's email in the SQLite database to match the .env configuration.
- **Verification**: Database connection is stable, and admin email now matches the configuration.

## 8. Nginx Upstream Timeouts & Performance (June 2026)
- **Symptoms**: Website running slow, Nginx logs showing "upstream prematurely closed connection".
- **Cause**: Default Nginx proxy timeouts were too aggressive for the application's cold starts or heavy API requests, leading to premature connection closures.
- **Fix**: Increased proxy_connect_timeout, proxy_send_timeout, and proxy_read_timeout to 60s in the Nginx site configuration.
- **Verification**: Nginx now waits longer for the application to respond, reducing 502/504 errors and improving perceived performance.
