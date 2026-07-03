const fs = require('fs');

// Expanding the teacher list to be realistic for a school with 29 classes
const teachers = [
    // Mathematics
    { name: "Kanchana", subject: "Mathematics", maxPeriods: 5 },
    { name: "Anitha", subject: "Mathematics", maxPeriods: 5 },
    { name: "Raman", subject: "Mathematics", maxPeriods: 5 },
    { name: "Gopal", subject: "Mathematics", maxPeriods: 5 },
    
    // Physics
    { name: "Priya", subject: "Physics", maxPeriods: 5 },
    { name: "Srinivasan", subject: "Physics", maxPeriods: 5 },
    
    // Chemistry
    { name: "Mythili", subject: "Chemistry", maxPeriods: 5 },
    { name: "Baskar", subject: "Chemistry", maxPeriods: 5 },
    
    // CS
    { name: "Deepak", subject: "Computer Science", maxPeriods: 5 },
    { name: "Rajesh", subject: "Computer Science", maxPeriods: 5 },
    
    // English
    { name: "Venkatesh", subject: "English", maxPeriods: 5 },
    { name: "Anju", subject: "English", maxPeriods: 5 },
    { name: "Lakshmi", subject: "English", maxPeriods: 5 },
    { name: "Mary", subject: "English", maxPeriods: 5 },
    
    // Tamil
    { name: "Selvi", subject: "Tamil", maxPeriods: 5 },
    { name: "Murugan", subject: "Tamil", maxPeriods: 5 },
    { name: "Arul", subject: "Tamil", maxPeriods: 5 },
    
    // Science (for junior/middle)
    { name: "Kavitha", subject: "Science", maxPeriods: 5 },
    { name: "Devi", subject: "Science", maxPeriods: 5 },
    { name: "Radha", subject: "Science", maxPeriods: 5 },
    
    // Social Science
    { name: "Saritha", subject: "Social Science", maxPeriods: 5 },
    { name: "Kumar", subject: "Social Science", maxPeriods: 5 },
    { name: "Vasudevan", subject: "Social Science", maxPeriods: 5 },
    
    // Commerce / Accounts / Eco
    { name: "Ramachandran", subject: "Accountancy", maxPeriods: 5 },
    { name: "Meena", subject: "Business Studies", maxPeriods: 5 },
    { name: "Krishnan", subject: "Economics", maxPeriods: 5 },
    
    // Others/Moral/PT/Lib
    { name: "Shanthi", subject: "Moral Science", maxPeriods: 5 },
    { name: "John", subject: "Physical Training", maxPeriods: 6 },
    { name: "Saranya", subject: "Moral Science", maxPeriods: 5 },
    { name: "Vennila", subject: "Social Science", maxPeriods: 5 }
];

const classes = [
    "1Y", "1B", "2Y", "2B", "3Y", "3B", "4Y", "4B", "5Y", "5B",
    "6Y", "6B", "7Y", "7G", "8Y", "8G", "9Y", "9B", "10Y", "10G", "10B",
    "11-G1", "11-G2", "11-G3", "11-G4", "12-G1", "12-G2", "12-G3", "12-G5"
];

const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

// Helper to check what subjects a class should have
function getSubjectsForClass(cls) {
    if (cls.startsWith("11-") || cls.startsWith("12-")) {
        if (cls.endsWith("G1") || cls.endsWith("G2")) {
            return ["Mathematics", "Physics", "Chemistry", "English", "Computer Science"];
        }
        if (cls.endsWith("G3")) {
            return ["Physics", "Chemistry", "English", "Computer Science"];
        }
        if (cls.endsWith("G4") || cls.endsWith("G5")) {
            return ["Accountancy", "Business Studies", "Economics", "English", "Mathematics"];
        }
    }
    if (parseInt(cls) >= 6) {
        return ["Mathematics", "Science", "Social Science", "English", "Tamil"];
    }
    return ["Mathematics", "Science", "English", "Tamil", "Moral Science"];
}

function generateMasterTimetable() {
    let csvContent = "Class,Day,Period_1,Period_2,Period_3,Period_4,Period_5,Period_6,Period_7,Period_8\n";
    
    days.forEach(day => {
        const classSchedules = {};
        classes.forEach(cls => {
            classSchedules[cls] = {};
        });
        
        for (let p = 1; p <= 8; p++) {
            const busyTeachers = new Set();
            const shuffledClasses = [...classes].sort(() => Math.random() - 0.5);
            
            shuffledClasses.forEach(cls => {
                const allowedSubjects = getSubjectsForClass(cls);
                const isJunior = !cls.startsWith("11") && !cls.startsWith("12") && parseInt(cls) <= 5;
                const freeProb = isJunior ? 0.3 : 0.15;
                
                if (Math.random() < freeProb || p === 8 && isJunior) {
                    classSchedules[cls][p] = "Free";
                } else {
                    const subject = allowedSubjects[Math.floor(Math.random() * allowedSubjects.length)];
                    const eligibleTeachers = teachers.filter(t => t.subject === subject && !busyTeachers.has(t.name));
                    
                    if (eligibleTeachers.length > 0) {
                        const selectedTeacher = eligibleTeachers[Math.floor(Math.random() * eligibleTeachers.length)].name;
                        classSchedules[cls][p] = selectedTeacher;
                        busyTeachers.add(selectedTeacher);
                    } else {
                        const availableTeachers = teachers.filter(t => !busyTeachers.has(t.name));
                        if (availableTeachers.length > 0) {
                            const selectedTeacher = availableTeachers[Math.floor(Math.random() * availableTeachers.length)].name;
                            classSchedules[cls][p] = selectedTeacher;
                            busyTeachers.add(selectedTeacher);
                        } else {
                            classSchedules[cls][p] = "Free";
                        }
                    }
                }
            });
        }
        
        classes.forEach(cls => {
            let row = [cls, day];
            for (let p = 1; p <= 8; p++) {
                row.push(classSchedules[cls][p] || "Free");
            }
            csvContent += row.join(",") + "\n";
        });
    });
    
    fs.writeFileSync('d:\\ssss\\Master_Timetable.csv', csvContent);
    console.log("Generated a conflict-free Master_Timetable.csv");
}

function generateTeacherRegistry() {
    let csvContent = "Teacher_Name,Main_Subject,Max_Periods_Per_Day\n";
    teachers.forEach(t => {
        csvContent += `${t.name},${t.subject},${t.maxPeriods}\n`;
    });
    fs.writeFileSync('d:\\ssss\\Teacher_Registry.csv', csvContent);
    console.log("Generated Teacher_Registry.csv");
}

function generateDailyAbsenteeList() {
    let csvContent = "Date,Teacher_Name,Absence_Type,Specific_Periods_Absent,Status\n";
    const today = new Date().toISOString().split('T')[0];
    
    // Priya is absent Full Day
    csvContent += `${today},Priya,Full Day,All,Absent\n`;
    // Venkatesh has a 1-Hour Permission for Period 3
    csvContent += `${today},Venkatesh,1-Hour Permission,Period 3,Absent\n`;
    // Raman has a Half Day FN absence (Periods 1 to 4)
    csvContent += `${today},Raman,Half Day FN,Periods 1 to 4,Absent\n`;
    
    fs.writeFileSync('d:\\ssss\\Daily_Absentee_List.csv', csvContent);
    console.log("Generated Daily_Absentee_List.csv with new columns");
}

function main() {
    generateMasterTimetable();
    generateTeacherRegistry();
    generateDailyAbsenteeList();
}

main();
