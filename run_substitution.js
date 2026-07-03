const SubstitutionEngine = require('./substitution_engine');

function main() {
    const engine = new SubstitutionEngine();
    
    // We run substitutions for Thursday, 2026-07-02
    const day = "Thursday";
    const date = "2026-07-02";
    
    const assignments = engine.runSubstitutions(day, date);
    
    console.log("\nSubstitution Summary Table:");
    console.log("==========================================================================");
    console.log("Class      | Period | Absent Teacher | Substitute Teacher | Subject Match?");
    console.log("--------------------------------------------------------------------------");
    assignments.forEach(a => {
        // Let's check if subject matches
        const subSubj = engine.getTeacherSubject(a.Substitute_Teacher);
        const match = subSubj === a.Subject ? "Yes" : "No";
        console.log(`${a.Class.padEnd(10)} | ${a.Period.padEnd(6)} | ${a.Absent_Teacher.padEnd(14)} | ${a.Substitute_Teacher.padEnd(18)} | ${match}`);
    });
    console.log("==========================================================================");
}

main();
