# 🏛️ CivicConnect — Crowdsourced Civic Issue Reporting & Resolution System

CivicConnect is a **MERN** application focused on helping **Indore residents** report civic issues (potholes, garbage, broken streetlights, water leakage, sewage) with a photo and map location. Citizens submit reports; municipal officers manage assignments, update progress, resolve with photo proof, and flag suspicious reports; administrators make final spam decisions and can delete reports only after confirming spam.

The maps open focused on central Indore. This is a city-focused default only: it does not represent or enforce the Indore Municipal Corporation boundary, and reports are not restricted to a municipal polygon.

> Built with MongoDB, Express, React, Node.js — no other frameworks. Real backend, real DB, real map data (Leaflet + OpenStreetMap + Nominatim reverse geocoding), no fake data placeholders.

---

## ✨ Features

### 👤 Citizen
- Normal login JWTs default to a 7-day lifetime, and configured lifetimes below 2 hours are raised to 2 hours.
- **Register / Login** via JWT (stored in `localStorage`, 7-day expiry; `Authorization: Bearer <token>`)
- **Report an issue** — validated form, multi-image upload (max 5 × 5 MB), **Leaflet click-to-drop-pin**, reverse geocode address via Nominatim, auto-detect **nearby duplicate issues** (~50m same category). Selecting **Other** requires a short category description.
- **Public feed + map** — Split / Grid / List / Map views, filter by category & status, sort by recency or upvotes, pagination.
- **Issue details** — image gallery, location map, upvote, comment thread, status timeline.
- **My Reports** — overview of citizen's own reports with per-status KPI tiles + table.
- Citizens may edit or delete only their own reports while submitted, and may reopen a resolved report once.
- A neutral "Under review" note is shown when a report is automatically flagged; private spam signals are not exposed.

### 🏢 Municipal Officer / Admin (role-gated)
- **Officer account provisioning is admin-only.** Public registration always creates a citizen; the officer role cannot be submitted by a registrant. An administrator enters the officer's name and email in User Management. The server generates a secure temporary password and emails the sign-in email and password to that address. The officer account is approved by the creating administrator. If email delivery fails, the new account is removed and the API reports the failure.
- **Municipal Operations Dashboard** — KPIs + Chart.js visualizations:
  - Doughnut: by Status
  - Bar: by Category
  - Line: 30-day trend
  - Recent issues feed
- **Filterable Issues Table** — category, status, priority, area, and spam status filters.
- **Issue Management Screen**
  - Officers may view reports, self-assign, and assign to approved officers/admins.
  - Status flow is **Submitted → In Progress → Resolved**. Resolution requires a photo.
  - Officers cannot change report content or delete reports.
  - Spam queue supports "Not spam" and "Confirmed spam" decisions; these are audited.
- **Admin tools** — create accounts, approve officers, change roles, suspend/unsuspend with a reason, delete any report, delete citizen accounts (including their reports, images, comments, and votes), review appeals, and inspect moderation audit records.
- **Municipal officer account setup** — open **Admin → Users & audit** (`/admin/users`), enter the officer's name and email, and choose **Municipal Officer**. The server generates a temporary password and emails the sign-in details. The account ID is displayed in the accounts table; search by name, email, or ID and filter by role.
- **Analytics API** — aggregation-backed endpoints with real counts from MongoDB.

### 🔐 Cross-cutting
- Centralized **Express error-handling middleware** (CastError, ValidationError, 11000 duplicate, JWT errors, Multer size errors → user-safe messages).
- Client-side validation is UX only — **every rule re-validated server-side** with `express-validator`.
- Centralized **Axios instance** with automatic JWT injection + 401 auto-logout redirect.
- **Auth state in React Context**, role-protected `<ProtectedRoute>` wrapper.
- Protected backend requests reload the user's role and suspension state from MongoDB.
- **Toast system**, **Loaders**, **Error states**, **Empty states** on every data-driven page.
- Responsive mobile layout throughout (tailwind).
- 404 route, session-expired notification on login page.
- JWT tradeoff chosen: **localStorage** — simpler CORS/cookie-domain setup for localhost dev; downside: vulnerable to XSS if untrusted JS runs; for production with same domain, switch to httpOnly, sameSite cookies.

---

## 📁 Project Structure

```
civic-connect/
├── client/                       # React + Vite + Tailwind
│   └── src/
│       ├── components/           # Navbar, IssueCard, MapView, Modal/Loader/Error/Empty/Toast/StatusBadge/ProtectedRoute/ConfirmDialog
│       ├── pages/                # Citizen, officer/admin, appeals, and report pages
│       ├── layouts/              # MainLayout
│       ├── hooks/                # (reserved)
│       ├── context/              # AuthContext, ToastContext
│       ├── services/             # api.js + authService / issueService / adminService
│       └── utils/                # formatters
├── server/
│   ├── config/db.js              # Mongoose connect
│   ├── models/                   # User, Issue (2dsphere index), Comment
│   ├── controllers/              # auth, issue, admin, moderation
│   ├── routes/                   # auth, issue, admin
│   ├── middleware/               # auth (JWT), role, upload (Multer), errorHandler
│   ├── uploads/                  # Multer destination, served via /uploads
│   ├── seed.js                   # Creates the configured admin, citizen, and officer accounts
│   ├── scripts/                  # Dry-run report cleanup and legacy role/status migration
│   └── server.js                 # Express entrypoint
├── package.json                  # Convenience scripts
├── .env.example
└── README.md
```

---

## 🧪 Database Schemas

**User** — `name`, `email` (unique, lowercase and validated), `password` (bcrypt, min 6, excluded from queries), `role` ∈ `citizen | officer | admin`, approval and suspension state, spam strike/restriction counters, `trustScore`, appeal message, email verification and password reset fields, timestamps. The primary admin is `dhanush11pillai@gmail.com`; public signup always creates citizens.

**Issue** — `title`, `description`, `category` and optional `categoryDetails` when category is `other`, sanitized published images, GeoJSON Point, `status` ∈ `submitted | in_progress | resolved`, priority, owner/assignee, upvotes, resolution note/photo, one-time reopen count, `checkStatus` ∈ `pending_check | checked | check_failed`, private capture/EXIF metadata and pHash values, `signalSnapshot`, `decision`, `spamStatus` ∈ `none | suspected | confirmed | cleared`, 0-100 score and coded reasons with short text, timestamps.

**BackgroundCheck / UploadToken** — durable private image-processing jobs and hashed, expiring, single-use upload tokens.

**AuditLog** — actor/email, action, target, reason, metadata, timestamps.

**Comment** — `issueId` → Issue, `userId` → User, `text`, timestamps.

## Free deployment (Render + MongoDB Atlas + Cloudinary)

The app can run as one free Render web service, with MongoDB Atlas Free for data and Cloudinary Free for persistent report photos. Render's free filesystem is temporary, so production photo uploads are stored in Cloudinary; configure its credentials before accepting reports.

1. Create a MongoDB Atlas Free cluster and database user. Allow connections from Render (Atlas `0.0.0.0/0` accommodates Render's changing outbound IPs; use a strong database password and restrict network access where your hosting plan supports stable egress IPs).
2. Create a Cloudinary Free account and note its cloud name, API key, and API secret.
3. Push this project to a private GitHub repository, then create a Render Blueprint from that repository and select the included `render.yaml`.
4. Set the prompted `MONGO_URI`, `CLIENT_URL` (the deployed `https://...onrender.com` URL), and Cloudinary credentials in Render. Render generates `JWT_SECRET`. Keep all credentials in the hosting dashboard, never in source control or chat.
5. The Blueprint disables email verification by default so registration works without SMTP. To require verified emails, configure SMTP environment variables and set `EMAIL_VERIFICATION_REQUIRED=true`.
6. Create the initial admin account by running `npm run seed --prefix server` from a trusted local checkout with `MONGO_URI`, `ADMIN_NAME`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD` set. The admin email must match the configured primary administrator email. Optional seed citizen/officer accounts can also be created; officer seeding requires working SMTP to deliver its credentials.

Free-tier limits apply: Render services sleep after inactivity and have temporary local files; Atlas Free has 512 MB storage; Cloudinary Free has monthly usage limits. These plans are suitable for a hobby/demo deployment, not a production availability guarantee.

---

## 🧩 API Endpoints

All endpoints return a consistent shape `{ success: boolean, message?: string, data?: any }` with appropriate HTTP status codes.

| Method | Route                                             | Who                     | Description                                                    |
|--------|---------------------------------------------------|-------------------------|----------------------------------------------------------------|
| POST   | `/api/auth/register`                              | Public                  | Register a citizen account (returns JWT unless verification is enabled) |
| POST   | `/api/auth/login`                                 | Public                  | Login (returns JWT; inactive/unverified accounts are rejected) |
| GET    | `/api/auth/me`                                    | Authenticated           | Current user profile                                           |
| POST   | `/api/auth/appeal`                                | Suspension appeal token | Submit an appeal (the token is limited to this endpoint)        |
| POST   | `/api/issues/upload-token`                        | Authenticated           | Issue a short-lived, single-use report-photo token               |
| GET    | `/api/issues?category=&status=&near=lng,lat,radius=&page=&limit=&sort=` | Public       | Filterable, paginated, geo-aware issue list                   |
| GET    | `/api/issues/duplicates?category=&lat=&lng=&radius=` | Public              | Find possible duplicates within ~radius meters                 |
| POST   | `/api/issues`                                     | Citizen (multipart)     | Report issue + images                                          |
| PUT    | `/api/issues/:id`                                 | Citizen owner           | Edit own submitted report; uploaded images require a fresh token |
| GET    | `/api/issues/mine`                                | Citizen                 | Citizen's own reports with pagination                          |
| GET    | `/api/issues/:id`                                 | Public                  | Issue + comments, isUpvoted flag if authenticated             |
| PUT    | `/api/issues/:id/upvote`                          | Authenticated           | Toggle upvote                                                  |
| POST   | `/api/issues/:id/comments`                        | Authenticated           | Add comment                                                    |
| PUT    | `/api/admin/issues/:id/status`                    | Officer / Admin         | Transition status; multipart resolution photo required to resolve |
| PUT    | `/api/admin/issues/:id/spam`                      | Officer / Admin         | Record a reasoned spam/clear decision and audit it              |
| GET    | `/api/admin/issues/spam-queue`                    | Officer / Admin         | Suspected and confirmed reports                                 |
| PUT    | `/api/admin/issues/:id/assign`                    | Officer / Admin         | Assign to approved officer/admin, self, or unassign              |
| GET    | `/api/admin/analytics`, `/api/admin/stats`        | Officer / Admin         | Report counts, status totals, spam rate                          |
| GET    | `/api/admin/users/authority`                      | Officer / Admin         | Approved officer/admin users for assignment                     |
| GET/POST| `/api/admin/users`                               | Admin                   | List or create citizen/officer accounts                          |
| PUT    | `/api/admin/users/:id/approve`                    | Admin                   | Approve a pending officer                                        |
| PUT    | `/api/admin/users/:id/role`                       | Admin                   | Change a user's role with a reason                               |
| PUT    | `/api/admin/users/:id/suspension`                 | Admin                   | Suspend/unsuspend with a reason                                  |
| GET    | `/api/admin/audit-log`                            | Admin                   | Moderation audit log                                             |
| GET    | `/api/admin/spam-decisions/export?format=json|csv` | Admin                   | Export signal snapshots and human decisions for later tuning    |
| POST   | `/api/issues/:id/reopen`                          | Report owner             | Reopen a resolved report once                                    |

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB running locally (default: `mongodb://localhost:27017/civic-connect`) OR a MongoDB Atlas URI

### 1️⃣ Environment variables

Copy the example file and customize it (keep `.env` private):

```powershell
# From the civic-connect project root:
if (-not (Test-Path server/.env)) { Copy-Item server/.env.example server/.env }
```

Set `MONGO_URI`, a long random `JWT_SECRET`, `JWT_EXPIRES_IN=7d`, and the frontend origin `CLIENT_URL=http://localhost:5173`. The server defaults to port `5001`. Email verification uses a six-digit OTP that expires in 10 minutes. Set `EMAIL_VERIFICATION_REQUIRED=true` and configure `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `EMAIL_FROM` in `server/.env` to deliver codes to real inboxes. Registration cannot proceed while verification is enabled and SMTP is not configured. `SMTP_USE_ETHEREAL=true` is only for test previews and does not send to a real inbox.

### 2️⃣ Install dependencies

From repo root:

```bash
npm run install:all
```

Or separately:

```bash
cd server && npm install
cd ../client && npm install
```

### 3️⃣ Seed the three initial accounts

```bash
npm run seed
```

Before running it, set `ADMIN_NAME`, `ADMIN_EMAIL=dhanush11pillai@gmail.com`, `ADMIN_PASSWORD`, `SEED_CITIZEN_EMAIL`, `SEED_CITIZEN_PASSWORD`, `SEED_OFFICER_EMAIL`, and `SEED_OFFICER_PASSWORD` in `server/.env`. The passwords must be at least six characters. Optional seed display names are `SEED_CITIZEN_NAME` and `SEED_OFFICER_NAME`. The script never overwrites existing passwords. SMTP must be configured to seed a new officer account; the officer's environment-provided temporary password is emailed to that account, and the script removes the account if delivery fails. Normal officer provisioning should use the admin User Management screen, where a fresh password is generated by the server.

### 4️⃣ Start both servers

**Terminal A — backend** (runs on :5001):

```bash
npm run server
```

**Terminal B — frontend** (runs on :5173 with proxy to backend port 5001):

```bash
npm run client
```

Then open **http://localhost:5173**.

### 5️⃣ Health check

Visit `http://localhost:5001/api/health` — you should see:

```json
{ "success": true, "message": "CivicConnect API is running", "timestamp": "..." }
```

To test login from Bash, run `server/test-login.sh <email> <password>` after starting the API. Set `API_URL` to override the default `http://localhost:5001`.

---

## 📋 Manual Test Checklist (verify before production)

1. Register → auto login → `/me` works → logout.
2. Login with wrong credentials → friendly error, no token written.
3. Visit `/report` logged out → redirect to `/login`; after login, returns to original page.
4. Visit `/admin` as citizen → 403 redirect to `/`.
5. Report issue: optionally consent to device GPS → upload photos → click map → address filled by Nominatim → submit → `/issues/:id` page shows title + gallery + map + status = `Submitted`.
6. Feed — switch Split / Grid / List / Map views, apply category and status filters, sort by upvotes, paginate (after seed).
7. Upvote an issue → count increments → un-upvote → decrements (no double-upserts).
8. Add comment → appears in thread with name, role, timestamp.
9. As a municipal officer: self-assign an unassigned report, then change its status to `in_progress`; only its assigned officer or an admin can update status. Resolve only after adding a resolution photo; flag questionable reports for administrator review. Only an administrator can mark a report as spam or clear the decision. An administrator can delete a report only after confirming spam. A citizen can reopen their own resolved report once.
10. Signed-in citizens, officers, and admins can use **Notifications** to see new reports, assignment and status changes, report comments/reopens, and spam review decisions. The unread count refreshes in the navigation every 30 seconds; opening an item marks it read.
10. Refresh the page while logged in → JWT in localStorage rehydrates `/me` without asking to login.
11. Empty states: delete all issues → Home / My Reports / Admin Recent each show proper empty component (not blank).
12. Visit `/made-up-url` → custom 404 page.
13. Resize to mobile (< 640px) → navbar scrolls horizontally, grids become single column, hero wraps, tables not broken.

---

## 🖥️ Deployment Notes

## Spam review, strikes, and privacy

Automatic checks only **flag** a report; they never delete it or automatically confirm it. All scoring weights and limits live in `server/config/spam.js`. Defaults:

| Signal | Default |
|---|---:|
| Device/EXIF location mismatch | Weight 0.35 when beyond `max(300m, 2 × GPS accuracy)` |
| Missing EXIF metadata | Weight 0.03 (weak signal only; never flags alone) |
| Reused / near-duplicate perceptual hash | Weight 0.45; Hamming distance ≤ 8 |
| Photo older than 24 hours | Weight 0.15 |
| New-account burst | Weight 0.10 (account ≤24 hours old, at least 3 reports/hour) |
| High reporting rate | Weight 0.20 near the hourly limit |
| Repeated / low-information text | Weight 0.10 |
| Suspected threshold | 35 points |
| Report limit | 5 per hour; after 3 confirmed-spam strikes, 3 reports per day |

A score at or above the suspected threshold creates `spamStatus: suspected`. Municipal officers can flag reports for administrator review, but cannot make the final decision. Only an admin can confirm spam or clear a report, and only confirmed-spam reports can be deleted by an admin. A cleared decision is sticky; a confirmed decision is not overwritten by later automatic checks. Each confirmed report adds at most one strike. Three strikes add an account posting restriction (they do not automatically suspend the account); only an admin can suspend. When the restriction begins, active admins receive an email notification when SMTP is configured, and the audit log records the restriction. Suspended users cannot log in or post and receive a short-lived, appeal-only token to submit a message at `/appeal`. The admin audit log records automatic flags, staff decisions, suspensions, and appeal messages.

Reports are created immediately with `checkStatus=pending_check`; a persistent MongoDB-backed worker analyzes images in the background. Failed checks become `check_failed` and are presented to staff for manual review, never as spam. Uploads are staged outside the public static directory, EXIF is read privately, and only a metadata-stripped JPEG is published. A short-lived, single-use upload token is required for report creation. If the reporter opts in, the browser requests device GPS once at report submission; staff can compare that point and any photo EXIF coordinates with the sender-selected report pin in the spam queue and moderation map. No device location is requested when consent is off. Resolution-photo location is also opt-in and requested only when submitting the resolution. These are review signals, not proof: GPS can be spoofed, EXIF can be absent or altered, and browser file inputs cannot cryptographically prove that an image came from a camera. The token and capture-time check prevent token replay/stale captures but are not a hardware attestation.

Device GPS, photo EXIF coordinates and time, location distances, hashes, signal snapshots, decisions, and resolution-review details are returned only to authenticated officers/admins; citizens/public viewers see only a neutral "Your report is under review" note. All tuning settings (weights, thresholds, token TTL, duplicate distance, stale age, trust adjustments, classifier labels) live in `server/config/spam.js` and are environment-overridable. Defaults use 0-1 signal weights and a 0-100 final score. "Cleared" remains sticky under automatic checks; a later staff reversal of a confirmed decision removes one strike and restores trust.

Image moderation providers are off by default. Set `IMAGE_MODERATION_PROVIDER=clip` to use `@huggingface/transformers` (Transformers.js) zero-shot classification (`CLIP_MODEL`, default `Xenova/clip-vit-base-patch32`) with labels from `CLIP_CIVIC_LABELS` and `CLIP_NON_CIVIC_LABELS`. Set it to `nsfwjs` and configure `NSFWJS_MODEL_PATH` for the optional local explicit-content signal, or `clip,nsfwjs` to enable both. Provider failures produce `check_failed`. Evaluate local classifier behavior on real Indore photos before increasing its weight; model signals never make the final decision. Admins can export reviewed training data as JSON or CSV from `/api/admin/spam-decisions/export?format=json|csv`.

Resolution images are metadata-stripped and checked against the report location and image hashes. A mismatch or failed check is recorded for staff review but does not block resolution. Device/EXIF coordinates are not shown to citizens.

## Indore-only map and optional municipal boundary

The map opens centered on Indore (`22.7196, 75.8577`, city-level zoom). **Municipal-boundary enforcement is disabled** because no verified GeoJSON boundary has been approved/provided. CivicConnect does not use a guessed polygon, radius, or bounding box. Keep `INDORE_BOUNDARY_ENFORCEMENT=false` until a verified WGS84 GeoJSON Polygon/MultiPolygon is supplied, its attribution/license are confirmed, and the project owner approves it. Then set `INDORE_BOUNDARY_GEOJSON_PATH` and enable the flag; the backend applies the same check to report creation, edits, and nearby-duplicate lookup. Boundary points on polygon edges count as inside.

## Maintenance scripts

Run the legacy data migration once after backing up MongoDB if the database contains old `authority`, `reported`, or `in-progress` values:

```powershell
cd server
npm run migrate:roles-status
```

Report cleanup is intentionally a dry run by default. It counts reports, referenced public images, pending jobs and staged private images and makes no changes:

```powershell
cd server
node scripts/clear-reports.js
```

To actually clear reports, explicitly review the dry-run counts, then run:

```powershell
node scripts/clear-reports.js --confirm
```

The confirmed run first exports all report documents to `server/backups/reports-<timestamp>.json`, deletes files referenced by those reports and their comments, and deletes report records. It never modifies the users collection. Do not run `--confirm` without reviewing the backup and counts.

Focused backend tests and the production frontend build:

```powershell
cd server
npm test
cd ..\client
npm run build
```

### Backend (Node)
- Any PaaS (Render, Railway, Fly.io, Heroku, DigitalOcean App Platform).
- Set env vars; set `CLIENT_URL` to your deployed frontend domain for CORS.
- For MongoDB, use Atlas (recommended) — the default `.env.example` uses local MongoDB.
- The `uploads/` folder is local disk; in production, swap Multer storage to S3/GCS (change `middleware/upload.js`).

### Frontend (Vite)
- `cd client && npm run build` → static assets in `dist/`.
- Deploy to Netlify/Vercel/Cloudflare Pages; set API base URL via Vite proxy for local dev only — for production, serve both on same domain or update `services/api.js` `baseURL`.
- Enable SPA fallback rewrites (`/*  → /index.html`).

### Moving JWT from localStorage → httpOnly cookie (optional for production)
Pros: immune to XSS token theft. Cons: more complex CORS + sameSite + domain config.
1. Backend: create JWT + set-cookie with `httpOnly, secure, sameSite=lax, path=/api`.
2. Backend: CORS `credentials: true`, `origin` must match exactly (no wildcard).
3. Frontend: Axios `withCredentials: true`; remove all localStorage token writes.
4. Add a `POST /api/auth/logout` that clears the cookie.

---

## 📜 License / Usage

Intended as a starter portfolio project. Use, extend, and adapt freely for municipal / civic hackathons or similar real-world deployments.
