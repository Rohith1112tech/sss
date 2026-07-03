const fs = require('fs');

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

// Assemble server.js code directly using string concatenation
let serverCode = `const express = require('express');
const cors = require('cors');
const { Client, Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());

const PORT = 3000;
const dbConfig = {
    user: 'postgres',
    password: 'Rohith@2006',
    host: 'localhost',
    port: 5432
};

// Seed datasets
const DEFAULT_TEACHERS = ${JSON.stringify(teachers, null, 4)};
const DEFAULT_TIMETABLE = ${JSON.stringify(timetable, null, 4)};

let pool;

async function initDatabase() {
    console.log("Connecting to PostgreSQL default database...");
    const client = new Client(dbConfig);
    await client.connect();
    
    // Check if substitution_db exists
    const res = await client.query("SELECT 1 FROM pg_database WHERE datname = 'substitution_db'");
    if (res.rowCount === 0) {
        console.log("Database 'substitution_db' does not exist. Creating it...");
        await client.query("CREATE DATABASE substitution_db");
        console.log("Database created.");
    }
    await client.end();
    
    // Connect to substitution_db
    console.log("Connecting to 'substitution_db'...");
    pool = new Pool({
        ...dbConfig,
        database: 'substitution_db'
    });
    
    // Create tables
    await pool.query(\`
        CREATE TABLE IF NOT EXISTS teachers (
            teacher_name VARCHAR(100) PRIMARY KEY,
            main_subject VARCHAR(100),
            max_periods_per_day INT DEFAULT 5
        )
    \`);
    
    await pool.query(\`
        CREATE TABLE IF NOT EXISTS timetable (
            class_name VARCHAR(50),
            day_name VARCHAR(50),
            period_1 VARCHAR(100) DEFAULT 'Free',
            period_2 VARCHAR(100) DEFAULT 'Free',
            period_3 VARCHAR(100) DEFAULT 'Free',
            period_4 VARCHAR(100) DEFAULT 'Free',
            period_5 VARCHAR(100) DEFAULT 'Free',
            period_6 VARCHAR(100) DEFAULT 'Free',
            period_7 VARCHAR(100) DEFAULT 'Free',
            period_8 VARCHAR(100) DEFAULT 'Free',
            PRIMARY KEY (class_name, day_name)
        )
    \`);
    
    await pool.query(\`
        CREATE TABLE IF NOT EXISTS absentees (
            id SERIAL PRIMARY KEY,
            date DATE,
            teacher_name VARCHAR(100) REFERENCES teachers(teacher_name) ON DELETE CASCADE,
            absence_type VARCHAR(50),
            specific_periods_absent VARCHAR(200),
            status VARCHAR(50) DEFAULT 'Absent',
            UNIQUE (date, teacher_name)
        )
    \`);
    
    await pool.query(\`
        CREATE TABLE IF NOT EXISTS sub_log (
            id SERIAL PRIMARY KEY,
            date DATE,
            day_name VARCHAR(50),
            period_num INT,
            class_name VARCHAR(50),
            subject_name VARCHAR(100),
            absent_teacher VARCHAR(100),
            substitute_teacher VARCHAR(100),
            UNIQUE (date, period_num, class_name)
        )
    \`);
    
    console.log("Tables verified.");
    
    // Seed data if empty
    const teacherCheck = await pool.query("SELECT COUNT(*) FROM teachers");
    if (parseInt(teacherCheck.rows[0].count, 10) === 0) {
        console.log("Seeding DEFAULT_TEACHERS...");
        for (const t of DEFAULT_TEACHERS) {
            await pool.query(
                "INSERT INTO teachers (teacher_name, main_subject, max_periods_per_day) VALUES ($1, $2, $3)",
                [t.Teacher_Name, t.Main_Subject, parseInt(t.Max_Periods_Per_Day || '5', 10)]
            );
        }
        console.log("DEFAULT_TEACHERS seeded.");
    }
    
    const timetableCheck = await pool.query("SELECT COUNT(*) FROM timetable");
    if (parseInt(timetableCheck.rows[0].count, 10) === 0) {
        console.log("Seeding DEFAULT_TIMETABLE...");
        for (const r of DEFAULT_TIMETABLE) {
            await pool.query(
                \`INSERT INTO timetable 
                (class_name, day_name, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)\`,
                [
                    r.Class, r.Day, 
                    r.Period_1 || 'Free', r.Period_2 || 'Free', 
                    r.Period_3 || 'Free', r.Period_4 || 'Free', 
                    r.Period_5 || 'Free', r.Period_6 || 'Free', 
                    r.Period_7 || 'Free', r.Period_8 || 'Free'
                ]
            );
        }
        console.log("DEFAULT_TIMETABLE seeded.");
    }
    
    console.log("Database initialization finished.");
}

// REST API Routes

// Get state: teachers, timetable, absentees, subLog for frontend
app.get('/api/state', async (req, res) => {
    try {
        const teachersRes = await pool.query("SELECT * FROM teachers ORDER BY teacher_name");
        const timetableRes = await pool.query("SELECT * FROM timetable ORDER BY class_name, day_name");
        const absenteesRes = await pool.query("SELECT * FROM absentees ORDER BY date, teacher_name");
        const subLogRes = await pool.query("SELECT * FROM sub_log ORDER BY date, period_num, class_name");
        
        const teachersData = teachersRes.rows.map(r => ({
            Teacher_Name: r.teacher_name,
            Main_Subject: r.main_subject,
            Max_Periods_Per_Day: String(r.max_periods_per_day)
        }));
        
        const timetableData = timetableRes.rows.map(r => ({
            Class: r.class_name,
            Day: r.day_name,
            Period_1: r.period_1,
            Period_2: r.period_2,
            Period_3: r.period_3,
            Period_4: r.period_4,
            Period_5: r.period_5,
            Period_6: r.period_6,
            Period_7: r.period_7,
            Period_8: r.period_8
        }));
        
        const absenteesData = absenteesRes.rows.map(r => {
            const dateStr = r.date.toISOString().split('T')[0];
            return {
                Date: dateStr,
                Teacher_Name: r.teacher_name,
                Absence_Type: r.absence_type,
                Specific_Periods_Absent: r.specific_periods_absent,
                Status: r.status
            };
        });
        
        const subLogData = subLogRes.rows.map(r => {
            const dateStr = r.date.toISOString().split('T')[0];
            return {
                Date: dateStr,
                Day: r.day_name,
                Period: String(r.period_num),
                Class: r.class_name,
                Subject: r.subject_name,
                Absent_Teacher: r.absent_teacher,
                Substitute_Teacher: r.substitute_teacher
            };
        });
        
        res.json({
            teachers: teachersData,
            timetable: timetableData,
            absentees: absenteesData,
            subLog: subLogData
        });
    } catch (err) {
        console.error("Error fetching state:", err);
        res.status(500).json({ error: err.message });
    }
});

// Add teacher absence
app.post('/api/absentees', async (req, res) => {
    const { Date: dateStr, Teacher_Name, Absence_Type, Specific_Periods_Absent } = req.body;
    try {
        await pool.query(
            \`INSERT INTO absentees (date, teacher_name, absence_type, specific_periods_absent, status)
             VALUES ($1, $2, $3, $4, 'Absent')
             ON CONFLICT (date, teacher_name) 
             DO UPDATE SET absence_type = $3, specific_periods_absent = $4, status = 'Absent'\`,
            [dateStr, Teacher_Name, Absence_Type, Specific_Periods_Absent]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Remove teacher absence
app.delete('/api/absentees', async (req, res) => {
    const { Date: dateStr, Teacher_Name } = req.query;
    try {
        await pool.query(
            "DELETE FROM absentees WHERE date = $1 AND teacher_name = $2",
            [dateStr, Teacher_Name]
        );
        await pool.query(
            "DELETE FROM sub_log WHERE date = $1 AND absent_teacher = $2",
            [dateStr, Teacher_Name]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add teacher to registry
app.post('/api/teachers', async (req, res) => {
    const { Teacher_Name, Main_Subject, Max_Periods_Per_Day } = req.body;
    try {
        await pool.query(
            "INSERT INTO teachers (teacher_name, main_subject, max_periods_per_day) VALUES ($1, $2, $3)",
            [Teacher_Name, Main_Subject, parseInt(Max_Periods_Per_Day, 10)]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete teacher from registry
app.delete('/api/teachers', async (req, res) => {
    const { Teacher_Name } = req.query;
    try {
        await pool.query("BEGIN");
        await pool.query("DELETE FROM teachers WHERE teacher_name = $1", [Teacher_Name]);
        for (let p = 1; p <= 8; p++) {
            await pool.query(
                \`UPDATE timetable SET period_\${p} = 'Free' WHERE period_\${p} = $1\`,
                [Teacher_Name]
            );
        }
        await pool.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        await pool.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    }
});

// Update cell in timetable
app.post('/api/timetable/cell', async (req, res) => {
    const { Class, Day, Period, Value } = req.body;
    try {
        await pool.query(
            \`UPDATE timetable SET period_\${Period} = $1 WHERE class_name = $2 AND day_name = $3\`,
            [Value, Class, Day]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Override substitution
app.post('/api/substitutions/override', async (req, res) => {
    const { Class, Period, Date: dateStr, Substitute_Teacher } = req.body;
    try {
        await pool.query(
            \`UPDATE sub_log SET substitute_teacher = $1 
             WHERE class_name = $2 AND period_num = $3 AND date = $4\`,
            [Substitute_Teacher, Class, parseInt(Period, 10), dateStr]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Run rules engine on database and store results
app.post('/api/substitutions/calculate', async (req, res) => {
    const { Date: dateStr } = req.body;
    try {
        const dayNames = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const day = dayNames[new Date(dateStr).getDay()];
        
        if (day === "Saturday" || day === "Sunday") {
            return res.json({ success: true, count: 0 });
        }
        
        const teachersRes = await pool.query("SELECT * FROM teachers");
        const timetableRes = await pool.query("SELECT * FROM timetable");
        const absenteesRes = await pool.query("SELECT * FROM absentees WHERE date = $1 AND status = 'Absent'", [dateStr]);
        
        const teachersMap = teachersRes.rows;
        const timetableMap = timetableRes.rows;
        const absentNames = absenteesRes.rows.map(r => r.teacher_name);
        
        await pool.query("DELETE FROM sub_log WHERE date = $1", [dateStr]);
        
        const requirements = [];
        timetableMap.forEach(row => {
            if (row.day_name === day) {
                for (let p = 1; p <= 8; p++) {
                    const key = \`period_\${p}\`;
                    const teacher = row[key];
                    if (teacher && teacher !== 'Free' && absentNames.includes(teacher)) {
                        const isAbsent = isTeacherAbsentForPeriod(absenteesRes.rows, teacher, p);
                        if (isAbsent) {
                            requirements.push({
                                class: row.class_name,
                                day: day,
                                date: dateStr,
                                period: p,
                                absentTeacher: teacher,
                                subject: getTeacherSubject(teachersMap, teacher)
                            });
                        }
                    }
                }
            }
        });
        
        requirements.sort((a, b) => {
            const getPriority = (cls) => {
                if (cls.startsWith('12')) return 4;
                if (cls.startsWith('11')) return 3;
                if (cls.startsWith('10') || cls.startsWith('9')) return 2;
                return 1;
            };
            return getPriority(b.class) - getPriority(a.class) || a.period - b.period;
        });
        
        const activeSubs = [];
        for (const req of requirements) {
            const sub = findSubstituteForPeriod(req, activeSubs, teachersMap, timetableMap, absenteesRes.rows);
            await pool.query(
                \`INSERT INTO sub_log 
                (date, day_name, period_num, class_name, subject_name, absent_teacher, substitute_teacher)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (date, period_num, class_name)
                DO UPDATE SET substitute_teacher = $7\`,
                [dateStr, day, req.period, req.class, req.subject, req.absentTeacher, sub]
            );
            
            activeSubs.push({
                Date: dateStr,
                Day: day,
                Period: String(req.period),
                Class: req.class,
                Subject: req.subject,
                Absent_Teacher: req.absentTeacher,
                Substitute_Teacher: sub
            });
        }
        
        res.json({ success: true, count: requirements.length });
    } catch (err) {
        console.error("Error in substitution engine:", err);
        res.status(500).json({ error: err.message });
    }
});

function isTeacherAbsentForPeriod(absentees, name, period) {
    const record = absentees.find(r => r.teacher_name === name);
    if (!record) return false;
    
    const type = record.absence_type;
    const periods = record.specific_periods_absent || 'All';
    
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
}

function getTeacherSubject(teachers, name) {
    const t = teachers.find(item => item.teacher_name === name);
    return t ? t.main_subject : 'General';
}

function getTeacherMaxCapacity(teachers, name) {
    const t = teachers.find(item => item.teacher_name === name);
    return t ? t.max_periods_per_day : 5;
}

function getTeacherDailySchedule(timetable, name, day) {
    const schedule = {};
    for (let p = 1; p <= 8; p++) {
        schedule[\`Period_\${p}\`] = 'Free';
    }
    
    timetable.forEach(row => {
        if (row.day_name === day) {
            for (let p = 1; p <= 8; p++) {
                const key = \`period_\${p}\`;
                if (row[key] === name) {
                    schedule[\`Period_\${p}\`] = row.class_name;
                }
            }
        }
    });
    return schedule;
}

function calculateWorkload(teachers, timetable, name, day, date, activeSubs) {
    const schedule = getTeacherDailySchedule(timetable, name, day);
    let count = 0;
    for (let p = 1; p <= 8; p++) {
        if (schedule[\`Period_\${p}\`] !== 'Free') count++;
    }
    const subsToday = activeSubs.filter(row => row.Date === date && row.Substitute_Teacher === name);
    count += subsToday.length;
    return count;
}

function findSubstituteForPeriod(req, activeSubs, teachers, timetable, absentees) {
    const { day, date, period, absentTeacher, subject } = req;
    const periodKey = \`Period_\${period}\`;
    
    const candidates = [];
    
    teachers.forEach(teacherRecord => {
        const name = teacherRecord.teacher_name;
        if (!name || name === absentTeacher) return;
        
        if (isTeacherAbsentForPeriod(absentees, name, period)) return;
        
        const originalSchedule = getTeacherDailySchedule(timetable, name, day);
        if (originalSchedule[periodKey] !== 'Free') return;
        
        const isSubbingThisPeriod = activeSubs.some(row => 
            row.Date === date && 
            row.Period === String(period) && 
            row.Substitute_Teacher === name
        );
        if (isSubbingThisPeriod) return;

        const hasSubbedToday = activeSubs.some(row => 
            row.Date === date && 
            row.Substitute_Teacher === name
        );
        
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
        
        const workload = calculateWorkload(teachers, timetable, name, day, date, activeSubs);
        const maxCapacity = getTeacherMaxCapacity(teachers, name);
        if (workload >= maxCapacity) return;
        
        const isSubjectMatch = teacherRecord.main_subject === subject;
        
        candidates.push({
            name,
            workload,
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
    
    if (filtered.length === 0) return 'MANUAL INTERVENTION REQUIRED';
    
    filtered.sort((a, b) => {
        if (a.isSubjectMatch && !b.isSubjectMatch) return -1;
        if (!a.isSubjectMatch && b.isSubjectMatch) return 1;
        return a.workload - b.workload;
    });
    
    return filtered[0].name;
}

// Start Server after DB check
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(\`Backend server running at http://localhost:\${PORT}\`);
    });
}).catch(err => {
    console.error("Failed to initialize database:", err);
});
`;

fs.writeFileSync('d:\\ssss\\server.js', serverCode);
console.log("Successfully generated server.js!");
