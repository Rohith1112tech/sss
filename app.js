/**
 * School Substitution System - Web Logic (PostgreSQL Integration)
 */

// Change this to your deployed Render backend URL (e.g., 'https://submanager-backend.onrender.com/api')
const PROD_API_URL = 'https://YOUR_BACKEND_APP.onrender.com/api';

const API_BASE = (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
    ? 'http://localhost:3000/api'
    : PROD_API_URL;

// Local copy of state synchronized from DB
let state = {
    teachers: [],
    timetable: [],
    absentees: [],
    subLog: [],
    classes: [],
    timings: [],
    exceptions: []
};

// Fetch latest database state
async function fetchState() {
    try {
        const response = await fetch(`${API_BASE}/state`);
        if (!response.ok) throw new Error('Failed to fetch database state');
        state = await response.json();
    } catch (err) {
        console.error("Database connection error:", err);
    }
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
        schedule[`Period_${p}`] = 'Free';
    }
    
    state.timetable.forEach(row => {
        if (row.Day === day) {
            for (let p = 1; p <= 8; p++) {
                const key = `Period_${p}`;
                if (row[key] === name) {
                    schedule[key] = row.Class;
                }
            }
        }
    });
    return schedule;
}

function calculateWorkload(name, day, dateStr, activeSubs) {
    const schedule = getTeacherDailySchedule(name, day);
    let count = 0;
    for (let p = 1; p <= 8; p++) {
        if (schedule[`Period_${p}`] !== 'Free') count++;
    }
    const subsToday = activeSubs.filter(row => row.Date === dateStr && row.Substitute_Teacher === name);
    count += subsToday.length;
    return count;
}

// UI Initialization
document.addEventListener('DOMContentLoaded', async () => {
    await fetchState();
    initUI();
    initLoginHandlers();
    verifySession();
});

function initUI() {
    // 1. Navigation Tab Switches
    const navItems = document.querySelectorAll('.nav-item');
    const tabViews = document.querySelectorAll('.tab-view');
    
    navItems.forEach(item => {
        item.addEventListener('click', async () => {
            navItems.forEach(i => i.classList.remove('active'));
            tabViews.forEach(v => v.classList.remove('active'));
            
            item.classList.add('active');
            const tabId = item.dataset.tab;
            document.getElementById(tabId).classList.add('active');
            
            // Re-fetch state on tab change to show up-to-date data
            await fetchState();
            updateAllDropdowns();
            
            if (tabId === 'tab-timetable') renderTimetableTab();
            if (tabId === 'tab-teachers') {
                renderTeachersTab();
                populateSubjectDropdowns();
            }
            if (tabId === 'tab-classes') renderClassesTab();
            if (tabId === 'tab-subjects') renderSubjectsTab();
            if (tabId === 'tab-timings') renderTimingsEditor();
            if (tabId === 'tab-subassigned') renderDashboard();
            if (tabId === 'tab-except') renderExceptTab();
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
    const visibleDatePicker = document.getElementById('visible-date');
    const subAssignedDatePicker = document.getElementById('sub-assigned-date');
    const todayStr = new Date().toISOString().split('T')[0];
    
    datePicker.value = todayStr;
    if (visibleDatePicker) visibleDatePicker.value = todayStr;
    if (subAssignedDatePicker) subAssignedDatePicker.value = todayStr;
    
    if (visibleDatePicker) {
        visibleDatePicker.addEventListener('change', () => {
            datePicker.value = visibleDatePicker.value;
            if (subAssignedDatePicker) subAssignedDatePicker.value = visibleDatePicker.value;
            renderDashboard();
        });
    }
    
    if (subAssignedDatePicker) {
        subAssignedDatePicker.addEventListener('change', () => {
            datePicker.value = subAssignedDatePicker.value;
            if (visibleDatePicker) visibleDatePicker.value = subAssignedDatePicker.value;
            renderDashboard();
        });
    }
    
    // 4. Populate Dropdowns
    populateTeacherDropdowns();
    
    // 5. Form Submissions
    
    // Absence Form
    const absenceForm = document.getElementById('absence-form');
    absenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teacherName = document.getElementById('absent-teacher-name').value;
        const startDate = document.getElementById('absence-start-date').value;
        const endDate = document.getElementById('absence-end-date').value || startDate;
        const type = document.getElementById('absence-type').value;
        
        let periods = 'All';
        if (type === '1-Hour Permission') {
            const selected = [];
            for (let p = 1; p <= 8; p++) {
                if (document.getElementById(`p-check-${p}`).checked) {
                    selected.push(p);
                }
            }
            periods = selected.length > 0 ? `Period ${selected.join(', ')}` : 'Period 1';
        }
        
        // Loop through dates and send post requests
        let current = new Date(startDate);
        const end = new Date(endDate);
        
        while (current <= end) {
            const dateStr = current.toISOString().split('T')[0];
            await fetch(`${API_BASE}/absentees`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    Date: dateStr,
                    Teacher_Name: teacherName,
                    Absence_Type: type,
                    Specific_Periods_Absent: periods
                })
            });
            current.setDate(current.getDate() + 1);
        }
        
        absenceForm.reset();
        togglePeriodSelection();
        await fetchState();
        renderDashboard();
    });
    
    const absenceTypeSelect = document.getElementById('absence-type');
    absenceTypeSelect.addEventListener('change', togglePeriodSelection);
    
    // Teacher Registry Modal triggers
    document.getElementById('open-add-teacher-modal-btn').addEventListener('click', () => {
        cancelTeacherEdit();
        document.getElementById('teacher-modal').style.display = 'flex';
    });

    document.getElementById('close-teacher-modal-btn').addEventListener('click', () => {
        document.getElementById('teacher-modal').style.display = 'none';
    });

    document.getElementById('teacher-cancel-btn').addEventListener('click', () => {
        cancelTeacherEdit();
        document.getElementById('teacher-modal').style.display = 'none';
    });

    // Teacher Registry Form
    const teacherForm = document.getElementById('add-teacher-form');
    teacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-teacher-name').value.trim();
        const subject = document.getElementById('new-teacher-subject').value;
        const max = document.getElementById('new-teacher-max').value;
        const type = document.getElementById('new-teacher-type').value;
        const isEdit = document.getElementById('teacher-edit-mode').value === 'true';
        
        if (!isEdit && state.teachers.some(t => t.Teacher_Name === name)) {
            alert('A teacher with this name already exists.');
            return;
        }
        
        await fetch(`${API_BASE}/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Teacher_Name: name,
                Main_Subject: subject,
                Max_Periods_Per_Day: max,
                Teacher_Type: type,
                isEdit: isEdit
            })
        });
        
        cancelTeacherEdit();
        document.getElementById('teacher-modal').style.display = 'none';
        await fetchState();
        renderTeachersTab();
        populateTeacherDropdowns();
    });

    // Class Registry Modal triggers
    document.getElementById('open-add-class-modal-btn').addEventListener('click', () => {
        document.getElementById('new-class-name').value = '';
        document.getElementById('class-modal').style.display = 'flex';
    });

    document.getElementById('close-class-modal-btn').addEventListener('click', () => {
        document.getElementById('class-modal').style.display = 'none';
    });

    document.getElementById('class-cancel-btn').addEventListener('click', () => {
        document.getElementById('class-modal').style.display = 'none';
    });

    // Class Registry Form
    const classForm = document.getElementById('add-class-form');
    classForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-class-name').value.trim();
        if (state.classes.includes(name)) {
            alert('This class name already exists.');
            return;
        }
        await fetch(`${API_BASE}/classes`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Class_Name: name })
        });
        classForm.reset();
        document.getElementById('class-modal').style.display = 'none';
        await fetchState();
        renderClassesTab();
        renderTimetableTab();
    });

    // Timings Registry Form
    const timingForm = document.getElementById('add-timing-form');
    timingForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('timing-slot-id').value;
        const name = document.getElementById('timing-name').value.trim();
        const start = document.getElementById('timing-start').value.trim();
        const end = document.getElementById('timing-end').value.trim();
        const desc = document.getElementById('timing-desc').value.trim();
        
        await fetch(`${API_BASE}/timings`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: id || null,
                period_name: name,
                start_time: start,
                end_time: end,
                description: desc
            })
        });
        
        cancelTimingEdit();
        document.getElementById('timing-modal').style.display = 'none';
        await fetchState();
        renderTimingsEditor();
        renderTimingsBoard();
    });
    
    document.getElementById('timing-cancel-btn').addEventListener('click', () => {
        cancelTimingEdit();
        document.getElementById('timing-modal').style.display = 'none';
    });

    document.getElementById('open-add-timing-modal-btn').addEventListener('click', () => {
        cancelTimingEdit();
        document.getElementById('timing-modal').style.display = 'flex';
    });

    document.getElementById('close-timing-modal-btn').addEventListener('click', () => {
        document.getElementById('timing-modal').style.display = 'none';
    });

    // Subject Registry Modal triggers
    document.getElementById('open-add-subject-modal-btn').addEventListener('click', () => {
        document.getElementById('new-subject-name').value = '';
        document.getElementById('subject-modal').style.display = 'flex';
    });

    document.getElementById('close-subject-modal-btn').addEventListener('click', () => {
        document.getElementById('subject-modal').style.display = 'none';
    });

    document.getElementById('subject-cancel-btn').addEventListener('click', () => {
        document.getElementById('subject-modal').style.display = 'none';
    });

    // Subject Registry Form
    const subjectForm = document.getElementById('add-subject-form');
    subjectForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-subject-name').value.trim();
        if (state.subjects.includes(name)) {
            alert('This subject name already exists.');
            return;
        }
        await fetch(`${API_BASE}/subjects`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Subject_Name: name })
        });
        subjectForm.reset();
        document.getElementById('subject-modal').style.display = 'none';
        await fetchState();
        renderSubjectsTab();
        populateSubjectDropdowns();
    });

    const exportBtn = document.getElementById('export-subs-btn');
    const exportMenu = document.getElementById('export-dropdown-menu');
    exportBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const display = exportMenu.style.display;
        exportMenu.style.display = display === 'block' ? 'none' : 'block';
    });

    document.addEventListener('click', () => {
        if (exportMenu) exportMenu.style.display = 'none';
    });

    // Initial render
    renderTimingsBoard();
    renderDashboard();
    renderTimetableTab();
    renderTeachersTab();
    populateSubjectDropdowns();
    renderClassesTab();
    renderSubjectsTab();
    renderTimingsEditor();
    
    updateAllDropdowns();
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
        option.textContent = t.Teacher_Name;
        dropdown.appendChild(option);
    });
}

// Page 1: Dashboard Render
async function renderDashboard() {
    const dateStr = document.getElementById('selected-date').value;
    
    // Trigger server calculations for today
    try {
        const response = await fetch(`${API_BASE}/substitutions/calculate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Date: dateStr })
        });
        if (!response.ok) throw new Error('Calculation failed');
    } catch (err) {
        console.error("Calculation Error:", err);
    }
    
    // Re-fetch fresh state reflecting the calculations
    await fetchState();
    
    // Sync visible dates on UI
    const subAssignedDatePicker = document.getElementById('sub-assigned-date');
    if (subAssignedDatePicker) {
        subAssignedDatePicker.value = dateStr;
    }
    const visibleDatePicker = document.getElementById('visible-date');
    if (visibleDatePicker) {
        visibleDatePicker.value = dateStr;
    }
    
    // 1. Render active absentees
    const absList = document.getElementById('today-absentees');
    absList.innerHTML = '';
    
    const isTeacherRole = localStorage.getItem('user_role') === 'Teacher';
    const absToday = state.absentees.filter(row => row.Date === dateStr && row.Status === 'Absent');
    if (absToday.length === 0) {
        absList.innerHTML = '<div style="color:var(--text-secondary);font-size:14px;text-align:center;padding:12px;">No absences logged for today.</div>';
    } else {
        absToday.forEach(row => {
            const item = document.createElement('div');
            item.className = 'absentee-item';
            const removeBtnHTML = isTeacherRole ? '' : `<button class="btn btn-danger" style="padding: 6px 12px; font-size:12px;" onclick="cancelAbsence('${row.Teacher_Name}', '${row.Date}')">Remove</button>`;
            item.innerHTML = `
                <div class="absentee-info">
                    <div class="absentee-name">${row.Teacher_Name}</div>
                    <div class="absentee-meta">${row.Absence_Type} (${row.Specific_Periods_Absent})</div>
                </div>
                ${removeBtnHTML}
            `;
            absList.appendChild(item);
        });
    }
    
    // 2. Render substitution table (Substituted Timetable Grid)
    const tbody = document.getElementById('substitutions-tbody');
    tbody.innerHTML = '';
    
    if (absToday.length === 0) {
        tbody.innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-secondary);padding:24px;">No substitutions required today.</td></tr>';
        return;
    }
    
    const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    const dayName = dayNames[new Date(dateStr).getDay()];
    const subsToday = state.subLog.filter(row => row.Date === dateStr);
    
    absToday.forEach(abs => {
        const name = abs.Teacher_Name;
        const teacherRec = state.teachers.find(t => t.Teacher_Name === name) || { Teacher_Type: 'Class Teacher', Class_Name: null };
        const isCT = teacherRec.Teacher_Type === 'Class Teacher';
        
        const tr = document.createElement('tr');
        
        // Col 1: Absent Teacher Name
        let html = `<td><strong>${name}</strong></td>`;
        // Col 2: Date
        html += `<td>${dateStr}</td>`;
        // Col 3: Day
        html += `<td>${dayName.substring(0, 3).toUpperCase()}</td>`;
        
        // Col 4: Morning Duty (Period 0)
        if (isCT) {
            const classLabel = teacherRec.Class_Name || 'Morning Duty';
            const log = subsToday.find(s => s.Absent_Teacher === name && parseInt(s.Period, 10) === 0);
            if (log) {
                const selector = isTeacherRole 
                    ? `<div style="font-weight:600; color:var(--primary-color);">${log.Substitute_Teacher === 'MANUAL INTERVENTION REQUIRED' ? 'Unassigned' : log.Substitute_Teacher}</div>`
                    : buildGridOverrideSelector(dateStr, dayName, classLabel, 0, name, log.Substitute_Teacher, subsToday);
                html += `<td>
                    <div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">${classLabel}</div>
                    ${selector}
                </td>`;
            } else {
                html += `<td style="color:var(--text-secondary); font-size:12px;">(Not Absent / Not CT)</td>`;
            }
        } else {
            html += `<td style="color:var(--text-secondary); font-size:12px;">(Not Absent / Not CT)</td>`;
        }
        
        // Col 5 to 12: Period 1 to 8
        for (let p = 1; p <= 8; p++) {
            const cls = findClassForTeacherPeriod(name, dayName, p);
            if (cls) {
                const log = subsToday.find(s => s.Absent_Teacher === name && parseInt(s.Period, 10) === p && s.Class === cls);
                if (log) {
                    const selector = isTeacherRole
                        ? `<div style="font-weight:600; color:var(--primary-color);">${log.Substitute_Teacher === 'MANUAL INTERVENTION REQUIRED' ? 'Unassigned' : log.Substitute_Teacher}</div>`
                        : buildGridOverrideSelector(dateStr, dayName, cls, p, name, log.Substitute_Teacher, subsToday);
                    html += `<td>
                        <div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">${cls}</div>
                        ${selector}
                    </td>`;
                } else {
                    html += `<td style="color:var(--text-secondary); font-size:12px;">- (Not Absent)</td>`;
                }
            } else {
                html += `<td style="color:var(--text-secondary); font-size:12px;">- (Not Absent)</td>`;
            }
        }
        
        // Col 13: Evening Duty (Period 12)
        if (isCT) {
            const classLabel = 'Evening Duty';
            const log = subsToday.find(s => s.Absent_Teacher === name && parseInt(s.Period, 10) === 12);
            if (log) {
                const selector = isTeacherRole
                    ? `<div style="font-weight:600; color:var(--primary-color);">${log.Substitute_Teacher === 'MANUAL INTERVENTION REQUIRED' ? 'Unassigned' : log.Substitute_Teacher}</div>`
                    : buildGridOverrideSelector(dateStr, dayName, 'Van duty', 12, name, log.Substitute_Teacher, subsToday);
                html += `<td>
                    <div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">Van duty</div>
                    ${selector}
                </td>`;
            } else {
                html += `<td style="color:var(--text-secondary); font-size:12px;">(Not Absent)</td>`;
            }
        } else {
            html += `<td style="color:var(--text-secondary); font-size:12px;">(Not Absent)</td>`;
        }
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function findClassForTeacherPeriod(teacherName, dayName, p) {
    const key = `Period_${p}`;
    const row = state.timetable.find(r => r.Day === dayName && r[key] === teacherName);
    return row ? row.Class : null;
}

function buildGridOverrideSelector(dateStr, dayName, cls, period, absentTeacher, substituteTeacher, activeSubs) {
    const isSupervision = [0, 9, 10, 11, 12].includes(parseInt(period, 10));
    let selectHTML = `<select class="sub-select" style="width:100%; min-width:120px;" onchange="overrideSubstitution('${cls}', '${period}', '${dateStr}', this.value)">`;
    
    selectHTML += `<option value="${substituteTeacher}" selected>${substituteTeacher === 'MANUAL INTERVENTION REQUIRED' ? 'Override...' : substituteTeacher}</option>`;
    
    if (substituteTeacher !== 'MANUAL INTERVENTION REQUIRED') {
        selectHTML += `<option value="MANUAL INTERVENTION REQUIRED">Unassign</option>`;
    }
    
    const periodKey = `Period_${period}`;
    const absentNames = state.absentees.filter(a => a.Date === dateStr && a.Status === 'Absent').map(a => a.Teacher_Name);
    
    state.teachers.forEach(t => {
        if (t.Teacher_Name === absentTeacher || t.Teacher_Name === substituteTeacher) return;
        if (absentNames.includes(t.Teacher_Name)) return; // absent
        
        if (isSupervision) {
            if (t.Teacher_Type !== 'Non Class Teacher') return;
        } else {
            const sched = getTeacherDailySchedule(t.Teacher_Name, dayName);
            if (sched[periodKey] !== 'Free') return; // busy
        }
        
        const isSubbing = activeSubs.some(s => s.Period === String(period) && s.Substitute_Teacher === t.Teacher_Name);
        if (isSubbing) return;
        
        selectHTML += `<option value="${t.Teacher_Name}">${t.Teacher_Name}</option>`;
    });
    
    selectHTML += `</select>`;
    return selectHTML;
}

async function overrideSubstitution(cls, period, dateStr, value) {
    await fetch(`${API_BASE}/substitutions/override`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Class: cls,
            Period: period,
            Date: dateStr,
            Substitute_Teacher: value
        })
    });
    await fetchState();
    renderDashboard();
}

async function cancelAbsence(name, dateStr) {
    await fetch(`${API_BASE}/absentees?Date=${dateStr}&Teacher_Name=${name}`, {
        method: 'DELETE'
    });
    await fetchState();
    renderDashboard();
}

function renderTimetableTab() {
    const headers = document.querySelectorAll('#tab-timetable thead th');
    for (let p = 1; p <= 8; p++) {
        const name = `Period ${p}`;
        const t = state.timings.find(item => item.period_name === name);
        const suffix = t ? ` (${t.start_time}-${t.end_time})` : '';
        if (headers[p + 1]) {
            headers[p + 1].innerText = `P${p}${suffix}`;
        }
    }

    const classFilterVal = document.getElementById('filter-class')?.value || 'All';
    const teacherFilterVal = document.getElementById('filter-teacher')?.value || 'All';
    const tbody = document.getElementById('timetable-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filteredRows = state.timetable.filter(row => {
        const matchesClass = (classFilterVal === 'All' || row.Class === classFilterVal);
        const matchesTeacher = (teacherFilterVal === 'All' || [1,2,3,4,5,6,7,8].some(p => row[`Period_${p}`] === teacherFilterVal));
        return matchesClass && matchesTeacher;
    });
    
    let teacherOptionsHTML = '<option value="Free">Free</option>';
    state.teachers.forEach(t => {
        teacherOptionsHTML += `<option value="${t.Teacher_Name}">${t.Teacher_Name}</option>`;
    });
    
    filteredRows.forEach((row, rowIndex) => {
        const tr = document.createElement('tr');
        
        let periodsCellsHTML = '';
        for (let p = 1; p <= 8; p++) {
            const key = `Period_${p}`;
            const val = row[key] || 'Free';
            
            periodsCellsHTML += `
                <td>
                    <select class="timetable-cell-select" onchange="updateTimetableCell('${row.Class}', '${row.Day}', ${p}, this.value)">
                        <option value="${val}" selected>${val}</option>
                        ${teacherOptionsHTML}
                    </select>
                </td>
            `;
        }
        
        tr.innerHTML = `
            <td><strong>${row.Class}</strong></td>
            <td>${row.Day}</td>
            ${periodsCellsHTML}
        `;
        tbody.appendChild(tr);
    });
}

async function updateTimetableCell(cls, day, period, value) {
    await fetch(`${API_BASE}/timetable/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Class: cls,
            Day: day,
            Period: period,
            Value: value
        })
    });
    await fetchState();
}

function filterTimetable() {
    renderTimetableTab();
}

function renderTeachersTab() {
    const tbody = document.getElementById('teachers-tbody');
    tbody.innerHTML = '';
    
    state.teachers.forEach(t => {
        const tr = document.createElement('tr');
        const safeName = t.Teacher_Name.replace(/'/g, "\\'");
        const safeSubject = t.Main_Subject.replace(/'/g, "\\'");
        const safeType = (t.Teacher_Type || 'Class Teacher').replace(/'/g, "\\'");
        tr.innerHTML = `
            <td><strong>${t.Teacher_Name}</strong></td>
            <td>${t.Main_Subject}</td>
            <td>${t.Teacher_Type || 'Class Teacher'}</td>
            <td>${t.Max_Periods_Per_Day}</td>
            <td>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; margin-right:6px;" onclick="editTeacher('${safeName}', '${safeSubject}', '${safeType}', ${t.Max_Periods_Per_Day})">Edit</button>
                <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteTeacher('${safeName}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteTeacher(name) {
    if (confirm(`Are you sure you want to delete ${name}? This will remove them from all database configurations.`)) {
        await fetch(`${API_BASE}/teachers?Teacher_Name=${name}`, {
            method: 'DELETE'
        });
        await fetchState();
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
    a.download = `substitution_system_backup_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
}

async function importDatabase(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
        try {
            const data = JSON.parse(evt.target.result);
            if (data.teachers && data.timetable) {
                // Wipe and import directly into the server database via sequential REST APIs
                // This keeps the PostgreSQL DB synchronized with the import!
                
                // Clear old databases
                for (const t of state.teachers) {
                    await fetch(`${API_BASE}/teachers?Teacher_Name=${t.Teacher_Name}`, { method: 'DELETE' });
                }
                
                // Add new teachers
                for (const t of data.teachers) {
                    await fetch(`${API_BASE}/teachers`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(t)
                    });
                }
                
                // Update timetable cells
                for (const r of data.timetable) {
                    for (let p = 1; p <= 8; p++) {
                        await fetch(`${API_BASE}/timetable/cell`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                Class: r.Class,
                                Day: r.Day,
                                Period: p,
                                Value: r[`Period_${p}`]
                            })
                        });
                    }
                }
                
                // Add absentees
                for (const a of data.absentees) {
                    await fetch(`${API_BASE}/absentees`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(a)
                    });
                }
                
                await fetchState();
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
    
    let csv = "Date,Day,Period,Class,Subject,Absent Teacher,Substitute Teacher\n";
    subsToday.forEach(r => {
        csv += `${r.Date},${r.Day},${r.Period},${r.Class},${r.Subject},${r.Absent_Teacher},${r.Substitute_Teacher}\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `substitutions_${dateStr}.csv`;
    a.click();
}

function renderClassesTab() {
    const tbody = document.getElementById('classes-tbody');
    tbody.innerHTML = '';
    
    state.classes.forEach(cls => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${cls}</strong></td>
            <td>
                <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteClass('${cls}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteClass(name) {
    if (confirm(`Are you sure you want to delete class ${name}? This will clear all its timetable rows and calculated substitutions.`)) {
        await fetch(`${API_BASE}/classes?Class_Name=${name}`, {
            method: 'DELETE'
        });
        await fetchState();
        renderClassesTab();
        renderTimetableTab();
    }
}

function renderTimingsEditor() {
    const tbody = document.getElementById('timings-tbody');
    tbody.innerHTML = '';
    
    state.timings.forEach(t => {
        const tr = document.createElement('tr');
        const safeName = t.period_name.replace(/'/g, "\\'");
        const safeDesc = t.description.replace(/'/g, "\\'");
        tr.innerHTML = `
            <td><strong>${t.period_name}</strong></td>
            <td>${t.start_time}</td>
            <td>${t.end_time}</td>
            <td>${t.description}</td>
            <td>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; margin-right:6px;" onclick="editTimingSlot(${t.id}, '${safeName}', '${t.start_time}', '${t.end_time}', '${safeDesc}')">Edit</button>
                <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteTimingSlot(${t.id})">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

function renderTimingsBoard() {
    const container = document.querySelector('.timings-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    state.timings.forEach(t => {
        const card = document.createElement('div');
        card.className = 'time-slot-card';
        
        if (t.period_name.toLowerCase().includes('break')) {
            if (t.period_name.toLowerCase().includes('lunch')) {
                card.style.borderColor = 'var(--primary-color)';
                card.style.backgroundColor = 'var(--primary-glow)';
                card.style.color = 'var(--primary-color)';
            } else {
                card.style.borderColor = 'var(--warning-color)';
                card.style.backgroundColor = 'var(--warning-glow)';
                card.style.color = 'var(--warning-color)';
            }
        }
        
        card.innerHTML = `
            <span class="time-slot-name">${t.period_name}</span>
            <span class="time-slot-val">${t.start_time} - ${t.end_time}</span>
            <span class="time-slot-meta">${t.description}</span>
        `;
        container.appendChild(card);
    });
}

function editTimingSlot(id, name, start, end, desc) {
    document.getElementById('timing-slot-id').value = id;
    document.getElementById('timing-name').value = name;
    document.getElementById('timing-start').value = start;
    document.getElementById('timing-end').value = end;
    document.getElementById('timing-desc').value = desc;
    
    document.getElementById('timing-form-title').textContent = 'Edit Timing Slot';
    document.getElementById('timing-submit-btn').textContent = 'Update Slot';
    document.getElementById('timing-cancel-btn').style.display = 'block';
    
    document.getElementById('timing-modal').style.display = 'flex';
}

function cancelTimingEdit() {
    document.getElementById('timing-slot-id').value = '';
    document.getElementById('add-timing-form').reset();
    
    document.getElementById('timing-form-title').textContent = 'Add New Timing Slot';
    document.getElementById('timing-submit-btn').textContent = 'Add Slot';
    document.getElementById('timing-cancel-btn').style.display = 'none';
}

async function deleteTimingSlot(id) {
    if (confirm('Are you sure you want to delete this timing slot?')) {
        await fetch(`${API_BASE}/timings?id=${id}`, {
            method: 'DELETE'
        });
        await fetchState();
        renderTimingsEditor();
        renderTimingsBoard();
    }
}

function renderSubjectsTab() {
    const tbody = document.getElementById('subjects-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    state.subjects.forEach(sub => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${sub}</strong></td>
            <td>
                <button class="btn btn-danger" style="padding:6px 12px; font-size:12px;" onclick="deleteSubject('${sub}')">Delete</button>
            </td>
        `;
        tbody.appendChild(tr);
    });
}

async function deleteSubject(name) {
    if (confirm(`Are you sure you want to delete the subject "${name}"?`)) {
        await fetch(`${API_BASE}/subjects?Subject_Name=${name}`, {
            method: 'DELETE'
        });
        await fetchState();
        renderSubjectsTab();
        populateSubjectDropdowns();
    }
}

function populateSubjectDropdowns() {
    const select = document.getElementById('new-teacher-subject');
    if (!select) return;
    
    const currentVal = select.value;
    select.innerHTML = '';
    
    state.subjects.forEach(sub => {
        const option = document.createElement('option');
        option.value = sub;
        option.textContent = sub;
        select.appendChild(option);
    });
    
    if (state.subjects.includes(currentVal)) {
        select.value = currentVal;
    }
}

function editTeacher(name, subject, type, max) {
    document.getElementById('teacher-edit-mode').value = 'true';
    document.getElementById('new-teacher-name').value = name;
    document.getElementById('new-teacher-name').readOnly = true;
    document.getElementById('new-teacher-subject').value = subject;
    document.getElementById('new-teacher-type').value = type;
    document.getElementById('new-teacher-max').value = max;
    
    document.getElementById('teacher-form-title').textContent = 'Edit Teacher Details';
    document.getElementById('teacher-submit-btn').textContent = 'Update Teacher';
    
    document.getElementById('teacher-modal').style.display = 'flex';
}

function cancelTeacherEdit() {
    document.getElementById('teacher-edit-mode').value = 'false';
    document.getElementById('new-teacher-name').value = '';
    document.getElementById('new-teacher-name').readOnly = false;
    document.getElementById('add-teacher-form').reset();
    
    document.getElementById('teacher-form-title').textContent = 'Add New Teacher';
    document.getElementById('teacher-submit-btn').textContent = 'Register Teacher';
}

window.triggerExport = function(format) {
    const card = document.getElementById('substitutions-card');
    if (!card) return;
    
    // Hide the dropdown menu when exporting starts
    const exportMenu = document.getElementById('export-dropdown-menu');
    if (exportMenu) exportMenu.style.display = 'none';

    if (format === 'excel') {
        exportSubstitutionsToCSV();
        return;
    }

    // Set loading indicator on export button
    const exportBtnText = document.querySelector('#export-subs-btn span');
    const oldText = exportBtnText.textContent;
    exportBtnText.textContent = 'Exporting...';

    // Clone the card to capture full scrollable width
    const clone = card.cloneNode(true);
    clone.id = 'substitutions-card-clone';
    clone.style.position = 'absolute';
    clone.style.left = '-9999px';
    clone.style.top = '0';
    clone.style.width = 'auto';
    clone.style.maxWidth = 'none';
    clone.style.boxShadow = 'none';

    // Expand the table wrapper so it doesn't scroll/clip
    const wrapper = clone.querySelector('.table-wrapper');
    if (wrapper) {
        wrapper.style.overflow = 'visible';
        wrapper.style.overflowX = 'visible';
        wrapper.style.maxWidth = 'none';
        wrapper.style.width = 'auto';
        wrapper.style.maxHeight = 'none';
    }

    // Hide the export button container in the clone
    const cloneBtnContainer = clone.querySelector('#export-subs-btn').parentNode;
    if (cloneBtnContainer) cloneBtnContainer.style.display = 'none';

    // Transfer select values to clean plain-text spans in the clone
    const originalSelects = card.querySelectorAll('select');
    const cloneSelects = clone.querySelectorAll('select');
    for (let i = 0; i < originalSelects.length; i++) {
        if (cloneSelects[i]) {
            const selectVal = originalSelects[i].value;
            const textNode = document.createElement('span');
            textNode.textContent = selectVal === 'MANUAL INTERVENTION REQUIRED' ? 'Override...' : selectVal;
            textNode.style.fontWeight = 'bold';
            textNode.style.display = 'inline-block';
            textNode.style.padding = '6px 12px';
            textNode.style.border = '1px solid var(--border-color)';
            textNode.style.borderRadius = '6px';
            textNode.style.backgroundColor = 'var(--bg-tertiary)';
            cloneSelects[i].parentNode.replaceChild(textNode, cloneSelects[i]);
        }
    }

    document.body.appendChild(clone);

    // Capture the expanded clone card
    html2canvas(clone, {
        scale: 2, // High resolution
        useCORS: true,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue('--bg-secondary').trim() || '#1f1f2e'
    }).then(canvas => {
        document.body.removeChild(clone);
        exportBtnText.textContent = oldText;

        if (format === 'jpeg') {
            const link = document.createElement('a');
            link.download = `substitution_assignments_${new Date().toISOString().split('T')[0]}.jpg`;
            link.href = canvas.toDataURL('image/jpeg', 0.9);
            link.click();
        } else if (format === 'pdf') {
            const { jsPDF } = window.jspdf;
            const imgData = canvas.toDataURL('image/png');
            
            // Calculate landscape dimensions
            const pdf = new jsPDF('l', 'mm', 'a4');
            const imgWidth = 277; // A4 horizontal fit
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            
            pdf.addImage(imgData, 'PNG', 10, 10, imgWidth, imgHeight);
            pdf.save(`substitution_assignments_${new Date().toISOString().split('T')[0]}.pdf`);
        }
    }).catch(err => {
        console.error("Export error:", err);
        const existingClone = document.getElementById('substitutions-card-clone');
        if (existingClone) document.body.removeChild(existingClone);
        exportBtnText.textContent = oldText;
        alert("Export failed: " + err.message);
    });
};

// ─── EXCEPT TAB ───────────────────────────────────────────

function renderExceptTab() {
    const isTeacherRole = localStorage.getItem('user_role') === 'Teacher';
    const tbody = document.getElementById('except-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Toggle visibility of "+ Add to Except" button
    const addBtn = document.getElementById('open-except-modal-btn');
    if (addBtn) addBtn.style.display = isTeacherRole ? 'none' : 'block';

    // Toggle visibility of Action column header
    const headers = document.querySelectorAll('#tab-except th');
    if (headers.length >= 5) {
        headers[4].style.display = isTeacherRole ? 'none' : '';
    }

    if (!state.exceptions || state.exceptions.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isTeacherRole ? 4 : 5}" style="text-align:center; padding:24px; color:var(--text-secondary);">No teachers in the except list.</td></tr>`;
        return;
    }
    state.exceptions.forEach((ex, idx) => {
        const tr = document.createElement('tr');
        const actionCellHTML = isTeacherRole ? '' : `
            <td>
                <button class="btn btn-danger" style="padding:6px 14px; font-size:12px;" onclick="removeFromExcept('${ex.Teacher_Name}')">Remove</button>
            </td>`;
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td style="font-weight:600;">${ex.Teacher_Name}</td>
            <td>${ex.Timing || 'All Periods'}</td>
            <td>${ex.Reason || '—'}</td>
            ${actionCellHTML}`;
        tbody.appendChild(tr);
    });

    // Populate except modal dropdown with teachers NOT already excepted
    const exceptedSet = new Set(state.exceptions.map(e => e.Teacher_Name));
    const sel = document.getElementById('except-teacher-select');
    sel.innerHTML = '';
    state.teachers.forEach(t => {
        if (!exceptedSet.has(t.Teacher_Name)) {
            const opt = document.createElement('option');
            opt.value = t.Teacher_Name;
            opt.textContent = t.Teacher_Name;
            sel.appendChild(opt);
        }
    });
}

async function removeFromExcept(teacherName) {
    if (!confirm(`Remove ${teacherName} from Except list?`)) return;
    await fetch(`${API_BASE}/exceptions?Teacher_Name=${encodeURIComponent(teacherName)}`, { method: 'DELETE' });
    await fetchState();
    renderExceptTab();
}

// Wire up Except modal in initUI — called after DOM ready
document.addEventListener('DOMContentLoaded', () => {
    // Except modal open/close
    const exceptModal = document.getElementById('except-modal');
    document.getElementById('open-except-modal-btn')?.addEventListener('click', () => {
        renderExceptTab(); // refresh dropdown
        exceptModal.style.display = 'flex';
    });
    document.getElementById('close-except-modal-btn')?.addEventListener('click', () => {
        exceptModal.style.display = 'none';
    });
    document.getElementById('except-cancel-btn')?.addEventListener('click', () => {
        exceptModal.style.display = 'none';
    });

    // Except form submit
    document.getElementById('except-form')?.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teacherName = document.getElementById('except-teacher-select').value;
        const timing = document.getElementById('except-timing').value.trim() || 'All';
        const reason = document.getElementById('except-reason').value.trim();
        await fetch(`${API_BASE}/exceptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Teacher_Name: teacherName, Timing: timing, Reason: reason })
        });
        exceptModal.style.display = 'none';
        document.getElementById('except-timing').value = '';
        document.getElementById('except-reason').value = '';
        await fetchState();
        renderExceptTab();
    });
});

// --- DROPDOWNS & AUTO SYNCHRONIZATION ---
function updateAllDropdowns() {
    populateTeacherDropdowns();
    populateTimetableFilters();
    renderExceptTab();
}

function populateTimetableFilters() {
    const classFilter = document.getElementById('filter-class');
    const teacherFilter = document.getElementById('filter-teacher');
    if (!classFilter || !teacherFilter) return;
    
    const currentClass = classFilter.value || 'All';
    const currentTeacher = teacherFilter.value || 'All';
    
    classFilter.innerHTML = '<option value="All">All Classes</option>';
    if (state.classes) {
        state.classes.forEach(c => {
            classFilter.innerHTML += `<option value="${c}">${c}</option>`;
        });
    }
    
    teacherFilter.innerHTML = '<option value="All">All Teachers</option>';
    if (state.teachers) {
        state.teachers.forEach(t => {
            teacherFilter.innerHTML += `<option value="${t.Teacher_Name}">${t.Teacher_Name}</option>`;
        });
    }
    
    if ([...classFilter.options].some(o => o.value === currentClass)) {
        classFilter.value = currentClass;
    }
    if ([...teacherFilter.options].some(o => o.value === currentTeacher)) {
        teacherFilter.value = currentTeacher;
    }
}

// --- LOGIN & SESSION SECURITY ---
function verifySession() {
    const role = localStorage.getItem('user_role');
    const username = localStorage.getItem('user_username');
    const overlay = document.getElementById('login-overlay');
    
    if (role && username) {
        if (overlay) overlay.style.display = 'none';
        applyRoleAccess();
    } else {
        if (overlay) overlay.style.display = 'flex';
    }
}

function showLoginOverlay() {
    const overlay = document.getElementById('login-overlay');
    if (overlay) overlay.style.display = 'flex';
    localStorage.removeItem('user_role');
    localStorage.removeItem('user_username');
}

function applyRoleAccess() {
    const role = localStorage.getItem('user_role') || 'Teacher';
    const username = localStorage.getItem('user_username') || '';
    
    // Hide or show sidebar items based on role
    const adminNavs = document.querySelectorAll('.nav-item[data-tab="tab-timetable"], .nav-item[data-tab="tab-teachers"], .nav-item[data-tab="tab-classes"], .nav-item[data-tab="tab-subjects"], .nav-item[data-tab="tab-timings"]');
    
    // Keep Log Absence card visible for both Admins and Teachers so they can post leaves
    const absenceLoggingCard = document.getElementById('absence-logging-card');
    if (absenceLoggingCard) absenceLoggingCard.style.display = 'flex';
    
    if (role === 'Admin') {
        adminNavs.forEach(nav => nav.style.display = 'flex');
    } else {
        adminNavs.forEach(nav => nav.style.display = 'none');
        
        // If current tab is an admin-only tab, switch to tab-dashboard
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav) {
            const tabId = activeNav.dataset.tab;
            if (['tab-timetable', 'tab-teachers', 'tab-classes', 'tab-subjects', 'tab-timings'].includes(tabId)) {
                // Switch to dashboard
                document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
                document.querySelectorAll('.tab-view').forEach(v => v.classList.remove('active'));
                document.querySelector('.nav-item[data-tab="tab-dashboard"]').classList.add('active');
                document.getElementById('tab-dashboard').classList.add('active');
                renderDashboard();
            }
        }
    }
    
    // Refresh except tab to update button and action columns visibility
    renderExceptTab();
    
    // Show logged-in info in sidebar footer
    const footer = document.querySelector('.sidebar-footer');
    if (footer) {
        // Clear any old user info
        const oldInfo = document.getElementById('user-info-box');
        if (oldInfo) footer.removeChild(oldInfo);
        
        const infoBox = document.createElement('div');
        infoBox.id = 'user-info-box';
        infoBox.style.marginTop = '12px';
        infoBox.style.padding = '10px';
        infoBox.style.borderRadius = '8px';
        infoBox.style.background = 'var(--bg-tertiary)';
        infoBox.style.fontSize = '13px';
        infoBox.style.border = '1px solid var(--border-color)';
        infoBox.innerHTML = `
            <div style="font-weight:600; color:var(--text-primary); margin-bottom: 2px;">${username}</div>
            <div style="font-size:11px; color:var(--text-secondary); margin-bottom: 8px;">Role: ${role}</div>
            <button class="btn btn-danger" id="logout-btn" style="width:100%; padding:6px; font-size:12px; height:auto; display:block;">Log Out</button>
        `;
        footer.appendChild(infoBox);
        
        document.getElementById('logout-btn').addEventListener('click', () => {
            localStorage.removeItem('user_role');
            localStorage.removeItem('user_username');
            showLoginOverlay();
        });
    }
}

function initLoginHandlers() {
    const loginForm = document.getElementById('login-form');
    if (!loginForm) return;
    
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value.trim().toLowerCase();
        const passwordInput = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        if (errorDiv) errorDiv.style.display = 'none';
        
        if (usernameInput === 'admin' && passwordInput === 'admin123') {
            localStorage.setItem('user_role', 'Admin');
            localStorage.setItem('user_username', 'Admin');
            verifySession();
        } else if (usernameInput === 'teacher' && passwordInput === 'teacher123') {
            localStorage.setItem('user_role', 'Teacher');
            localStorage.setItem('user_username', 'Teacher');
            verifySession();
        } else {
            if (errorDiv) {
                errorDiv.textContent = 'Invalid credentials (admin / admin123 or teacher / teacher123).';
                errorDiv.style.display = 'block';
            }
        }
    });
}
