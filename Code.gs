const SHEET_NAME = 'Downtime';
const SETTINGS_SHEET_NAME = 'Settings';
const SECRET = 'DT2024SECRET';

function doGet(e) {
  try {
    const params = (e && e.parameter) || {};
    if ((params.token || '') !== SECRET)
      return returnError('Unauthorized');

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return returnError('Sheet not found');

    const data = sheet.getDataRange().getValues();
    const records = data.slice(1).map(row => ({
      id:        row[0]  || '',
      date:      row[1]  || '',
      shift:     row[2]  || '',
      problem:   row[3]  || '',
      start:     row[4]  || '',
      end:       row[5]  || '',
      downtime:  row[6]  ?? '',
      machine:   row[7]  || '',
      location:  row[8]  || '',
      solution:  row[9]  || '',
      rootcause: row[10] || '',
      parts:     row[11] || '',
      note:      row[12] || ''
    })).filter(r => r.id && String(r.id).trim() !== '');

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok', records: records, settings: getSettings_() }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return returnError('doGet: ' + err);
  }
}

function doPost(e) {
  try {
    if (!e || !e.postData || !e.postData.contents) {
      return returnError('Empty request body');
    }

    const data = JSON.parse(e.postData.contents);
    if ((data.token || '') !== SECRET)
      return returnError('Unauthorized');

    const action = data.action;
    if (action === 'save')         return saveRecord(data.record);
    if (action === 'delete')       return deleteRecord(data.id);
    if (action === 'saveSettings') return saveSettings(data.settings);
    return returnError('Unknown action');

  } catch (err) {
    return returnError('doPost: ' + err);
  }
}

function normalizeSettingsPayload(settings) {
  const normalized = {
    dtTarget: 0,
    fleetWorkCalendar: {},
    machineSettings: {},
    initialized: false
  };

  if (!settings || typeof settings !== 'object') return normalized;

  if (Object.prototype.hasOwnProperty.call(settings, 'dtTarget')) {
    const target = Number(settings.dtTarget);
    normalized.dtTarget = Number.isFinite(target) && target >= 0 ? target : 0;
    normalized.initialized = true;
  }

  if (settings.fleetWorkCalendar && typeof settings.fleetWorkCalendar === 'object' && !Array.isArray(settings.fleetWorkCalendar)) {
    normalized.fleetWorkCalendar = settings.fleetWorkCalendar;
    normalized.initialized = true;
  }

  if (settings.machineSettings && typeof settings.machineSettings === 'object' && !Array.isArray(settings.machineSettings)) {
    normalized.machineSettings = settings.machineSettings;
    normalized.initialized = true;
  }

  if (settings.globalSettings && typeof settings.globalSettings === 'object') {
    if (settings.globalSettings.dtTarget !== undefined) {
      const target = Number(settings.globalSettings.dtTarget);
      normalized.dtTarget = Number.isFinite(target) && target >= 0 ? target : 0;
    }
    if (settings.globalSettings.fleetWorkCalendar && typeof settings.globalSettings.fleetWorkCalendar === 'object') {
      normalized.fleetWorkCalendar = settings.globalSettings.fleetWorkCalendar;
    }
  }

  return normalized;
}

function getSettings_() {
  const settings = { dtTarget: 0, fleetWorkCalendar: {}, machineSettings: {}, initialized: false };
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  if (!sheet || sheet.getLastRow() < 2) return settings;

  const rows = sheet.getRange(2, 1, sheet.getLastRow() - 1, 2).getValues();
  rows.forEach(row => {
    const key = String(row[0] || '').trim();
    if (!key || row[1] === '' || row[1] == null) return;

    try {
      const value = JSON.parse(String(row[1]));
      if (key === 'fleetSettings') {
        const normalized = normalizeSettingsPayload(value);
        settings.dtTarget = normalized.dtTarget;
        settings.fleetWorkCalendar = normalized.fleetWorkCalendar || {};
        settings.machineSettings = normalized.machineSettings || {};
        settings.initialized = true;
      } else if (key === 'dtTarget') {
        settings.dtTarget = Math.max(0, Number(value) || 0);
        settings.initialized = true;
      } else if (key.indexOf('calendar:') === 0) {
        const month = key.slice('calendar:'.length);
        if (/^\d{4}-\d{2}$/.test(month) && value && typeof value === 'object') {
          settings.fleetWorkCalendar[month] = value;
          settings.initialized = true;
        }
      } else if (key === 'machineSettings') {
        if (value && typeof value === 'object' && !Array.isArray(value)) {
          settings.machineSettings = value;
          settings.initialized = true;
        }
      }
    } catch (err) {
      console.warn('Ignoring invalid setting: ' + key, err);
    }
  });

  return settings;
}

function saveSettings(settings) {
  const lock = LockService.getScriptLock();
  try {
    if (!settings || typeof settings !== 'object')
      return returnError('Invalid settings');

    lock.waitLock(10000);
    const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
    let sheet = spreadsheet.getSheetByName(SETTINGS_SHEET_NAME);
    if (!sheet) {
      sheet = spreadsheet.insertSheet(SETTINGS_SHEET_NAME);
      sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value (JSON)']]);
      sheet.setFrozenRows(1);
    } else if (sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 2).setValues([['Key', 'Value (JSON)']]);
      sheet.setFrozenRows(1);
    }

    const normalized = normalizeSettingsPayload(settings);
    const entries = [
      ['fleetSettings', JSON.stringify({
        dtTarget: normalized.dtTarget,
        fleetWorkCalendar: normalized.fleetWorkCalendar,
        machineSettings: normalized.machineSettings
      })]
    ];

    if (Object.prototype.hasOwnProperty.call(settings, 'dtTarget')) {
      const target = Number(settings.dtTarget);
      if (!Number.isFinite(target) || target < 0)
        return returnError('Invalid dtTarget');
      entries.push(['dtTarget', JSON.stringify(target)]);
    }

    const calendar = normalized.fleetWorkCalendar;
    if (calendar && typeof calendar === 'object' && !Array.isArray(calendar)) {
      Object.keys(calendar).forEach(month => {
        if (!/^\d{4}-\d{2}$/.test(month)) return;
        entries.push(['calendar:' + month, JSON.stringify(calendar[month])]);
      });
    }

    if (normalized.machineSettings && typeof normalized.machineSettings === 'object' && !Array.isArray(normalized.machineSettings)) {
      entries.push(['machineSettings', JSON.stringify(normalized.machineSettings)]);
    }

    const lastRow = sheet.getLastRow();
    const existing = lastRow >= 2 ? sheet.getRange(2, 1, lastRow - 1, 2).getValues() : [];
    const rowByKey = {};
    existing.forEach((row, index) => {
      const key = String(row[0] || '').trim();
      if (key) rowByKey[key] = index + 2;
    });

    entries.forEach(entry => {
      const rowNumber = rowByKey[entry[0]];
      if (rowNumber) {
        sheet.getRange(rowNumber, 2).setValue(entry[1]);
      } else {
        sheet.appendRow(entry);
        rowByKey[entry[0]] = sheet.getLastRow();
      }
    });

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return returnError('saveSettings: ' + err);
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
}

function saveRecord(record) {
  try {
    if (!record || typeof record !== 'object') {
      return returnError('Invalid record payload');
    }
    if (!record.id || !String(record.id).trim()) {
      return returnError('Missing record id');
    }
    if (!record.date || !record.shift || !record.machine || !record.problem || !record.location || !record.solution) {
      return returnError('Missing required record values');
    }

    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return returnError('Sheet not found');

    const id = record.id;
    const data = sheet.getDataRange().getValues();
    let foundRow = -1;
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) { foundRow = i + 1; break; }
    }

    const newRow = [
      record.id        || '', record.date      || '',
      record.shift     || '', record.problem   || '',
      record.start     || '', record.end       || '',
      record.downtime  ?? '', record.machine   || '',
      record.location  || '', record.solution  || '',
      record.rootcause || '', record.parts     || '',
      record.note      || ''
    ];

    if (foundRow === -1) {
      sheet.appendRow(newRow);
    } else {
      sheet.getRange(foundRow, 1, 1, 13).setValues([newRow]);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ status: 'ok' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (err) {
    return returnError('saveRecord: ' + err);
  }
}

function deleteRecord(id) {
  try {
    const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME);
    if (!sheet) return returnError('Sheet not found');

    const data = sheet.getDataRange().getValues();
    for (let i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        sheet.deleteRow(i + 1);
        return ContentService
          .createTextOutput(JSON.stringify({ status: 'ok' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }
    return returnError('Record not found');

  } catch (err) {
    return returnError('deleteRecord: ' + err);
  }
}

function returnError(msg) {
  return ContentService
    .createTextOutput(JSON.stringify({ status: 'error', error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}
