const fs = require('fs');
const path = require('path');

// Simple CSV Parser
function parseCSV(filePath) {
    if (!fs.existsSync(filePath)) {
        throw new Error(`File not found: ${filePath}`);
    }
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

// Helper to write CSV
function writeCSV(filePath, headers, rows) {
    const headerLine = headers.join(',');
    const rowLines = rows.map(row => headers.map(h => row[h] || '').join(','));
    const content = [headerLine, ...rowLines].join('\n') + '\n';
    fs.writeFileSync(filePath, content);
}

class SubstitutionEngine {
    constructor(baseDir = 'd:\\ssss') {
        this.baseDir = baseDir;
        this.timetableFile = path.join(baseDir, 'Master_Timetable.csv');
        this.registryFile = path.join(baseDir, 'Teacher_Registry.csv');
        this.absenteeFile = path.join(baseDir, 'Daily_Absentee_List.csv');
        this.subLogFile = path.join(baseDir, 'Daily_Substitution_Log.csv');
        
        this.loadDatabases();
    }

    loadDatabases() {
        this.timetable = parseCSV(this.timetableFile);
        this.registry = parseCSV(this.registryFile);
        this.absentees = parseCSV(this.absenteeFile);
        
        // Initialize or load substitution log
        if (fs.existsSync(this.subLogFile)) {
            this.subLog = parseCSV(this.subLogFile);
        } else {
            this.subLog = [];
        }
    }

    // Determine if a teacher is absent during a specific period P on a given date
    isTeacherAbsentForPeriod(teacherName, date, period) {
        const records = this.absentees.filter(row => row.Teacher_Name === teacherName && row.Date === date);
        if (records.length === 0) return false;
        
        return records.some(row => {
            const type = row.Absence_Type;
            const periods = row.Specific_Periods_Absent;
            const status = row.Status;
            
            if (status !== 'Absent') return false;
            
            if (type === 'Full Day') return true;
            if (type === 'Half Day FN') return period <= 4;
            if (type === 'Half Day AN') return period >= 5;
            
            // Parse Specific_Periods_Absent E.g., "Period 3", "Periods 1 to 4", "1-4"
            if (!periods) return true; 
            const normalized = periods.toLowerCase();
            if (normalized.includes('all')) return true;
            
            // Extract numbers from the string
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

    // Get subject taught by a teacher
    getTeacherSubject(teacherName) {
        const record = this.registry.find(t => t.Teacher_Name === teacherName);
        return record ? record.Main_Subject : 'General';
    }

    // Get max capacity for a teacher
    getTeacherMaxCapacity(teacherName) {
        const record = this.registry.find(t => t.Teacher_Name === teacherName);
        return record ? parseInt(record.Max_Periods_Per_Day, 10) : 5;
    }

    // Get a teacher's schedule for a specific day
    getTeacherDailySchedule(teacherName, day) {
        const schedule = {};
        for (let p = 1; p <= 8; p++) {
            schedule[`Period_${p}`] = 'Free';
        }
        
        this.timetable.forEach(row => {
            if (row.Day === day) {
                for (let p = 1; p <= 8; p++) {
                    const periodKey = `Period_${p}`;
                    if (row[periodKey] === teacherName) {
                        schedule[periodKey] = row.Class;
                    }
                }
            }
        });
        return schedule;
    }

    // Calculate a teacher's current workload today (originally scheduled + substitutions)
    calculateWorkload(teacherName, day, date) {
        const schedule = this.getTeacherDailySchedule(teacherName, day);
        let count = 0;
        for (let p = 1; p <= 8; p++) {
            if (schedule[`Period_${p}`] !== 'Free') {
                count++;
            }
        }
        
        const subsToday = this.subLog.filter(row => row.Date === date && row.Substitute_Teacher === teacherName);
        count += subsToday.length;
        
        return count;
    }

    // Find all substitution requirements for a specific day/date
    findSubstitutionRequirements(day, date) {
        const requirements = [];
        
        this.timetable.forEach(row => {
            if (row.Day === day) {
                for (let p = 1; p <= 8; p++) {
                    const periodKey = `Period_${p}`;
                    const assignedTeacher = row[periodKey];
                    
                    if (assignedTeacher !== 'Free' && this.isTeacherAbsentForPeriod(assignedTeacher, date, p)) {
                        requirements.push({
                            class: row.Class,
                            day: day,
                            date: date,
                            period: p,
                            absentTeacher: assignedTeacher,
                            subject: this.getTeacherSubject(assignedTeacher)
                        });
                    }
                }
            }
        });
        
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

        return requirements;
    }

    // Main logic engine to find the best substitute
    findSubstitute(req) {
        const { day, date, period, absentTeacher, subject } = req;
        const periodKey = `Period_${period}`;
        
        const candidates = [];
        
        this.registry.forEach(teacherRecord => {
            const name = teacherRecord.Teacher_Name;
            
            if (name === absentTeacher) return;
            
            // Skip if the candidate is absent during this period
            if (this.isTeacherAbsentForPeriod(name, date, period)) return;
            
            // Rule check 1: Is candidate already teaching in this period?
            const originalSchedule = this.getTeacherDailySchedule(name, day);
            if (originalSchedule[periodKey] !== 'Free') return; 
            
            const isSubbingThisPeriod = this.subLog.some(row => 
                row.Date === date && 
                row.Period === String(period) && 
                row.Substitute_Teacher === name
            );
            if (isSubbingThisPeriod) return;

            // Rule check 2: No Repeated Substitutions today
            const hasSubbedToday = this.subLog.some(row => 
                row.Date === date && 
                row.Substitute_Teacher === name
            );
            
            // Rule check 3: No Continuous Classes (P-1 and P+1)
            let hasAdjacentClass = false;
            const checkPeriods = [];
            if (period > 1) checkPeriods.push(period - 1);
            if (period < 8) checkPeriods.push(period + 1);
            
            for (const adjPeriod of checkPeriods) {
                const adjPeriodKey = `Period_${adjPeriod}`;
                if (originalSchedule[adjPeriodKey] !== 'Free') {
                    hasAdjacentClass = true;
                    break;
                }
                const isSubbingAdj = this.subLog.some(row => 
                    row.Date === date && 
                    row.Period === String(adjPeriod) && 
                    row.Substitute_Teacher === name
                );
                if (isSubbingAdj) {
                    hasAdjacentClass = true;
                    break;
                }
            }
            
            // Rule check 4: Workload capacity
            const currentWorkload = this.calculateWorkload(name, day, date);
            const maxCapacity = this.getTeacherMaxCapacity(name);
            if (currentWorkload >= maxCapacity) return; 
            
            const isSubjectMatch = teacherRecord.Main_Subject === subject;
            
            candidates.push({
                name,
                currentWorkload,
                hasSubbedToday,
                hasAdjacentClass,
                isSubjectMatch
            });
        });
        
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
            return null;
        }
        
        filtered.sort((a, b) => {
            if (a.isSubjectMatch && !b.isSubjectMatch) return -1;
            if (!a.isSubjectMatch && b.isSubjectMatch) return 1;
            return a.currentWorkload - b.currentWorkload;
        });
        
        return filtered[0];
    }

    runSubstitutions(day, date) {
        console.log(`\n========================================`);
        console.log(`Running substitutions for ${day}, ${date}`);
        console.log(`========================================`);
        
        const requirements = this.findSubstitutionRequirements(day, date);
        console.log(`Found ${requirements.length} periods requiring substitution.`);
        
        const assignments = [];
        
        requirements.forEach(req => {
            console.log(`\nRequirement: Class ${req.class}, Period ${req.period}, Subject: ${req.subject}, Absent: ${req.absentTeacher}`);
            const bestSub = this.findSubstitute(req);
            
            if (bestSub) {
                console.log(`  -> Selected: ${bestSub.name} (Workload: ${bestSub.currentWorkload + 1}, Subject Match: ${bestSub.isSubjectMatch})`);
                
                const newAssignment = {
                    Date: req.date,
                    Day: req.day,
                    Period: String(req.period),
                    Class: req.class,
                    Subject: req.subject,
                    Absent_Teacher: req.absentTeacher,
                    Substitute_Teacher: bestSub.name
                };
                
                this.subLog.push(newAssignment);
                assignments.push(newAssignment);
            } else {
                console.log(`  -> WARNING: No substitute available!`);
                assignments.push({
                    Date: req.date,
                    Day: req.day,
                    Period: String(req.period),
                    Class: req.class,
                    Subject: req.subject,
                    Absent_Teacher: req.absentTeacher,
                    Substitute_Teacher: 'UNASSIGNED'
                });
            }
        });
        
        const headers = ["Date", "Day", "Period", "Class", "Subject", "Absent_Teacher", "Substitute_Teacher"];
        writeCSV(this.subLogFile, headers, this.subLog);
        console.log(`\nSaved substitutions to ${this.subLogFile}`);
        
        return assignments;
    }
}

module.exports = SubstitutionEngine;
