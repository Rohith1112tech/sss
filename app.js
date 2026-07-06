/**
 * School Substitution System - Web Logic (PostgreSQL Integration)
 */

const PROD_API_URL = 'https://submanager-backend-pspb.onrender.com/api';

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
    exceptions: [],
    odList: [],
    corridorDuties: []
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
            if (tabId === 'tab-od') renderODTab();
            if (tabId === 'tab-corridorduty') renderCorridorDutyTab();
            if (tabId === 'tab-settings') loadSettingsTab();
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
    const odDatePicker = document.getElementById('od-date-picker');
    const corridorDatePicker = document.getElementById('corridor-date-picker');
    
    if (visibleDatePicker) visibleDatePicker.value = todayStr;
    if (subAssignedDatePicker) subAssignedDatePicker.value = todayStr;
    if (odDatePicker) odDatePicker.value = todayStr;
    if (corridorDatePicker) corridorDatePicker.value = todayStr;
    
    if (visibleDatePicker) {
        visibleDatePicker.addEventListener('change', () => {
            datePicker.value = visibleDatePicker.value;
            if (subAssignedDatePicker) subAssignedDatePicker.value = visibleDatePicker.value;
            if (odDatePicker) odDatePicker.value = visibleDatePicker.value;
            if (corridorDatePicker) corridorDatePicker.value = visibleDatePicker.value;
            renderDashboard();
        });
    }
    
    if (subAssignedDatePicker) {
        subAssignedDatePicker.addEventListener('change', () => {
            datePicker.value = subAssignedDatePicker.value;
            if (visibleDatePicker) visibleDatePicker.value = subAssignedDatePicker.value;
            if (odDatePicker) odDatePicker.value = subAssignedDatePicker.value;
            if (corridorDatePicker) corridorDatePicker.value = subAssignedDatePicker.value;
            renderDashboard();
        });
    }
    
    if (odDatePicker) {
        odDatePicker.addEventListener('change', () => {
            datePicker.value = odDatePicker.value;
            if (visibleDatePicker) visibleDatePicker.value = odDatePicker.value;
            if (subAssignedDatePicker) subAssignedDatePicker.value = odDatePicker.value;
            if (corridorDatePicker) corridorDatePicker.value = odDatePicker.value;
            renderODTab();
            renderCorridorDutyTab();
        });
    }
    
    if (corridorDatePicker) {
        corridorDatePicker.addEventListener('change', () => {
            datePicker.value = corridorDatePicker.value;
            if (visibleDatePicker) visibleDatePicker.value = corridorDatePicker.value;
            if (subAssignedDatePicker) subAssignedDatePicker.value = corridorDatePicker.value;
            if (odDatePicker) odDatePicker.value = corridorDatePicker.value;
            renderODTab();
            renderCorridorDutyTab();
        });
    }
    
    // 4. Populate Dropdowns
    populateTeacherDropdowns();
    
    // 5. Form Submissions
    
    // Settings Forms submissions
    const adminSettingsForm = document.getElementById('settings-admin-form');
    if (adminSettingsForm) {
        adminSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameVal = document.getElementById('settings-admin-username').value.trim();
            const passwordVal = document.getElementById('settings-admin-password').value;
            
            try {
                const response = await fetch(`${API_BASE}/settings/update-credentials`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Role: 'Admin',
                        NewUsername: usernameVal,
                        NewPassword: passwordVal
                    })
                });
                if (response.ok) {
                    alert('Admin credentials updated successfully! You will be logged out to verify.');
                    const logoutBtn = document.getElementById('logout-btn');
                    if (logoutBtn) logoutBtn.click();
                    else showLoginOverlay();
                } else {
                    const data = await response.json();
                    alert('Failed to update credentials: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                alert('Connection error: ' + err.message);
            }
        });
    }

    const teacherSettingsForm = document.getElementById('settings-teacher-form');
    if (teacherSettingsForm) {
        teacherSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const usernameVal = document.getElementById('settings-teacher-username').value.trim();
            const passwordVal = document.getElementById('settings-teacher-password').value;
            
            try {
                const response = await fetch(`${API_BASE}/settings/update-credentials`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        Role: 'Teacher',
                        NewUsername: usernameVal,
                        NewPassword: passwordVal
                    })
                });
                if (response.ok) {
                    alert('Teacher credentials updated successfully!');
                    loadSettingsTab();
                } else {
                    const data = await response.json();
                    alert('Failed to update credentials: ' + (data.error || 'Unknown error'));
                }
            } catch (err) {
                alert('Connection error: ' + err.message);
            }
        });
    }

    const addODForm = document.getElementById('add-od-form');
    if (addODForm) {
        addODForm.addEventListener('submit', handleAddOD);
    }

    // Absence Form
    const absenceForm = document.getElementById('absence-form');
    absenceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const teacherName = document.getElementById('absent-teacher-name').value;
        const startDate = document.getElementById('absence-start-date').value;
        const endDate = document.getElementById('absence-end-date').value || startDate;
        const type = document.getElementById('absence-type').value;
        
        let periods = 'All';
        if (type === '40-Min Permission') {
            const selected = [];
            document.querySelectorAll('.absence-period-checkbox:checked').forEach(cb => {
                selected.push(cb.value);
            });
            periods = selected.length > 0 ? selected.join(', ') : 'Period 1';
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
        populateClassDropdowns();
        // By default, type select is set to Class Teacher. Trigger the display of class teacher class selection.
        const typeSelect = document.getElementById('new-teacher-type');
        if (typeSelect) {
            typeSelect.value = 'Class Teacher';
            document.getElementById('class-teacher-class-group').style.display = 'block';
            document.getElementById('new-teacher-class').required = true;
        }
        document.getElementById('teacher-modal').style.display = 'flex';
    });

    document.getElementById('close-teacher-modal-btn').addEventListener('click', () => {
        document.getElementById('teacher-modal').style.display = 'none';
    });

    document.getElementById('teacher-cancel-btn').addEventListener('click', () => {
        cancelTeacherEdit();
        document.getElementById('teacher-modal').style.display = 'none';
    });

    // Handle Teacher Type changes
    const teacherTypeSelect = document.getElementById('new-teacher-type');
    if (teacherTypeSelect) {
        teacherTypeSelect.addEventListener('change', () => {
            const val = teacherTypeSelect.value;
            const classGroup = document.getElementById('class-teacher-class-group');
            if (val === 'Class Teacher') {
                classGroup.style.display = 'block';
                document.getElementById('new-teacher-class').required = true;
            } else {
                classGroup.style.display = 'none';
                document.getElementById('new-teacher-class').required = false;
                document.getElementById('new-teacher-class').value = '';
            }
        });
    }

    // Handle Subject selections to dynamically render classes mapping
    const subjectsGroup = document.getElementById('subjects-checkbox-group');
    if (subjectsGroup) {
        subjectsGroup.addEventListener('change', (e) => {
            if (e.target.classList.contains('subject-checkbox')) {
                renderSubjectClassesMappingUI();
            }
        });
    }

    // Teacher Registry Form
    const teacherForm = document.getElementById('add-teacher-form');
    teacherForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('new-teacher-name').value.trim();
        const selectedSubjects = [];
        document.querySelectorAll('.subject-checkbox:checked').forEach(input => {
            selectedSubjects.push(input.value);
        });
        const subject = selectedSubjects.join(', ') || 'General';
        const max = document.getElementById('new-teacher-max').value;
        const type = document.getElementById('new-teacher-type').value;
        const isEdit = document.getElementById('teacher-edit-mode').value === 'true';
        
        if (!isEdit && state.teachers.some(t => t.Teacher_Name === name)) {
            alert('A teacher with this name already exists.');
            return;
        }

        // Build subject-class mapping
        const subjectClassesMapping = {};
        document.querySelectorAll('.subject-class-mapping-item').forEach(item => {
            const subjectKey = item.dataset.subject;
            const checkedClasses = Array.from(item.querySelectorAll('.class-check:checked')).map(el => el.value);
            if (checkedClasses.length > 0) {
                subjectClassesMapping[subjectKey] = checkedClasses;
            }
        });
        const subjectClassesJSON = JSON.stringify(subjectClassesMapping);

        // Get class teacher's class
        const teacherClass = type === 'Class Teacher' ? document.getElementById('new-teacher-class').value : null;
        
        await fetch(`${API_BASE}/teachers`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                Teacher_Name: name,
                Main_Subject: subject,
                Max_Periods_Per_Day: max,
                Teacher_Type: type,
                Class_Name: teacherClass,
                Subject_Classes: subjectClassesJSON,
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
    populateClassDropdowns();
    renderClassesTab();
    renderSubjectsTab();
    renderTimingsEditor();
    
    updateAllDropdowns();
}

function togglePeriodSelection() {
    const type = document.getElementById('absence-type').value;
    const grid = document.getElementById('periods-selection-wrapper');
    if (type === '40-Min Permission') {
        grid.style.display = 'block';
    } else {
        grid.style.display = 'none';
    }
}

function populateAbsencePeriodsCheckboxes() {
    const grid = document.getElementById('periods-checkbox-grid');
    if (!grid) return;
    
    const checkedValues = new Set(
        Array.from(document.querySelectorAll('.absence-period-checkbox:checked')).map(cb => cb.value)
    );
    
    grid.innerHTML = '';
    
    state.timings.forEach(slot => {
        const val = slot.period_name;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'period-checkbox-wrapper';
        wrapper.style.display = 'flex';
        wrapper.style.alignItems = 'center';
        wrapper.style.gap = '6px';
        wrapper.style.fontSize = '13px';
        wrapper.style.color = 'var(--text-primary)';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.id = `p-check-${val.replace(/\s+/g, '-')}`;
        input.value = val;
        input.className = 'absence-period-checkbox';
        input.style.cursor = 'pointer';
        
        if (checkedValues.has(val)) {
            input.checked = true;
        }
        
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.className = 'period-checkbox-label';
        label.textContent = `${slot.period_name} (${slot.start_time}-${slot.end_time})`;
        label.style.cursor = 'pointer';
        
        wrapper.appendChild(input);
        wrapper.appendChild(label);
        grid.appendChild(wrapper);
    });
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
    if (tbody) {
        tbody.innerHTML = '';
    }
    
    const sortedTimings = [...state.timings].sort((a, b) => parseTimeToMinutes(a.start_time) - parseTimeToMinutes(b.start_time));
    
    // Update substitutions table headers with custom slot names dynamically!
    const theadRow = document.getElementById('substitutions-thead-row');
    if (theadRow) {
        theadRow.innerHTML = `
            <th style="white-space:nowrap; padding:12px 14px; background:var(--bg-tertiary); color:var(--text-secondary); font-weight:600; border:1px solid var(--border-color);">Absent Teacher</th>
            <th style="white-space:nowrap; padding:12px 14px; background:var(--bg-tertiary); color:var(--text-secondary); font-weight:600; border:1px solid var(--border-color);">Date</th>
            <th style="white-space:nowrap; padding:12px 14px; background:var(--bg-tertiary); color:var(--text-secondary); font-weight:600; border:1px solid var(--border-color);">Day</th>
        `;
        sortedTimings.forEach(t => {
            const th = document.createElement('th');
            th.style = "white-space:nowrap; padding:12px 14px; background:var(--bg-tertiary); color:var(--text-secondary); font-weight:600; border:1px solid var(--border-color);";
            th.innerText = t.period_name;
            theadRow.appendChild(th);
        });
    }
    
    if (absToday.length === 0) {
        const colSpanVal = 3 + sortedTimings.length;
        tbody.innerHTML = `<tr><td colspan="${colSpanVal}" style="text-align:center;color:var(--text-secondary);padding:24px;">No substitutions required today.</td></tr>`;
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
        
        // Render each custom timing slot dynamically in chronological order
        sortedTimings.forEach(slot => {
            const slotName = slot.period_name;
            const sp = getSupervisionIndexFromName(slotName);
            
            if (sp !== -1) {
                // It is a supervision slot
                if (isCT || sp !== 0) { // All teachers can do breaks/games, only CT does Class Incharge
                    const classLabel = (sp === 0) ? (teacherRec.Class_Name || 'Morning Duty') 
                                     : (sp === 12 ? 'Van duty' 
                                     : slotName);
                    
                    const isAbsentForSlot = abs.Absence_Type === 'Full Day' || 
                                            (abs.Absence_Type === 'Half Day FN' && (sp === 0 || sp === 9 || sp === 10)) ||
                                            (abs.Absence_Type === 'Half Day AN' && (sp === 11 || sp === 12)) ||
                                            (abs.Specific_Periods_Absent || '').split(',').map(s => s.trim().toLowerCase()).includes(slotName.toLowerCase());
                    
                    if (isAbsentForSlot) {
                        const log = subsToday.find(s => s.Absent_Teacher === name && parseInt(s.Period, 10) === sp);
                        if (log) {
                            const selector = isTeacherRole 
                                ? `<div style="font-weight:600; color:var(--primary-color);">${log.Substitute_Teacher === 'MANUAL INTERVENTION REQUIRED' ? 'Unassigned' : log.Substitute_Teacher}</div>`
                                : buildGridOverrideSelector(dateStr, dayName, classLabel, sp, name, log.Substitute_Teacher, subsToday);
                            html += `<td>
                                <div style="font-size:10px; font-weight:600; color:var(--text-secondary); margin-bottom:4px;">${classLabel}</div>
                                ${selector}
                            </td>`;
                        } else {
                            html += `<td style="color:var(--text-secondary); font-size:12px;">- (Not Absent)</td>`;
                        }
                    } else {
                        html += `<td style="color:var(--text-secondary); font-size:12px;">- (Not Absent)</td>`;
                    }
                } else {
                    html += `<td style="color:var(--text-secondary); font-size:12px;">(Not CT)</td>`;
                }
            } else {
                // It is a teaching period (P1 to P8)
                const p = getPeriodNumberFromName(slotName);
                if (p !== -1) {
                    const cls = findClassForTeacherPeriod(name, dayName, p);
                    if (cls) {
                        const isAbsentForPeriod = abs.Absence_Type === 'Full Day' ||
                                                  (abs.Absence_Type === 'Half Day FN' && p <= 4) ||
                                                  (abs.Absence_Type === 'Half Day AN' && p >= 5) ||
                                                  (abs.Specific_Periods_Absent || '').split(',').map(s => s.trim().toLowerCase()).includes(slotName.toLowerCase());
                        
                        if (isAbsentForPeriod) {
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
                    } else {
                        html += `<td style="color:var(--text-secondary); font-size:12px;">- (Not Absent)</td>`;
                    }
                } else {
                    html += `<td style="color:var(--text-secondary); font-size:12px;">-</td>`;
                }
            }
        });
        
        tr.innerHTML = html;
        tbody.appendChild(tr);
    });
}

function findClassForTeacherPeriod(teacherName, dayName, p) {
    const key = `Period_${p}`;
    const row = state.timetable.find(r => r.Day === dayName && r[key] === teacherName);
    return row ? row.Class : null;
}

function isTeacherBusyWithSupervision(name, day, period) {
    const periodToColMap = {
        0: 'Class_Incharge',
        9: 'Morning_Break',
        10: 'Lunch_Break',
        11: 'Evening_Break',
        12: 'Diary_Games'
    };
    const colName = periodToColMap[parseInt(period, 10)];
    if (!colName) return false;
    return state.timetable.some(row => row.Day === day && row[colName] === name);
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
            if (isTeacherBusyWithSupervision(t.Teacher_Name, dayName, period)) return;
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
    const columns = [
        { name: 'Class', key: 'Class', isEditable: false },
        { name: 'Class Incharge', key: 'Class_Incharge', isEditable: true, dbKey: 'class_incharge', searchName: 'Class Incharge' },
        { name: 'Day', key: 'Day', isEditable: false },
        { name: 'Period 1', key: 'Period_1', isEditable: true, dbKey: 'period_1', searchName: 'Period 1' },
        { name: 'Period 2', key: 'Period_2', isEditable: true, dbKey: 'period_2', searchName: 'Period 2' },
        { name: 'Morning Break', key: 'Morning_Break', isEditable: true, dbKey: 'morning_break', searchName: 'Morning Break' },
        { name: 'Period 3', key: 'Period_3', isEditable: true, dbKey: 'period_3', searchName: 'Period 3' },
        { name: 'Period 4', key: 'Period_4', isEditable: true, dbKey: 'period_4', searchName: 'Period 4' },
        { name: 'Lunch Break', key: 'Lunch_Break', isEditable: true, dbKey: 'lunch_break', searchName: 'Lunch Break' },
        { name: 'Period 5', key: 'Period_5', isEditable: true, dbKey: 'period_5', searchName: 'Period 5' },
        { name: 'Period 6', key: 'Period_6', isEditable: true, dbKey: 'period_6', searchName: 'Period 6' },
        { name: 'Evening Break', key: 'Evening_Break', isEditable: true, dbKey: 'evening_break', searchName: 'Evening Break' },
        { name: 'Period 7', key: 'Period_7', isEditable: true, dbKey: 'period_7', searchName: 'Period 7' },
        { name: 'Period 8', key: 'Period_8', isEditable: true, dbKey: 'period_8', searchName: 'Period 8' },
        { name: 'Diary / Games', key: 'Diary_Games', isEditable: true, dbKey: 'diary_games', searchName: 'Diary / Games' }
    ];

    // Populate the headers dynamically to include times from state.timings
    const theadRow = document.getElementById('timetable-header-row');
    if (theadRow) {
        theadRow.innerHTML = '';
        columns.forEach(col => {
            const th = document.createElement('th');
            if (col.isEditable) {
                // Find matching timing slot
                const t = state.timings.find(item => {
                    const name = item.period_name.trim().toLowerCase();
                    const sName = col.searchName.trim().toLowerCase();
                    return name === sName || name.replace(/\s+/g, '') === sName.replace(/\s+/g, '');
                });
                const displayName = t ? t.period_name : col.name;
                const suffix = t ? ` (${t.start_time}-${t.end_time})` : '';
                th.innerText = `${displayName}${suffix}`;
            } else {
                th.innerText = col.name;
            }
            theadRow.appendChild(th);
        });
    }

    const classFilterVal = document.getElementById('filter-class')?.value || 'All';
    const teacherFilterVal = document.getElementById('filter-teacher')?.value || 'All';
    const tbody = document.getElementById('timetable-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const filteredRows = state.timetable.filter(row => {
        const matchesClass = (classFilterVal === 'All' || row.Class === classFilterVal);
        const matchesTeacher = (teacherFilterVal === 'All' || 
            columns.some(col => col.isEditable && row[col.key] === teacherFilterVal)
        );
        return matchesClass && matchesTeacher;
    });
    
    let teacherOptionsHTML = '<option value="Free">Free</option>';
    state.teachers.forEach(t => {
        teacherOptionsHTML += `<option value="${t.Teacher_Name}">${t.Teacher_Name}</option>`;
    });
    
    filteredRows.forEach((row) => {
        const tr = document.createElement('tr');
        
        let rowHTML = '';
        columns.forEach(col => {
            if (col.isEditable) {
                const val = row[col.key] || 'Free';
                rowHTML += `
                    <td>
                        <select class="timetable-cell-select" onchange="updateTimetableCell('${row.Class}', '${row.Day}', '${col.dbKey}', this.value)">
                            <option value="${val}" selected>${val}</option>
                            ${teacherOptionsHTML}
                        </select>
                    </td>
                `;
            } else {
                if (col.key === 'Class') {
                    rowHTML += `<td><strong>${row[col.key]}</strong></td>`;
                } else {
                    rowHTML += `<td>${row[col.key]}</td>`;
                }
            }
        });
        
        tr.innerHTML = rowHTML;
        tbody.appendChild(tr);
    });
}

async function updateTimetableCell(cls, day, colKey, value) {
    await fetch(`${API_BASE}/timetable/cell`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Class: cls,
            Day: day,
            Period: colKey,
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
        const safeClassName = (t.Class_Name || '').replace(/'/g, "\\'");
        const safeSubClasses = (t.Subject_Classes || '{}').replace(/'/g, "\\'");
        
        const subClassesSummary = renderSubjectClassesSummary(t);
        const subjectDisplay = subClassesSummary 
            ? `${t.Main_Subject}<br><small style="color:var(--text-secondary); font-size:11px;">${subClassesSummary}</small>` 
            : t.Main_Subject;
        
        const typeDisplay = (t.Teacher_Type === 'Class Teacher' && t.Class_Name) 
            ? `Class Teacher (${t.Class_Name})` 
            : (t.Teacher_Type || 'Class Teacher');
        
        tr.innerHTML = `
            <td><strong>${t.Teacher_Name}</strong></td>
            <td>${subjectDisplay}</td>
            <td>${typeDisplay}</td>
            <td>${t.Max_Periods_Per_Day}</td>
            <td>
                <button class="btn btn-primary" style="padding:6px 12px; font-size:12px; margin-right:6px;" onclick="editTeacher('${safeName}', '${safeSubject}', '${safeType}', ${t.Max_Periods_Per_Day}, '${safeClassName}', '${safeSubClasses}')">Edit</button>
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
    const group = document.getElementById('subjects-checkbox-group');
    if (!group) return;
    
    const checkedValues = new Set(
        Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(el => el.value)
    );
    
    group.innerHTML = '';
    
    state.subjects.forEach(sub => {
        const div = document.createElement('div');
        div.className = 'checkbox-item';
        div.style.display = 'flex';
        div.style.alignItems = 'center';
        div.style.gap = '6px';
        div.style.fontSize = '13px';
        div.style.color = 'var(--text-primary)';
        
        const input = document.createElement('input');
        input.type = 'checkbox';
        input.value = sub;
        input.id = `sub-check-${sub.replace(/\s+/g, '-')}`;
        input.className = 'subject-checkbox';
        input.style.cursor = 'pointer';
        
        if (checkedValues.has(sub)) {
            input.checked = true;
        }
        
        const label = document.createElement('label');
        label.htmlFor = input.id;
        label.textContent = sub;
        label.style.cursor = 'pointer';
        
        div.appendChild(input);
        div.appendChild(label);
        group.appendChild(div);
    });
}

function populateClassDropdowns() {
    const clsSelect = document.getElementById('new-teacher-class');
    if (!clsSelect) return;
    
    const currentVal = clsSelect.value;
    clsSelect.innerHTML = '<option value="">-- Select Class --</option>';
    if (state.classes) {
        state.classes.forEach(c => {
            const opt = document.createElement('option');
            opt.value = c;
            opt.textContent = c;
            clsSelect.appendChild(opt);
        });
    }
    if ([...clsSelect.options].some(o => o.value === currentVal)) {
        clsSelect.value = currentVal;
    }
}

function renderSubjectClassesMappingUI(existingMapping = {}) {
    const checkedSubjects = Array.from(document.querySelectorAll('.subject-checkbox:checked')).map(el => el.value);
    const group = document.getElementById('subject-classes-mapping-group');
    const container = document.getElementById('subject-classes-mapping-container');
    if (!group || !container) return;
    
    if (checkedSubjects.length === 0) {
        group.style.display = 'none';
        container.innerHTML = '';
        return;
    }
    
    group.style.display = 'block';
    
    // Save current user selection from DOM first
    const currentSelection = {};
    document.querySelectorAll('.subject-class-mapping-item').forEach(item => {
        const subject = item.dataset.subject;
        const checked = Array.from(item.querySelectorAll('.class-check:checked')).map(el => el.value);
        currentSelection[subject] = checked;
    });
    
    // Merge existing mapping (if any, like from editTeacher call)
    const mergedMapping = { ...currentSelection, ...existingMapping };
    
    container.innerHTML = '';
    
    checkedSubjects.forEach(subject => {
        const itemDiv = document.createElement('div');
        itemDiv.className = 'subject-class-mapping-item';
        itemDiv.dataset.subject = subject;
        itemDiv.style.border = '1px solid var(--border-color)';
        itemDiv.style.borderRadius = '6px';
        itemDiv.style.padding = '8px 12px';
        itemDiv.style.background = 'var(--bg-secondary)';
        itemDiv.style.marginBottom = '8px';
        
        const title = document.createElement('div');
        title.style.fontWeight = '600';
        title.style.fontSize = '13px';
        title.style.marginBottom = '6px';
        title.style.color = 'var(--primary-color)';
        title.textContent = `Classes for ${subject}:`;
        itemDiv.appendChild(title);
        
        const classesList = document.createElement('div');
        classesList.className = 'classes-checkbox-list';
        classesList.style.display = 'flex';
        classesList.style.flexWrap = 'wrap';
        classesList.style.gap = '8px';
        
        if (state.classes && state.classes.length > 0) {
            state.classes.forEach(cls => {
                const classDiv = document.createElement('div');
                classDiv.style.display = 'flex';
                classDiv.style.alignItems = 'center';
                classDiv.style.gap = '4px';
                classDiv.style.fontSize = '12px';
                
                const cb = document.createElement('input');
                cb.type = 'checkbox';
                cb.value = cls;
                cb.className = 'class-check';
                cb.style.cursor = 'pointer';
                
                const safeSub = subject.replace(/\s+/g, '-');
                const safeCls = cls.replace(/\s+/g, '-');
                cb.id = `class-cb-${safeSub}-${safeCls}`;
                
                if (mergedMapping[subject] && mergedMapping[subject].includes(cls)) {
                    cb.checked = true;
                }
                
                const lbl = document.createElement('label');
                lbl.textContent = cls;
                lbl.style.cursor = 'pointer';
                lbl.htmlFor = cb.id;
                
                classDiv.appendChild(cb);
                classDiv.appendChild(lbl);
                classesList.appendChild(classDiv);
            });
        } else {
            const noCls = document.createElement('div');
            noCls.style.fontSize = '11px';
            noCls.style.color = 'var(--text-secondary)';
            noCls.textContent = 'No classes registered. Register classes first.';
            classesList.appendChild(noCls);
        }
        
        itemDiv.appendChild(classesList);
        container.appendChild(itemDiv);
    });
}

function renderSubjectClassesSummary(t) {
    if (!t.Subject_Classes) return '';
    try {
        const mapping = typeof t.Subject_Classes === 'string' ? JSON.parse(t.Subject_Classes) : t.Subject_Classes;
        const parts = [];
        for (const [subject, classes] of Object.entries(mapping)) {
            if (classes && classes.length > 0) {
                parts.push(`${subject}: [${classes.join(', ')}]`);
            }
        }
        return parts.join(' | ');
    } catch (e) {
        console.error("Error parsing subject classes mapping:", e);
        return '';
    }
}

function editTeacher(name, subject, type, max, className = '', subjectClasses = '') {
    document.getElementById('teacher-edit-mode').value = 'true';
    document.getElementById('new-teacher-name').value = name;
    document.getElementById('new-teacher-name').readOnly = true;
    document.getElementById('new-teacher-type').value = type;
    document.getElementById('new-teacher-max').value = max;
    
    // Check checkboxes for handled subjects
    const handled = (subject || '').split(',').map(s => s.trim().toLowerCase());
    document.querySelectorAll('.subject-checkbox').forEach(input => {
        input.checked = handled.includes(input.value.trim().toLowerCase());
    });
    
    // Toggle Class Teacher fields
    const classGroup = document.getElementById('class-teacher-class-group');
    if (type === 'Class Teacher') {
        classGroup.style.display = 'block';
        document.getElementById('new-teacher-class').required = true;
        document.getElementById('new-teacher-class').value = className || '';
    } else {
        classGroup.style.display = 'none';
        document.getElementById('new-teacher-class').required = false;
        document.getElementById('new-teacher-class').value = '';
    }
    
    // Parse mapping
    let mappingObj = {};
    try {
        if (subjectClasses) {
            mappingObj = typeof subjectClasses === 'string' ? JSON.parse(subjectClasses) : subjectClasses;
        }
    } catch (e) {
        console.error("Error parsing subjectClasses:", e);
    }
    renderSubjectClassesMappingUI(mappingObj);
    
    document.getElementById('teacher-form-title').textContent = 'Edit Teacher Details';
    document.getElementById('teacher-submit-btn').textContent = 'Update Teacher';
    
    document.getElementById('teacher-modal').style.display = 'flex';
}

function cancelTeacherEdit() {
    document.getElementById('teacher-edit-mode').value = 'false';
    document.getElementById('new-teacher-name').value = '';
    document.getElementById('new-teacher-name').readOnly = false;
    
    // Reset all checkboxes
    document.querySelectorAll('.subject-checkbox').forEach(input => {
        input.checked = false;
    });
    
    // Reset newly added elements
    const classGroup = document.getElementById('class-teacher-class-group');
    if (classGroup) classGroup.style.display = 'none';
    const clsSelect = document.getElementById('new-teacher-class');
    if (clsSelect) {
        clsSelect.required = false;
        clsSelect.value = '';
    }
    
    const mappingGroup = document.getElementById('subject-classes-mapping-group');
    if (mappingGroup) mappingGroup.style.display = 'none';
    const mappingContainer = document.getElementById('subject-classes-mapping-container');
    if (mappingContainer) mappingContainer.innerHTML = '';
    
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
    const tbody = document.getElementById('except-tbody');
    if (!tbody) return;
    tbody.innerHTML = '';

    // Always show "+ Add to Except" button
    const addBtn = document.getElementById('open-except-modal-btn');
    if (addBtn) addBtn.style.display = 'block';

    // Always show Action column header
    const headers = document.querySelectorAll('#tab-except th');
    if (headers.length >= 5) {
        headers[4].style.display = '';
    }

    // Populate except modal dropdown with ALL teachers
    const sel = document.getElementById('except-teacher-select');
    if (sel) {
        sel.innerHTML = '';
        state.teachers.forEach(t => {
            const opt = document.createElement('option');
            opt.value = t.Teacher_Name;
            opt.textContent = t.Teacher_Name;
            sel.appendChild(opt);
        });
    }

    // Populate except timing select dropdown dynamically with all periods
    const timingSel = document.getElementById('except-timing');
    if (timingSel) {
        timingSel.innerHTML = '<option value="All">All Periods</option>';
        state.timings.forEach(time => {
            const opt = document.createElement('option');
            opt.value = time.period_name;
            opt.textContent = time.period_name;
            timingSel.appendChild(opt);
        });
    }

    if (!state.exceptions || state.exceptions.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding:24px; color:var(--text-secondary);">No teachers in the except list.</td></tr>';
        return;
    }
    state.exceptions.forEach((ex, idx) => {
        const tr = document.createElement('tr');
        const actionCellHTML = `
            <td>
                <button class="btn btn-danger" style="padding:6px 14px; font-size:12px;" onclick="removeFromExcept('${ex.id}', '${ex.Teacher_Name}')">Remove</button>
            </td>`;
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td style="font-weight:600;">${ex.Teacher_Name}</td>
            <td>${ex.Timing || 'All Periods'}</td>
            <td>${ex.Reason || '—'}</td>
            ${actionCellHTML}`;
        tbody.appendChild(tr);
    });
}

async function removeFromExcept(id, teacherName) {
    if (!confirm(`Remove ${teacherName} from Except list?`)) return;
    await fetch(`${API_BASE}/exceptions?id=${id}`, { method: 'DELETE' });
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
        const timing = document.getElementById('except-timing').value || 'All';
        const reason = document.getElementById('except-reason').value.trim();
        await fetch(`${API_BASE}/exceptions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ Teacher_Name: teacherName, Timing: timing, Reason: reason })
        });
        exceptModal.style.display = 'none';
        document.getElementById('except-timing').value = 'All';
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
    populateAbsencePeriodsCheckboxes();
    populateClassDropdowns();
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
    const adminNavs = document.querySelectorAll('.nav-item[data-tab="tab-timetable"], .nav-item[data-tab="tab-teachers"], .nav-item[data-tab="tab-classes"], .nav-item[data-tab="tab-subjects"], .nav-item[data-tab="tab-timings"], .nav-item[data-tab="tab-settings"]');
    
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
            if (['tab-timetable', 'tab-teachers', 'tab-classes', 'tab-subjects', 'tab-timings', 'tab-settings'].includes(tabId)) {
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
    
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const usernameInput = document.getElementById('login-username').value.trim();
        const passwordInput = document.getElementById('login-password').value;
        const errorDiv = document.getElementById('login-error');
        
        if (errorDiv) errorDiv.style.display = 'none';
        
        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ Username: usernameInput, Password: passwordInput })
            });
            const data = await response.json();
            if (data.success) {
                localStorage.setItem('user_role', data.role);
                localStorage.setItem('user_username', data.username);
                verifySession();
            } else {
                if (errorDiv) {
                    errorDiv.textContent = data.message || 'Invalid username or password.';
                    errorDiv.style.display = 'block';
                }
            }
        } catch (err) {
            console.error("Login request failed:", err);
            if (errorDiv) {
                errorDiv.textContent = 'Failed to connect to backend server.';
                errorDiv.style.display = 'block';
            }
        }
    });
}

async function loadSettingsTab() {
    try {
        const response = await fetch(`${API_BASE}/settings/users`);
        const users = await response.json();
        const adminUser = users.find(u => u.role === 'Admin');
        const teacherUser = users.find(u => u.role === 'Teacher');
        
        if (adminUser) {
            document.getElementById('settings-admin-username').value = adminUser.username;
            document.getElementById('settings-admin-password').value = adminUser.password;
        }
        if (teacherUser) {
            document.getElementById('settings-teacher-username').value = teacherUser.username;
            document.getElementById('settings-teacher-password').value = teacherUser.password;
        }
    } catch (err) {
        console.error("Failed to load settings:", err);
    }
}

function renderODTab() {
    const selectedDate = document.getElementById('selected-date').value;
    
    // Sync the local tab date picker
    const odDatePicker = document.getElementById('od-date-picker');
    if (odDatePicker) {
        odDatePicker.value = selectedDate;
    }
    
    // Populate the OD teacher select dropdown
    const odTeacherSelect = document.getElementById('od-teacher-select');
    if (odTeacherSelect) {
        odTeacherSelect.innerHTML = '<option value="">-- Select Teacher --</option>';
        state.teachers.forEach(t => {
            odTeacherSelect.innerHTML += `<option value="${t.Teacher_Name}">${t.Teacher_Name}</option>`;
        });
    }
    
    const isTeacherRole = localStorage.getItem('user_role') === 'Teacher';
    const addForm = document.getElementById('add-od-form');
    if (addForm) {
        addForm.style.display = isTeacherRole ? 'none' : 'flex';
    }
    
    const odTbody = document.getElementById('od-tbody');
    if (odTbody) {
        odTbody.innerHTML = '';
        const dailyODList = (state.odList || []).filter(item => item.Date === selectedDate);
        
        if (dailyODList.length === 0) {
            odTbody.innerHTML = '<tr><td colspan="2" style="text-align:center; color:var(--text-secondary); padding: 16px;">No teachers on On Duty (OD) for this date.</td></tr>';
        } else {
            dailyODList.forEach(item => {
                const tr = document.createElement('tr');
                const actionBtnHTML = isTeacherRole ? '' : `
                    <button class="btn btn-secondary btn-sm" onclick="removeOD('${item.id}')" style="padding: 4px 8px; font-size: 12px; color: var(--text-danger); border-color: var(--text-danger); background: none; cursor: pointer; border-radius: 4px;">
                        Remove
                    </button>
                `;
                tr.innerHTML = `
                    <td><strong>${item.Teacher_Name}</strong></td>
                    <td style="width:120px;">${actionBtnHTML}</td>
                `;
                odTbody.appendChild(tr);
            });
        }
    }
}

function renderCorridorDutyTab() {
    const selectedDate = document.getElementById('selected-date').value;
    
    // Sync local date picker
    const corridorDatePicker = document.getElementById('corridor-date-picker');
    if (corridorDatePicker) {
        corridorDatePicker.value = selectedDate;
    }
    
    // Populate Duty Teacher dropdown
    const globalTeacherSelect = document.getElementById('global-corridor-teacher-select');
    const dailyODList = (state.odList || []).filter(item => item.Date === selectedDate);
    const absentNames = state.absentees.filter(a => a.Date === selectedDate && a.Status === 'Absent').map(a => a.Teacher_Name);
    const odNamesForDate = dailyODList.map(item => item.Teacher_Name);
    
    const eligibleDutyTeachers = state.teachers.filter(t => 
        t.Teacher_Type === 'Non Class Teacher' && 
        !absentNames.includes(t.Teacher_Name) && 
        !odNamesForDate.includes(t.Teacher_Name)
    );
    
    if (globalTeacherSelect) {
        globalTeacherSelect.innerHTML = '<option value="">-- Select Non Class Teacher --</option>';
        eligibleDutyTeachers.forEach(dt => {
            globalTeacherSelect.innerHTML += `<option value="${dt.Teacher_Name}">${dt.Teacher_Name}</option>`;
        });
    }
    
    const isTeacherRole = localStorage.getItem('user_role') === 'Teacher';
    const form = document.getElementById('assign-corridor-form');
    if (form) {
        form.style.display = isTeacherRole ? 'none' : 'flex';
    }
    
    // Wire up form submission if not already done
    if (form && !form.dataset.listenerAttached) {
        form.addEventListener('submit', handleAssignCorridorDuty);
        form.dataset.listenerAttached = 'true';
    }
    
    const tbody = document.getElementById('corridor-duty-tbody');
    if (tbody) {
        tbody.innerHTML = '';
        const dailyCorridorDuties = (state.corridorDuties || []).filter(cd => cd.Date === selectedDate);
        
        if (dailyCorridorDuties.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:var(--text-secondary); padding:16px;">No corridor duties assigned for this date.</td></tr>';
        } else {
            dailyCorridorDuties.forEach(d => {
                const tr = document.createElement('tr');
                const actionHTML = isTeacherRole ? '-' : `
                    <button class="btn btn-secondary btn-sm" onclick="removeCorridorDuty('${d.id}')" style="color:var(--text-danger); border-color:var(--text-danger); background:none; padding:4px 8px; font-size:12px; cursor:pointer;">
                        Remove
                    </button>
                `;
                tr.innerHTML = `
                    <td style="padding:12px;"><strong>${d.Corridor_Name}</strong></td>
                    <td style="padding:12px;"><strong>${d.Corridor_Time}</strong></td>
                    <td style="padding:12px; font-weight:600; color:var(--primary-color);">${d.Duty_Teacher}</td>
                    <td style="padding:12px;">${actionHTML}</td>
                `;
                tbody.appendChild(tr);
            });
        }
    }
}

async function handleAssignCorridorDuty(e) {
    e.preventDefault();
    const date = document.getElementById('selected-date').value;
    const nameInput = document.getElementById('global-corridor-name-input').value;
    const timeInput = document.getElementById('global-corridor-time-input').value;
    const teacherSelect = document.getElementById('global-corridor-teacher-select').value;
    
    if (!nameInput || !timeInput || !teacherSelect || !date) return;
    
    await fetch(`${API_BASE}/corridor-duty`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            Date: date,
            Corridor_Name: nameInput,
            Corridor_Time: timeInput,
            Duty_Teacher: teacherSelect
        })
    });
    
    // Clear the inputs for subsequent additions
    document.getElementById('global-corridor-name-input').value = '';
    document.getElementById('global-corridor-time-input').value = '';
    
    await fetchState();
    renderCorridorDutyTab();
}

async function removeCorridorDuty(id) {
    await fetch(`${API_BASE}/corridor-duty?id=${id}`, {
        method: 'DELETE'
    });
    await fetchState();
    renderCorridorDutyTab();
}

async function handleAddOD(e) {
    e.preventDefault();
    const teacher = document.getElementById('od-teacher-select').value;
    const date = document.getElementById('selected-date').value;
    if (!teacher || !date) return;
    
    await fetch(`${API_BASE}/od`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ Date: date, Teacher_Name: teacher })
    });
    
    await fetchState();
    renderODTab();
    renderCorridorDutyTab();
}

async function removeOD(id) {
    await fetch(`${API_BASE}/od?id=${id}`, {
        method: 'DELETE'
    });
    await fetchState();
    renderODTab();
    renderCorridorDutyTab();
}

function getSupervisionIndexFromName(name) {
    const norm = name.trim().toLowerCase();
    if (['class incharge', 'incharge', 'morning duty', 'morning roll call', 'roll call'].some(t => norm.includes(t))) return 0;
    if (['morning break', 'break 1', 'interval 1'].some(t => norm.includes(t))) return 9;
    if (['lunch break', 'lunch'].some(t => norm.includes(t))) return 10;
    if (['evening break', 'break 2', 'interval 2'].some(t => norm.includes(t))) return 11;
    if (['games', 'diary', 'activity', 'departure', 'evening duty'].some(t => norm.includes(t))) return 12;
    return -1;
}

function getPeriodNumberFromName(name) {
    const norm = name.trim().toLowerCase();
    const match = norm.match(/(?:period|p)\s*(\d+)/i) || norm.match(/(\d+)/);
    return match ? parseInt(match[1], 10) : -1;
}

function parseTimeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const parts = timeStr.split(':');
    let hours = parseInt(parts[0] || '0', 10);
    const minutes = parseInt(parts[1] || '0', 10);
    // If it's a school schedule, hours between 1 and 7 are PM (add 12 hours)
    if (hours >= 1 && hours < 8) {
        hours += 12;
    }
    return hours * 60 + minutes;
}
