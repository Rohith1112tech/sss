const fs = require('fs');
const path = require('path');

function parseCSV(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf8');
    const lines = content.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    if (lines.length === 0) return [];
    
    const headers = lines[0].split(',');
    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const row = {};
        headers.forEach((h, index) => {
            row[h] = values[index] ? values[index].trim() : '';
        });
        data.push(row);
    }
    return data;
}

const teachers = parseCSV('d:\\ssss\\Teacher_Registry.csv');
const timetable = parseCSV('d:\\ssss\\Master_Timetable.csv');
const absentees = parseCSV('d:\\ssss\\Daily_Absentee_List.csv');

// Boilerplate template for app.js logic
const jsContent = `/**
 * School Substitution System - Web Logic
 */

// Embedded default datasets from CSV databases
const DEFAULT_TEACHERS = ${JSON.stringify(teachers, null, 2)};
const DEFAULT_TIMETABLE = ${JSON.stringify(timetable, null, 2)};
const DEFAULT_ABSENTEES = ${JSON.stringify(absentees, null, 2)};

// State variables
let state = {
    teachers: [],
    timetable: [],
    absentees: [],
    subLog: []
};

// Initialize system state
function initSystem() {
    // Load from localStorage or use defaults
    state.teachers = JSON.parse(localStorage.getItem('sub_teachers')) || DEFAULT_TEACHERS;
    state.timetable = JSON.parse(localStorage.getItem('sub_timetable')) || DEFAULT_TIMETABLE;
    state.absentees = JSON.parse(localStorage.getItem('sub_absentees')) || DEFAULT_ABSENTEES;
    state.subLog = JSON.parse(localStorage.getItem('sub_log')) || [];
    
    saveState();
}

function saveState() {
    localStorage.setItem('sub_teachers', JSON.stringify(state.teachers));
    localStorage.setItem('sub_timetable', JSON.stringify(state.timetable));
    localStorage.setItem('sub_absentees', JSON.stringify(state.absentees));
    localStorage.setItem('sub_log', JSON.stringify(state.subLog));
}

// Helpers
function getTeacherSubject(name) {
    const t = state.teachers.find(item => item.Teacher_Name === name);
    return t ? t.Main_Subject : 'General';
}

function getTeacherMaxCapacity(name) {
    const t = state.teachers.find(item => item.Teacher_Name === name);
    return t ? parseInt(t.Max_Periods_Per_Day || '5', 10) : 5;
}

function getTeacherDailySchedule(name, day) {
    const schedule = {};
    for (let p = 1; p <= 8; p++) {
        schedule[\`Period_\${p}\`] = 'Free';
    }
    
    state.timetable.forEach(row => {
        if (row.Day === day) {
            for (let p = 1; p <= 8; p++) {
                const key = \`Period_\${p}\`;
                if (row[key] === name) {
                    schedule[key] = row.Class;
                }
            }
        }
    });
    return schedule;
}

function isTeacherAbsentForPeriod(name, dateStr, period) {
    const records = state.absentees.filter(row => row.Teacher_Name === name && row.Date === dateStr);
    if (records.length === 0) return false;
    
    return records.some(row => {
        const type = row.Absence_Type;
        const periods = row.Specific_Periods_Absent || 'All';
        const status = row.Status;
        
        if (status !== 'Absent') return false;
        if (type === 'Full Day') return true;
        if (type === 'Half Day FN') return period <= 4;
        if (type === 'Half Day AN') return period >= 5;
        
        const normalized = periods.toLowerCase();
        if (normalized.includes('all')) return true;
        
        const numbers = normalized.match(/\\d+/g);
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

function calculateWorkload(name, day, dateStr, activeSubs) {
    const schedule = getTeacherDailySchedule(name, day);
    let count = 0;
    for (let p = 1; p <= 8; p++) {
        if (schedule[\`Period_\${p}\`] !== 'Free') count++;
    }
    
    const subsToday = activeSubs.filter(row => row.Date === dateStr && row.Substitute_Teacher === name);
    count += subsToday.length;
    
    return count;
}

// core matching engine logic
function findSubstituteForPeriod(req, activeSubs) {
    const { day, date, period, absentTeacher, subject } = req;
    const periodKey = \`Period_\${period}\`;
    
    const candidates = [];
    
    state.teachers.forEach(teacherRecord => {
        const name = teacherRecord.Teacher_Name;
        if (!name || name === absentTeacher) return;
        
        // Skip if absent in this period
        if (isTeacherAbsentForPeriod(name, date, period)) return;
        
        // Skip if busy in this period
        const originalSchedule = getTeacherDailySchedule(name, day);
        if (originalSchedule[periodKey] !== 'Free') return;
        
        const isSubbingThisPeriod = activeSubs.some(row => 
            row.Date === date && 
            row.Period === String(period) && 
            row.Substitute_Teacher === name
        );
        if (isSubbingThisPeriod) return;

        // Rule 1: No Repeated Substitutions today
        const hasSubbedToday = activeSubs.some(row => 
            row.Date === date && 
            row.Substitute_Teacher === name
        );
        
        // Rule 2: No Continuous Classes (P-1, P+1)
        let hasAdjacentClass = false;
        const checkPeriods = [];
        if (period > 1) checkPeriods.push(period - 1);
        if (period < 8) checkPeriods.push(period + 1);
        
        for (const adjPeriod of checkPeriods) {
            const adjPeriodKey = \`Period_\${adjPeriod}\`;
            if (originalSchedule[adjPeriodKey] !== 'Free') {
                hasAdjacentClass = true;
                break;
            }
            const isSubbingAdj = activeSubs.some(row => 
                row.Date === date && 
                row.Period === String(adjPeriod) && 
                row.Substitute_Teacher === name
            );
            if (isSubbingAdj) {
                hasAdjacentClass = true;
                break;
            }
        }
        
        // Rule 3: Workload limit
        const workload = calculateWorkload(name, day, date, activeSubs);
        const maxCapacity = getTeacherMaxCapacity(name);
        if (workload >= maxCapacity) return;
        
        const isSubjectMatch = teacherRecord.Main_Subject === subject;
        
        candidates.push({
            name,
            workload,
            hasSubbedToday,
            hasAdjacentClass,
            isSubjectMatch
        });
    });
    
    // Fallbacks
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
    
    if (filtered.length === 0) return 'MANUAL INTERVENTION REQUIRED';
    
    // Sort
    filtered.sort((a, b) => {
        if (a.isSubjectMatch && !b.isSubjectMatch) return -1;
        if (!a.isSubjectMatch && b.isSubjectMatch) return 1;
        return a.workload - b.workload;
    });
    
    return filtered[0].name;
}

// Generate all substitutions for a date
function calculateSubstitutions(dateStr) {
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const day = dayNames[new Date(dateStr).getDay()];
    
    if (day === "Saturday" || day === "Sunday") return [];

    // Find active absences
    const activeAbsences = state.absentees.filter(row => row.Date === dateStr && row.Status === 'Absent');
    const absentNames = activeAbsences.map(row => row.Teacher_Name);
    
    // Clear old auto-generated substitutions for this date
    state.subLog = state.subLog.filter(row => row.Date !== dateStr);
    
    const requirements = [];
    state.timetable.forEach(row => {
        if (row.Day === day) {
            for (let p = 1; p <= 8; p++) {
                const key = \`Period_\${p}\`;
                const teacher = row[key];
                if (teacher && teacher !== 'Free' && absentNames.includes(teacher) && isTeacherAbsentForPeriod(teacher, dateStr, p)) {
                    requirements.push({
                        class: row.Class,
                        day: day,
                        date: dateStr,
                        period: p,
                        absentTeacher: teacher,
                        subject: getTeacherSubject(teacher)
                    });
                }
            }
        }
    });
    
    // Sort: Senior first
    requirements.sort((a, b) => {
        const getPriority = (cls) => {
            if (cls.startsWith('12')) return 4;
            if (cls.startsWith('11')) return 3;
            if (cls.startsWith('10') || cls.startsWith('9')) return 2;
            return 1;
        };
        return getPriority(b.class) - getPriority(a.class) || a.period - b.period;
    });
    
    const currentSubs = [];
    requirements.forEach(req => {
        const sub = findSubstituteForPeriod(req, currentSubs);
        const assignment = {
            Date: dateStr,
            Day: day,
            Period: String(req.period),
            Class: req.class,
            Subject: req.subject,
            Absent_Teacher: req.absentTeacher,
            Substitute_Teacher: sub
        };
        currentSubs.push(assignment);
        state.subLog.push(assignment);
    });
    
    saveState();
    return currentSubs;
}

// UI Controllers
document.addEventListener('DOMContentLoaded', () => {
    initSystem();
    initUI();
});

function initUI() {
    // 1. Navigation Tab Switches
    const navItems = document.querySelectorAll('.nav-item');
    const tabViews = document.querySelectorAll('.tab-view');
    
    navItems.forEach(item => {
        item.addEventListener('click', () => {
            navItems.forEach(i => i.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));
            
            item.classList.add('active');
            const tabId = item.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            
            // Trigger specific tab loading logic
            if (tabId === 'tab-timetable') renderTimetableTab();
            if (tabId === 'tab-teachers') renderTeachersTab();
        });
    });
    
    // 2. Theme Toggle Handler
    const themeBtn = document.getElementById('theme-toggle');
    const savedTheme = localStorage.getItem('theme') || 'dark';
    document.documentElement.setAttribute('data-theme', savedTheme);
    themeBtn.innerHTML = savedTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    
    themeBtn.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        themeBtn.innerHTML = newTheme === 'light' ? '🌙 Dark Mode' : '☀️ Light Mode';
    });
    
    // 3. Date Input Handler
    const datePicker = document.getElementById('selected-date');
    const todayStr = new Date().toISOString().split('T')[0];
    datePicker.value = todayStr;
    datePicker.addEventListener('change', () => {
        renderDashboard();
    });
    
    // 4. Populate Forms Dropdowns
    populateTeacherDropdowns();
    
    // 5. Form Submissions
    // Absence Form
    const absenceForm = document.getElementById('absence-form');
    absenceForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const teacherName = document.getElementById('absent-teacher-name').value;
        const startDate = document.getElementById('absence-start-date').value;
        const endDate = document.getElementById('absence-end-date').value || startDate;
        const type = document.getElementById('absence-type').value;
        
        let periods = 'All';
        if (type === '1-Hour Permission') {
            const selected = [];
            for (let p = 1; p <= 8; p++) {
                if (document.getElementById(\`p-check-\${p}\`).checked) {
                    selected.push(p);
                }
            }
            periods = selected.length > 0 ? \`Period \${selected.join(', ')}\` : 'Period 1';
        }
        
        // Loop through dates
        let current = new Date(startDate);
        const end = new Date(endDate);
        
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            
            // Remove existing absence for this teacher on this date
            state.absentees = state.absentees.filter(row => 
                !(row.Teacher_Name === teacherName && row.Date === dateStr)
            );
            
            state.absentees.push({
                Date: dateStr,
                Teacher_Name: teacherName,
                Absence_Type: type,
                Specific_Periods_Absent: periods,
                Status: 'Absent'
            });
            
            current.setDate(current.getDate() + 1);
        }
        
        saveState();
        absenceForm.reset();
        togglePeriodSelection();
        renderDashboard();
    });
    
    // Toggle period selection checkbox grid based on absence type
    const absenceTypeSelect = document.getElementById('absence-type');
    absenceTypeSelect.addEventListener('change', togglePeriodSelection);
    
    // Teacher Registry Form
    const teacherForm = document.getElementById('add-teacher-form');
    teacherForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const name = document.getElementById('new-teacher-name').value.trim();
        const subject = document.getElementById('new-teacher-subject').value;
        const max = document.getElementById('new-teacher-max').value;
        
        if (state.teachers.some(t => t.Teacher_Name === name)) {
            alert('A teacher with this name already exists.');
            return;
        }
        
        state.teachers.push({
            Teacher_Name: name,
            Main_Subject: subject,
            Max_Periods_Per_Day: max
        });
        
        saveState();
        teacherForm.reset();
        renderTeachersTab();
        populateTeacherDropdowns();
    });

    // 6. Settings Import/Export
    document.getElementById('export-db').addEventListener('click', exportDatabase);
    document.getElementById('import-db').addEventListener('change', importDatabase);
    document.getElementById('export-subs').addEventListener('click', exportSubstitutionsToCSV);

    // Initial render
    renderDashboard();
}

function togglePeriodSelection() {
    const type = document.getElementById('absence-type').value;
    const grid = document.getElementById('periods-selection-wrapper');
    if (type === '1-Hour Permission') {
        grid.style.display = 'block';
    } else {
        grid.style.display = 'none';
    }
}

function populateTeacherDropdowns() {
    const dropdown = document.getElementById('absent-teacher-name');
    dropdown.innerHTML = '';
    state.teachers.forEach(t => {
        const option = document.createElement('option');
        option.value = t.Teacher_Name;
        option.textContent = \`\${t.Teacher_Name} (\${t.Main_Subject})\`;
        dropdown.appendChild(option);
    });
}

// Page 1: Dashboard Render
function renderDashboard() {
    const dateStr = document.getElementById('selected-date').value;
    
    // Run substitution calculations
    calculateSubstitutions(dateStr);
    
    // 1. Render active absentees
    const absList = document.getElementById('today-absentees');
    absList.innerHTML = '';
    
    const absToday = state.absentees.filter(row => row.Date === dateStr && row.Status === 'Absent');
    if (absToday.length === 0) {
        absList.innerHTML = '<div style="color:var(--text-secondary);font-size:14px;text-align:center;padding:12px;">No absences logged for today.</div>';
    } else {
        absToday.forEach(row => {
            const item = document.createElement('div');
            item.className = 'absentee-item';
            item.innerHTML = \`
                <div class="absentee-info">
                    <div class="absentee-name">\${row.Teacher_Name}</div>
                    <div class="absentee-meta">\${row.Absence_Type} (\${row.Specific_Periods_Absent})</div>
                </div>
                <button class="btn btn-danger" style="padding: 6px 12px; font-size:12px;" onclick="cancelAbsence('\${row.Teacher_Name}', '\${row.Date}')">Remove</button>
            \`;
            absList.appendChild(item);
        });
    }
    
    // 2. Render substitution table
    const tbody = document.getElementById('substitutions-tbody');
    tbody.innerHTML = '';
    
    const subsToday = state.subLog.filter(row => row.Date === dateStr);
    if (subsToday.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-secondary);">No substitutions required today.</td></tr>';
        return;
    }
    
    subsToday.forEach(row => {
        // Calculate the workload today for this sub
        const currentWorkload = row.Substitute_Teacher !== 'MANUAL INTERVENTION REQUIRED' && row.Substitute_Teacher !== 'UNASSIGNED' 
            ? calculateWorkload(row.Substitute_Teacher, row.Day, dateStr, subsToday) 
            : 0;
            
        const maxCapacity = row.Substitute_Teacher !== 'MANUAL INTERVENTION REQUIRED' && row.Substitute_Teacher !== 'UNASSIGNED'
            ? getTeacherMaxCapacity(row.Substitute_Teacher)
            : 0;
            
        // Check subject match
        const subSubj = row.Substitute_Teacher !== 'MANUAL INTERVENTION REQUIRED' && row.Substitute_Teacher !== 'UNASSIGNED'
            ? getTeacherSubject(row.Substitute_Teacher)
            : '';
        const match = subSubj === row.Subject;
        
        const tr = document.createElement('tr');
        
        let subCellHTML = '';
        if (row.Substitute_Teacher === 'MANUAL INTERVENTION REQUIRED' || row.Substitute_Teacher === 'UNASSIGNED') {
            subCellHTML = \`<span class="badge badge-danger">MANUAL REQUIRED</span>\`;
        } else {
            subCellHTML = \`
                <div><strong>\${row.Substitute_Teacher}</strong></div>
                <div style="font-size:11px;color:var(--text-secondary);">Workload: \${currentWorkload}/\${maxCapacity}</div>
            \`;
        }
        
        // Match indicator
        const matchBadge = match 
            ? \`<span class="badge badge-success">Subject Match</span>\` 
            : (row.Substitute_Teacher !== 'MANUAL INTERVENTION REQUIRED' && row.Substitute_Teacher !== 'UNASSIGNED' 
                ? \`<span class="badge badge-warning">General Sub</span>\` 
                : '');

        // Render select dropdown for manual overrides
        const overrideSelector = buildOverrideSelector(row, subsToday);

        tr.innerHTML = \`
            <td>\${row.Class}</td>
            <td><strong>Period \${row.Period}</strong></td>
            <td>\${row.Absent_Teacher} <span style="font-size:11px;color:var(--text-secondary);">(\${row.Subject})</span></td>
            <td>\${subCellHTML}</td>
            <td>\${matchBadge}</td>
            <td>\${overrideSelector}</td>
        \`;
        
        tbody.appendChild(tr);
    });
}

function buildOverrideSelector(row, activeSubs) {
    let selectHTML = \`<select class="sub-select" onchange="overrideSubstitution('\${row.Class}', '\${row.Period}', '\${row.Date}', this.value)">\`;
    
    // Add current selection first
    selectHTML += \`<option value="\${row.Substitute_Teacher}" selected>\${row.Substitute_Teacher === 'MANUAL INTERVENTION REQUIRED' ? 'Override...' : row.Substitute_Teacher}</option>\`;
    
    if (row.Substitute_Teacher !== 'MANUAL INTERVENTION REQUIRED') {
        selectHTML += \`<option value="MANUAL INTERVENTION REQUIRED">Unassign</option>\`;
    }
    
    // Add all other available free teachers in this period
    const periodKey = \`Period_\${row.Period}\`;
    const absentNames = state.absentees.filter(a => a.Date === row.Date && a.Status === 'Absent').map(a => a.Teacher_Name);
    
    state.teachers.forEach(t => {
        if (t.Teacher_Name === row.Absent_Teacher || t.Teacher_Name === row.Substitute_Teacher) return;
        if (absentNames.includes(t.Teacher_Name)) return; // absent
        
        // Free in original schedule?
        const sched = getTeacherDailySchedule(t.Teacher_Name, row.Day);
        if (sched[periodKey] !== 'Free') return; // busy
        
        // Not subbing in this period already?
        const isSubbing = activeSubs.some(s => s.Period === row.Period && s.Substitute_Teacher === t.Teacher_Name);
        if (isSubbing) return;
        
        selectHTML += \`<option value="\${t.Teacher_Name}">\${t.Teacher_Name} (\${t.Main_Subject})</option>\`;
    });
    
    selectHTML += \`</select>\`;
    return selectHTML;
}

function overrideSubstitution(cls, period, dateStr, value) {
    const idx = state.subLog.findIndex(row => 
        row.Class === cls && 
        row.Period === String(period) && 
        row.Date === dateStr
    );
    
    if (idx !== -1) {
        state.subLog[idx].Substitute_Teacher = value;
        saveState();
        renderDashboard();
    }
}

function cancelAbsence(name, dateStr) {
    state.absentees = state.absentees.filter(row => 
        !(row.Teacher_Name === name && row.Date === dateStr)
    );
    saveState();
    renderDashboard();
}

// Page 2: Timetable Grid Render
function renderTimetableTab() {
    const searchVal = document.getElementById('search-class').value.toLowerCase();
    const tbody = document.getElementById('timetable-tbody');
    tbody.innerHTML = '';
    
    // Filter timetable rows by searched class
    const filteredRows = state.timetable.filter(row => 
        row.Class.toLowerCase().includes(searchVal)
    );
    
    // Build options for teacher cell selectors
    let teacherOptionsHTML = '<option value="Free">Free</option>';
    state.teachers.forEach(t => {
        teacherOptionsHTML += \`<option value="\${t.Teacher_Name}">\${t.Teacher_Name}</option>\`;
    });
    
    filteredRows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        let periodsCellsHTML = '';
        for (let p = 1; p <= 8; p++) {
            const key = \`Period_\${p}\`;
            const val = row[key] || 'Free';
            
            // Construct a dropdown select in each cell to edit timetable inline
            periodsCellsHTML += \`
                <td>
                    <select class="timetable-cell-select" onchange="updateTimetableCell('\${row.Class}', '\${row.Day}', \${p}, this.value)">
                        <option value="\${val}" selected>\${val}</option>
                        \${teacherOptionsHTML}
                    </select>
                </td>
            \`;
        }
        
        tr.innerHTML = \`
            <td><strong>\${row.Class}</strong></td>
            <td>\${row.Day}</td>
            \${periodsCellsHTML}
        \`;
        tbody.appendChild(tr);
    });
}

function updateTimetableCell(cls, day, period, value) {
    const idx = state.timetable.findIndex(row => 
        row.Class === cls && 
        row.Day === day
    );
    
    if (idx !== -1) {
        state.timetable[idx][\`Period_\${period}\`] = value;
        saveState();
    }
}

function filterTimetable() {
    renderTimetableTab();
}

// Page 3: Teacher Registry Render
function renderTeachersTab() {
    const tbody = document.getElementById('teachers-tbody');
    tbody.innerHTML = '';
    
    state.teachers.forEach(t => {
        const tr = document.createElement('tr');
        tr.innerHTML = \`
            <td><strong>\${t.Teacher_Name}</strong></td>
            <td>\${t.Main_Subject}</td>
            <td>\${t.Max_Periods_Per_Day}</td>
            <td>
                <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteTeacher('\${t.Teacher_Name}')">Delete</button>
            </td>
        \`;
        tbody.appendChild(tr);
    });
}

function deleteTeacher(name) {
    if (confirm(\`Are you sure you want to delete \${name}? This will remove them from all database configurations.\`)) {
        state.teachers = state.teachers.filter(t => t.Teacher_Name !== name);
        // Set all timetable occurrences of this teacher to Free
        state.timetable.forEach(row => {
            for (let p = 1; p <= 8; p++) {
                const key = \`Period_\${p}\`;
                if (row[key] === name) {
                    row[key] = 'Free';
                }
            }
        });
        
        saveState();
        renderTeachersTab();
        populateTeacherDropdowns();
    }
}

// Backup & Import
function exportDatabase() {
    const backup = {
        teachers: state.teachers,
        timetable: state.timetable,
        absentees: state.absentees,
        subLog: state.subLog
    };
    
    const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`substitution_system_backup_\${new Date().toISOString().split('T')[0]}.json\`;
    a.click();
}

function importDatabase(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.teachers && data.timetable && data.absentees) {
                state.teachers = data.teachers;
                state.timetable = data.timetable;
                state.absentees = data.absentees;
                state.subLog = data.subLog || [];
                
                saveState();
                populateTeacherDropdowns();
                renderDashboard();
                alert('Database successfully restored from backup file.');
            } else {
                alert('Invalid backup file format.');
            }
        } catch (err) {
            alert('Failed to parse backup file: ' + err.message);
        }
    };
    reader.readAsText(file);
}

function exportSubstitutionsToCSV() {
    const dateStr = document.getElementById('selected-date').value;
    const subsToday = state.subLog.filter(row => row.Date === dateStr);
    
    if (subsToday.length === 0) {
        alert('No substitutions to export for today.');
        return;
    }
    
    let csv = "Date,Day,Period,Class,Subject,Absent Teacher,Substitute Teacher\\n";
    subsToday.forEach(r => {
        csv += \`\${r.Date},\${r.Day},\${r.Period},\${r.Class},\${r.Subject},\${r.Absent_Teacher},\${r.Substitute_Teacher}\\n\`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`substitutions_\${dateStr}.csv\`;
    a.click();
}
`;

fs.writeFileSync('d:\\ssss\\app.js', jsContent);
console.log("Successfully generated app.js with embedded CSV databases!");
