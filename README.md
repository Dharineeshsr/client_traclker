# Client Tracker

A lightweight HTML, CSS, and JavaScript web application for **Admin** and **Faculty** users to manage client assignments, track daily **Client Activities** and **Calendar** completion, log **Grievances**, and sync all submissions directly to **Google Sheets** via Google Apps Script (no database required).

## Features

- **Role-Based Access**:
  - **Admin** (`admin` / `admin123`): Create/delete faculties, add or remove assigned clients per faculty, view the live **Client Completion Dashboard** (Activities & Calendar progress), filter submissions, and configure Google Sheet sync.
  - **Faculty** (e.g. `priya` / `pass123`, `arjun` / `pass123`): View their live **My Client Completion Dashboard** and submit daily updates across 3 tasks:
    1. **Client Activities** (`Completed` / `Not Completed` with mandatory remarks if Not Completed)
    2. **Calendar** (`Completed` / `Not Completed` per client with mandatory remarks if Not Completed)
    3. **Grievances** (per-client text input)

## Files

- `index.html` — Application views and checklist structure
- `styles.css` — Responsive UI and completion dashboard styles
- `app.js` — Client-side state, validation, dashboards, and Google Sheet sync
- `google-apps-script.gs` — Google Apps Script Web App backend for Google Sheets

## Google Sheet Setup

1. Open your Google Sheet and navigate to **Extensions → Apps Script**.
2. Paste the contents of `google-apps-script.gs` into `Code.gs` and save.
3. Click **Deploy → New deployment → Web app** (`Execute as: Me`, `Who has access: Anyone`).
4. Copy the Web App URL and paste it into the **Google Sheet Sync** tab in the Admin Dashboard (or into `DEFAULT_SCRIPT_URL` in `app.js`).
