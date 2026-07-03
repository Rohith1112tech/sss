/**
 * School Substitution System - Google Apps Script (Version 2 with Period-Specific Absences)
 * Copy and paste this code into Extensions > Apps Script in your Google Sheet.
 */

function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Substitution System')
      .addItem('Generate Today\'s Substitutions', 'runSubstitutionProcess')
      .addItem('Clear Today\'s Substitution Log', 'clearSubstitutionLog')
      .addToUi();
}

function runSubstitutionProcess() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const ui = SpreadsheetApp.getUi();
  
  // Get sheets
  const timetableSheet = ss.getSheetByName('Master Timetable');
  const registrySheet = ss.getSheetByName('Teacher Registry');
  const absenteeSheet = ss.getSheetByName('Daily Absentee List');
  let logSheet = ss.getSheetByName('Daily Substitution Log');
  
  if (!timetableSheet || !registrySheet || !absenteeSheet) {
    ui.alert('Error', 'Please ensure you have tabs named "Master Timetable", "Teacher Registry", and "Daily Absentee List".', ui.ButtonSet.OK);
    return;
  }
  
  if (!logSheet) {
    logSheet = ss.insertSheet('Daily Substitution Log');
    logSheet.appendRow(["Date", "Day", "Period", "Class", "Subject", "Absent Teacher", "Substitute Teacher"]);
  }

  // Get current date and day of week
  const todayDateStr = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayStr = dayNames[new Date().getDay()];
  
  if (todayDayStr === "Saturday" || todayDayStr === "Sunday") {
    ui.alert('Weekend', 'Today is the weekend! Substitutions are only calculated for school days (Monday to Friday).', ui.ButtonSet.OK);
    return;
  }

  // Read sheets data
  const timetableData = getSheetData(timetableSheet);
  const registryData = getSheetData(registrySheet);
  const absenteeData = getSheetData(absenteeSheet);
  const logData = getSheetData(logSheet);
  
  // Check if there are any absentees today
  const todayAbsences = absenteeData.filter(row => formatDate(row['Date']) === todayDateStr && row['Status'] === 'Absent');
    
  if (todayAbsences.length === 0) {
    ui.alert('Info', `No teachers are logged as absent today (${todayDateStr}). Update the "Daily Absentee List" sheet and try again.`, ui.ButtonSet.OK);
    return;
  }

  // Filter log data for today
  const todaySubs = logData.filter(row => formatDate(row['Date']) === todayDateStr);
  
  // Find requirements based on period-specific absences
  const requirements = [];
  timetableData.forEach(row => {
    if (row['Day'] === todayDayStr) {
      for (let p = 1; p <= 8; p++) {
        const periodKey = `Period ${p}`;
        const teacher = row[periodKey];
        if (teacher && teacher !== 'Free' && isTeacherAbsentForPeriod(absenteeData, teacher, todayDateStr, p)) {
          requirements.push({
            class: row['Class'],
            day: todayDayStr,
            date: todayDateStr,
            period: p,
            absentTeacher: teacher,
            subject: getTeacherSubject(registryData, teacher)
          });
        }
      }
    }
  });

  if (requirements.length === 0) {
    ui.alert('Info', `The absent teachers do not have any classes scheduled during their absent periods on ${todayDayStr}.`, ui.ButtonSet.OK);
    return;
  }

  // Sort requirements: senior classes first
  requirements.sort((a, b) => {
    const getPriority = (cls) => {
      if (cls.startsWith('12')) return 4;
      if (cls.startsWith('11')) return 3;
      if (cls.startsWith('10') || cls.startsWith('9')) return 2;
      return 1;
    };
    return getPriority(b.class) - getPriority(a.class) || a.period - b.period;
  });

  // Keep track of assignments in memory during this run
  const activeSubs = [...todaySubs];
  let assignmentsCount = 0;

  requirements.forEach(req => {
    const subTeacher = findSubstituteForPeriod(req, registryData, timetableData, activeSubs, absenteeData);
    
    // Append to sheet
    logSheet.appendRow([
      req.date,
      req.day,
      req.period,
      req.class,
      req.subject,
      req.absentTeacher,
      subTeacher
    ]);
    
    // Add to active memory
    activeSubs.push({
      'Date': req.date,
      'Day': req.day,
      'Period': String(req.period),
      'Class': req.class,
      'Subject': req.subject,
      'Absent Teacher': req.absentTeacher,
      'Substitute Teacher': subTeacher
    });
    
    if (subTeacher !== 'MANUAL INTERVENTION REQUIRED') {
      assignmentsCount++;
    }
  });

  ui.alert('Success', `Processed ${requirements.length} substitution slots.\nSuccessfully assigned: ${assignmentsCount}\nManual intervention required: ${requirements.length - assignmentsCount}`, ui.ButtonSet.OK);
}

// Logic engine
function findSubstituteForPeriod(req, registry, timetable, activeSubs, absenteeData) {
  const candidates = [];
  const periodKey = `Period ${req.period}`;
  
  registry.forEach(teacherRecord => {
    const name = teacherRecord['Teacher Name'];
    if (!name || name === req.absentTeacher) return;
    
    // Skip if candidate is absent in this period
    if (isTeacherAbsentForPeriod(absenteeData, name, req.date, req.period)) return;
    
    // Rule check: is candidate already teaching in this period?
    const originalSchedule = getTeacherDailySchedule(timetable, name, req.day);
    if (originalSchedule[periodKey] !== 'Free') return;
    
    // Check if they are already subbing in this period
    const isSubbingThisPeriod = activeSubs.some(row => 
      row['Period'] === String(req.period) && 
      row['Substitute Teacher'] === name
    );
    if (isSubbingThisPeriod) return;

    // Rule 1: No Repeated Substitutions today
    const hasSubbedToday = activeSubs.some(row => row['Substitute Teacher'] === name);
    
    // Rule 2: No Continuous Classes (P-1 and P+1)
    let hasAdjacentClass = false;
    const checkPeriods = [];
    if (req.period > 1) checkPeriods.push(req.period - 1);
    if (req.period < 8) checkPeriods.push(req.period + 1);
    
    for (const adjPeriod of checkPeriods) {
      const adjPeriodKey = `Period ${adjPeriod}`;
      if (originalSchedule[adjPeriodKey] !== 'Free') {
        hasAdjacentClass = true;
        break;
      }
      const isSubbingAdj = activeSubs.some(row => 
        row['Period'] === String(adjPeriod) && 
        row['Substitute Teacher'] === name
      );
      if (isSubbingAdj) {
        hasAdjacentClass = true;
        break;
      }
    }
    
    // Rule 3: Workload Limit
    const originalCount = Object.values(originalSchedule).filter(val => val !== 'Free').length;
    const subCount = activeSubs.filter(row => row['Substitute Teacher'] === name).length;
    const totalWorkload = originalCount + subCount;
    const maxCapacity = parseInt(teacherRecord['Max Periods Per Day'] || '5', 10);
    
    if (totalWorkload >= maxCapacity) return; 
    
    const isSubjectMatch = teacherRecord['Main Subject'] === req.subject;
    
    candidates.push({
      name,
      workload: totalWorkload,
      hasSubbedToday,
      hasAdjacentClass,
      isSubjectMatch
    });
  });
  
  // Filter candidates using fallbacks
  let filtered = candidates.filter(c => !c.hasSubbedToday && !c.hasAdjacentClass);
  
  if (filtered.length === 0) {
    filtered = candidates.filter(c => !c.hasSubbedToday); 
  }
  
  if (filtered.length === 0) {
    filtered = candidates.filter(c => !c.hasAdjacentClass); 
  }
  
  if (filtered.length === 0) {
    filtered = candidates; 
  }
  
  if (filtered.length === 0) {
    return 'MANUAL INTERVENTION REQUIRED';
  }
  
  // Sort
  filtered.sort((a, b) => {
    if (a.isSubjectMatch && !b.isSubjectMatch) return -1;
    if (!a.isSubjectMatch && b.isSubjectMatch) return 1;
    return a.workload - b.workload;
  });
  
  return filtered[0].name;
}

// Helpers
function isTeacherAbsentForPeriod(absenteeData, teacherName, date, period) {
  const records = absenteeData.filter(row => row['Teacher Name'] === teacherName && formatDate(row['Date']) === date);
  if (records.length === 0) return false;
  
  return records.some(row => {
    const type = String(row['Absence Type'] || 'Full Day').trim();
    const periods = String(row['Specific Period(s) Absent'] || 'All').trim();
    const status = String(row['Status'] || '').trim();
    
    if (status !== 'Absent') return false;
    
    if (type === 'Full Day') return true;
    if (type === 'Half Day FN') return period <= 4;
    if (type === 'Half Day AN') return period >= 5;
    
    const normalized = periods.toLowerCase();
    if (normalized.includes('all')) return true;
    
    const numbers = normalized.match(/\d+/g);
    if (!numbers) return false;
    
    if (normalized.includes('to') || normalized.includes('-')) {
      const start = parseInt(numbers[0], 10);
      const end = parseInt(numbers[1] || numbers[0], 10);
      return period >= start && period <= end;
    } else {
      return numbers.map(Number).includes(period);
    }
  });
}

function getSheetData(sheet) {
  const range = sheet.getDataRange();
  const values = range.getValues();
  if (values.length === 0) return [];
  
  const headers = values[0].map(h => String(h).trim());
  const data = [];
  
  for (let i = 1; i < values.length; i++) {
    const row = {};
    headers.forEach((h, index) => {
      row[h] = values[i][index];
    });
    data.push(row);
  }
  return data;
}

function getTeacherSubject(registry, name) {
  const record = registry.find(t => t['Teacher Name'] === name);
  return record ? record['Main Subject'] : 'General';
}

function getTeacherDailySchedule(timetable, name, day) {
  const schedule = {};
  for (let p = 1; p <= 8; p++) {
    schedule[`Period ${p}`] = 'Free';
  }
  
  timetable.forEach(row => {
    if (row['Day'] === day) {
      for (let p = 1; p <= 8; p++) {
        const key = `Period ${p}`;
        if (row[key] === name) {
          schedule[key] = row['Class'];
        }
      }
    }
  });
  return schedule;
}

function formatDate(dateVal) {
  if (dateVal instanceof Date) {
    return Utilities.formatDate(dateVal, Session.getScriptTimeZone(), "yyyy-MM-dd");
  }
  return String(dateVal).trim();
}

function clearSubstitutionLog() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const logSheet = ss.getSheetByName('Daily Substitution Log');
  const ui = SpreadsheetApp.getUi();
  
  if (logSheet) {
    const response = ui.alert('Confirm Clear', 'Are you sure you want to clear all rows in the Daily Substitution Log?', ui.ButtonSet.YES_NO);
    if (response === ui.Button.YES) {
      logSheet.clear();
      logSheet.appendRow(["Date", "Day", "Period", "Class", "Subject", "Absent Teacher", "Substitute Teacher"]);
      ui.alert('Cleared', 'Daily Substitution Log cleared.', ui.ButtonSet.OK);
    }
  } else {
    ui.alert('Info', 'Daily Substitution Log tab not found.', ui.ButtonSet.OK);
  }
}
