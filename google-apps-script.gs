/**
 * Google Apps Script for Client Tracker
 * Target Spreadsheet ID: 1qVaJ33gq2IcBon1GbKCbOhm1onOAJRHNtytGzN6Pmns
 *
 * Setup:
 * 1. Open your Google Sheet -> Extensions -> Apps Script
 * 2. Paste this entire file into Code.gs and Save
 * 3. Click Deploy -> New deployment -> Select type: Web app
 * 4. Execute as: Me | Who has access: Anyone
 * 5. Copy the Web App URL and paste it in the app (or DEFAULT_SCRIPT_URL in app.js)
 */

const SPREADSHEET_ID = "1qVaJ33gq2IcBon1GbKCbOhm1onOAJRHNtytGzN6Pmns";

const SUBMISSIONS_SHEET = "Submissions";
const FACULTIES_SHEET = "Faculties";

const SUBMISSIONS_HEADERS = [
  "Report ID",
  "Date",
  "Faculty ID",
  "Faculty Name",
  "Department",
  "Client Name",
  "Activity Status",
  "Activity Remarks",
  "Calendar Status",
  "Calendar Remarks",
  "Grievance",
  "Updated At"
];

const FACULTIES_HEADERS = [
  "Faculty ID",
  "Full Name",
  "Department",
  "Username",
  "Password",
  "Clients",
  "Created At"
];

function getSpreadsheet_() {
  return SpreadsheetApp.getActiveSpreadsheet() || SpreadsheetApp.openById(SPREADSHEET_ID);
}

function ensureSheet_(ss, name, headers) {
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    const headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight("bold");
    headerRange.setBackground("#eff6ff");
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function initSheets_() {
  const ss = getSpreadsheet_();
  const subSheet = ensureSheet_(ss, SUBMISSIONS_SHEET, SUBMISSIONS_HEADERS);
  const facSheet = ensureSheet_(ss, FACULTIES_SHEET, FACULTIES_HEADERS);

  // Seed default faculties if Faculties tab only has header row
  if (facSheet.getLastRow() === 1) {
    const now = new Date().toISOString();
    const defaultClients = "NPR, AVS, SINCET, IFET, IG, ARJUN";
    facSheet.appendRow(["u-fac-1", "Dr. Priya Sharma", "Computer Science", "priya", "pass123", defaultClients, now]);
    facSheet.appendRow(["u-fac-2", "Prof. Arjun Nair", "Management Studies", "arjun", "pass123", defaultClients, now]);
  }

  return { subSheet, facSheet };
}

function jsonResponse_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function readAllData_() {
  const { subSheet, facSheet } = initSheets_();

  const facValues = facSheet.getDataRange().getValues();
  const faculties = [];
  for (let i = 1; i < facValues.length; i++) {
    const row = facValues[i];
    if (!row[0] && !row[3]) continue;
    faculties.push({
      id: String(row[0] || ""),
      role: "faculty",
      name: String(row[1] || ""),
      department: String(row[2] || ""),
      username: String(row[3] || ""),
      password: String(row[4] || ""),
      clients: String(row[5] || "")
        .split(",")
        .map(function (s) { return s.trim(); })
        .filter(Boolean)
    });
  }

  const subValues = subSheet.getDataRange().getValues();
  const grouped = {};
  for (let i = 1; i < subValues.length; i++) {
    const row = subValues[i];
    const reportId = String(row[0] || "");
    const dateVal = row[1] instanceof Date
      ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(row[1] || "");
    const facultyId = String(row[2] || "");
    const clientName = String(row[5] || "");
    if (!facultyId || !dateVal || !clientName) continue;

    const key = facultyId + "__" + dateVal;
    if (!grouped[key]) {
      grouped[key] = {
        id: reportId || ("r-" + facultyId + "-" + dateVal),
        facultyId: facultyId,
        date: dateVal,
        clients: [],
        updatedAt: row[11] instanceof Date ? row[11].toISOString() : String(row[11] || "")
      };
    }

    grouped[key].clients.push({
      name: clientName,
      status: String(row[6] || "") === "Not Completed" ? "not_completed" : "completed",
      remarks: String(row[7] || ""),
      calendarStatus: String(row[8] || "") === "Not Completed" ? "not_completed" : "completed",
      calendarRemarks: String(row[9] || ""),
      grievance: String(row[10] || "")
    });
  }

  const reports = Object.keys(grouped).map(function (k) { return grouped[k]; });
  return { ok: true, faculties: faculties, reports: reports };
}

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || "getAll";
    if (action === "init") {
      initSheets_();
      return jsonResponse_(readAllData_());
    }
    if (action === "getAll") {
      return jsonResponse_(readAllData_());
    }
    return jsonResponse_({ ok: false, error: "Unknown GET action: " + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  }
}

function deleteMatchingRows_(sheet, matchFn) {
  const values = sheet.getDataRange().getValues();
  for (let r = values.length; r >= 2; r--) {
    if (matchFn(values[r - 1])) {
      sheet.deleteRow(r);
    }
  }
}

function formatStatusLabel_(status) {
  if (status === "completed") return "Completed";
  if (status === "not_completed") return "Not Completed";
  return "Not Marked";
}

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(15000);
  try {
    const raw = (e && e.postData && e.postData.contents) || "{}";
    const body = JSON.parse(raw);
    const action = body.action;
    const { subSheet, facSheet } = initSheets_();

    if (action === "createFaculty") {
      const f = body.faculty;
      if (!f || !f.username) {
        return jsonResponse_({ ok: false, error: "Missing faculty payload" });
      }
      // Update existing if same id, else append
      deleteMatchingRows_(facSheet, function (row) {
        return String(row[0]) === String(f.id);
      });
      facSheet.appendRow([
        f.id,
        f.name,
        f.department,
        f.username,
        f.password,
        (f.clients || []).join(", "),
        new Date().toISOString()
      ]);
      return jsonResponse_({ ok: true });
    }

    if (action === "updateFacultyClients") {
      const facultyId = String(body.facultyId || "");
      const clients = body.clients || [];
      const values = facSheet.getDataRange().getValues();
      for (let i = 1; i < values.length; i++) {
        if (String(values[i][0]) === facultyId) {
          facSheet.getRange(i + 1, 6).setValue(clients.join(", "));
          break;
        }
      }
      return jsonResponse_({ ok: true });
    }

    if (action === "deleteFaculty") {
      const facultyId = String(body.facultyId || "");
      deleteMatchingRows_(facSheet, function (row) {
        return String(row[0]) === facultyId;
      });
      deleteMatchingRows_(subSheet, function (row) {
        return String(row[2]) === facultyId;
      });
      return jsonResponse_({ ok: true });
    }

    if (action === "saveReport") {
      const r = body.report;
      const fac = body.faculty || {};
      if (!r || !r.facultyId || !r.date || !Array.isArray(r.clients)) {
        return jsonResponse_({ ok: false, error: "Missing report payload" });
      }

      // Replace any previous rows for this faculty + date so updates stay clean
      deleteMatchingRows_(subSheet, function (row) {
        const rowDate = row[1] instanceof Date
          ? Utilities.formatDate(row[1], Session.getScriptTimeZone(), "yyyy-MM-dd")
          : String(row[1] || "");
        return String(row[2]) === String(r.facultyId) && rowDate === String(r.date);
      });

      const rowsToAdd = r.clients.map(function (c) {
        return [
          r.id,
          r.date,
          r.facultyId,
          fac.name || "",
          fac.department || "",
          c.name,
          formatStatusLabel_(c.status),
          c.remarks || "",
          formatStatusLabel_(c.calendarStatus),
          c.calendarRemarks || "",
          c.grievance || "",
          r.updatedAt || new Date().toISOString()
        ];
      });

      if (rowsToAdd.length > 0) {
        const startRow = subSheet.getLastRow() + 1;
        subSheet.getRange(startRow, 2, rowsToAdd.length, 1).setNumberFormat("@");
        subSheet.getRange(startRow, 1, rowsToAdd.length, SUBMISSIONS_HEADERS.length).setValues(rowsToAdd);
      }

      return jsonResponse_({ ok: true });
    }

    return jsonResponse_({ ok: false, error: "Unknown POST action: " + action });
  } catch (err) {
    return jsonResponse_({ ok: false, error: String(err) });
  } finally {
    lock.releaseLock();
  }
}
