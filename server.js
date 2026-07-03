const express = require('express');
const cors = require('cors');
const { Client, Pool } = require('pg');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

const PORT = process.env.PORT || 3000;
const dbConfig = {
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'Rohith@2006',
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432', 10)
};

// Seed datasets
const DEFAULT_TEACHERS = [
    {
        "Teacher_Name": "Kanchana",
        "Main_Subject": "Mathematics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Anitha",
        "Main_Subject": "Mathematics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Raman",
        "Main_Subject": "Mathematics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Gopal",
        "Main_Subject": "Mathematics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Priya",
        "Main_Subject": "Physics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Srinivasan",
        "Main_Subject": "Physics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Mythili",
        "Main_Subject": "Chemistry",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Baskar",
        "Main_Subject": "Chemistry",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Deepak",
        "Main_Subject": "Computer Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Rajesh",
        "Main_Subject": "Computer Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Venkatesh",
        "Main_Subject": "English",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Anju",
        "Main_Subject": "English",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Lakshmi",
        "Main_Subject": "English",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Mary",
        "Main_Subject": "English",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Selvi",
        "Main_Subject": "Tamil",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Murugan",
        "Main_Subject": "Tamil",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Arul",
        "Main_Subject": "Tamil",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Kavitha",
        "Main_Subject": "Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Devi",
        "Main_Subject": "Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Radha",
        "Main_Subject": "Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Saritha",
        "Main_Subject": "Social Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Kumar",
        "Main_Subject": "Social Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Vasudevan",
        "Main_Subject": "Social Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Ramachandran",
        "Main_Subject": "Accountancy",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Meena",
        "Main_Subject": "Business Studies",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Krishnan",
        "Main_Subject": "Economics",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Shanthi",
        "Main_Subject": "Moral Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "John",
        "Main_Subject": "Physical Training",
        "Max_Periods_Per_Day": "6"
    },
    {
        "Teacher_Name": "Saranya",
        "Main_Subject": "Moral Science",
        "Max_Periods_Per_Day": "5"
    },
    {
        "Teacher_Name": "Vennila",
        "Main_Subject": "Social Science",
        "Max_Periods_Per_Day": "5"
    }
];
const DEFAULT_TIMETABLE = [
    {
        "Class": "1Y",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Lakshmi",
        "Period_4": "Murugan",
        "Period_5": "Selvi",
        "Period_6": "Kanchana",
        "Period_7": "Lakshmi",
        "Period_8": "Free"
    },
    {
        "Class": "1B",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Kavitha",
        "Period_3": "Free",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Free",
        "Period_7": "Anitha",
        "Period_8": "Free"
    },
    {
        "Class": "2Y",
        "Day": "Monday",
        "Period_1": "Saranya",
        "Period_2": "Free",
        "Period_3": "Kavitha",
        "Period_4": "Deepak",
        "Period_5": "Vasudevan",
        "Period_6": "Kavitha",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "2B",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Raman",
        "Period_3": "Free",
        "Period_4": "Radha",
        "Period_5": "Shanthi",
        "Period_6": "Free",
        "Period_7": "Saranya",
        "Period_8": "Free"
    },
    {
        "Class": "3Y",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Anitha",
        "Period_3": "Arul",
        "Period_4": "Kanchana",
        "Period_5": "Anju",
        "Period_6": "Free",
        "Period_7": "Shanthi",
        "Period_8": "Free"
    },
    {
        "Class": "3B",
        "Day": "Monday",
        "Period_1": "Shanthi",
        "Period_2": "Free",
        "Period_3": "Radha",
        "Period_4": "Venkatesh",
        "Period_5": "Arul",
        "Period_6": "Free",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "4Y",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Saranya",
        "Period_3": "Free",
        "Period_4": "Gopal",
        "Period_5": "Lakshmi",
        "Period_6": "Venkatesh",
        "Period_7": "Ramachandran",
        "Period_8": "Free"
    },
    {
        "Class": "4B",
        "Day": "Monday",
        "Period_1": "Krishnan",
        "Period_2": "Arul",
        "Period_3": "Murugan",
        "Period_4": "Vasudevan",
        "Period_5": "Kanchana",
        "Period_6": "Free",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "5Y",
        "Day": "Monday",
        "Period_1": "Vasudevan",
        "Period_2": "Shanthi",
        "Period_3": "Shanthi",
        "Period_4": "Krishnan",
        "Period_5": "Free",
        "Period_6": "Anju",
        "Period_7": "Kavitha",
        "Period_8": "Free"
    },
    {
        "Class": "5B",
        "Day": "Monday",
        "Period_1": "Radha",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Devi",
        "Period_5": "Gopal",
        "Period_6": "Arul",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "6Y",
        "Day": "Monday",
        "Period_1": "Mary",
        "Period_2": "Kanchana",
        "Period_3": "Saritha",
        "Period_4": "Vennila",
        "Period_5": "Kavitha",
        "Period_6": "Vasudevan",
        "Period_7": "Radha",
        "Period_8": "Murugan"
    },
    {
        "Class": "6B",
        "Day": "Monday",
        "Period_1": "Kumar",
        "Period_2": "Radha",
        "Period_3": "Kumar",
        "Period_4": "Anju",
        "Period_5": "John",
        "Period_6": "Devi",
        "Period_7": "Rajesh",
        "Period_8": "Free"
    },
    {
        "Class": "7Y",
        "Day": "Monday",
        "Period_1": "Anju",
        "Period_2": "Murugan",
        "Period_3": "Selvi",
        "Period_4": "Selvi",
        "Period_5": "Kumar",
        "Period_6": "Kumar",
        "Period_7": "Kumar",
        "Period_8": "Free"
    },
    {
        "Class": "7G",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Vasudevan",
        "Period_3": "Free",
        "Period_4": "Kavitha",
        "Period_5": "Mary",
        "Period_6": "Murugan",
        "Period_7": "Arul",
        "Period_8": "Free"
    },
    {
        "Class": "8Y",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Baskar",
        "Period_3": "Free",
        "Period_4": "Free",
        "Period_5": "Saritha",
        "Period_6": "Selvi",
        "Period_7": "Mary",
        "Period_8": "Arul"
    },
    {
        "Class": "8G",
        "Day": "Monday",
        "Period_1": "Gopal",
        "Period_2": "Venkatesh",
        "Period_3": "Vasudevan",
        "Period_4": "Kumar",
        "Period_5": "Radha",
        "Period_6": "Raman",
        "Period_7": "Gopal",
        "Period_8": "Selvi"
    },
    {
        "Class": "9Y",
        "Day": "Monday",
        "Period_1": "Raman",
        "Period_2": "Vennila",
        "Period_3": "Free",
        "Period_4": "Saritha",
        "Period_5": "Murugan",
        "Period_6": "Saranya",
        "Period_7": "Venkatesh",
        "Period_8": "Free"
    },
    {
        "Class": "9B",
        "Day": "Monday",
        "Period_1": "Anitha",
        "Period_2": "Anju",
        "Period_3": "Devi",
        "Period_4": "Raman",
        "Period_5": "Anitha",
        "Period_6": "Radha",
        "Period_7": "Raman",
        "Period_8": "Free"
    },
    {
        "Class": "10Y",
        "Day": "Monday",
        "Period_1": "Kavitha",
        "Period_2": "Mary",
        "Period_3": "Free",
        "Period_4": "Arul",
        "Period_5": "Mythili",
        "Period_6": "Free",
        "Period_7": "Selvi",
        "Period_8": "Anitha"
    },
    {
        "Class": "10G",
        "Day": "Monday",
        "Period_1": "Venkatesh",
        "Period_2": "Gopal",
        "Period_3": "Mary",
        "Period_4": "Free",
        "Period_5": "Srinivasan",
        "Period_6": "Saritha",
        "Period_7": "Vasudevan",
        "Period_8": "Anju"
    },
    {
        "Class": "10B",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "Selvi",
        "Period_3": "Anitha",
        "Period_4": "Mary",
        "Period_5": "Priya",
        "Period_6": "Mary",
        "Period_7": "Free",
        "Period_8": "Raman"
    },
    {
        "Class": "11-G1",
        "Day": "Monday",
        "Period_1": "Kanchana",
        "Period_2": "Lakshmi",
        "Period_3": "Baskar",
        "Period_4": "Shanthi",
        "Period_5": "Devi",
        "Period_6": "Free",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "11-G2",
        "Day": "Monday",
        "Period_1": "Meena",
        "Period_2": "Rajesh",
        "Period_3": "Rajesh",
        "Period_4": "Anitha",
        "Period_5": "Raman",
        "Period_6": "Anitha",
        "Period_7": "Kanchana",
        "Period_8": "Deepak"
    },
    {
        "Class": "11-G3",
        "Day": "Monday",
        "Period_1": "Rajesh",
        "Period_2": "Devi",
        "Period_3": "Priya",
        "Period_4": "Srinivasan",
        "Period_5": "Venkatesh",
        "Period_6": "Srinivasan",
        "Period_7": "Anju",
        "Period_8": "Baskar"
    },
    {
        "Class": "11-G4",
        "Day": "Monday",
        "Period_1": "Free",
        "Period_2": "John",
        "Period_3": "Ramachandran",
        "Period_4": "Lakshmi",
        "Period_5": "Ramachandran",
        "Period_6": "Free",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "12-G1",
        "Day": "Monday",
        "Period_1": "Baskar",
        "Period_2": "Mythili",
        "Period_3": "Srinivasan",
        "Period_4": "Priya",
        "Period_5": "Deepak",
        "Period_6": "Gopal",
        "Period_7": "Deepak",
        "Period_8": "Lakshmi"
    },
    {
        "Class": "12-G2",
        "Day": "Monday",
        "Period_1": "Deepak",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Baskar",
        "Period_5": "Baskar",
        "Period_6": "Mythili",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "12-G3",
        "Day": "Monday",
        "Period_1": "Mythili",
        "Period_2": "Deepak",
        "Period_3": "Deepak",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Lakshmi",
        "Period_7": "Srinivasan",
        "Period_8": "Rajesh"
    },
    {
        "Class": "12-G5",
        "Day": "Monday",
        "Period_1": "Lakshmi",
        "Period_2": "Krishnan",
        "Period_3": "Gopal",
        "Period_4": "Rajesh",
        "Period_5": "Rajesh",
        "Period_6": "Krishnan",
        "Period_7": "Murugan",
        "Period_8": "Free"
    },
    {
        "Class": "1Y",
        "Day": "Tuesday",
        "Period_1": "Kanchana",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Saranya",
        "Period_5": "Murugan",
        "Period_6": "Kavitha",
        "Period_7": "Kanchana",
        "Period_8": "Free"
    },
    {
        "Class": "1B",
        "Day": "Tuesday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Selvi",
        "Period_4": "Free",
        "Period_5": "Shanthi",
        "Period_6": "Lakshmi",
        "Period_7": "Shanthi",
        "Period_8": "Free"
    },
    {
        "Class": "2Y",
        "Day": "Tuesday",
        "Period_1": "Saranya",
        "Period_2": "Lakshmi",
        "Period_3": "Saranya",
        "Period_4": "Shanthi",
        "Period_5": "Anju",
        "Period_6": "Arul",
        "Period_7": "Lakshmi",
        "Period_8": "Free"
    },
    {
        "Class": "2B",
        "Day": "Tuesday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Lakshmi",
        "Period_5": "Radha",
        "Period_6": "Venkatesh",
        "Period_7": "Radha",
        "Period_8": "Free"
    },
    {
        "Class": "3Y",
        "Day": "Tuesday",
        "Period_1": "Free",
        "Period_2": "Raman",
        "Period_3": "Kavitha",
        "Period_4": "Selvi",
        "Period_5": "Kavitha",
        "Period_6": "Selvi",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "3B",
        "Day": "Tuesday",
        "Period_1": "Selvi",
        "Period_2": "Devi",
        "Period_3": "Venkatesh",
        "Period_4": "Srinivasan",
        "Period_5": "Baskar",
        "Period_6": "Shanthi",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "4Y",
        "Day": "Tuesday",
        "Period_1": "Shanthi",
        "Period_2": "Kanchana",
        "Period_3": "Free",
        "Period_4": "Radha",
        "Period_5": "Arul",
        "Period_6": "Free",
        "Period_7": "Selvi",
        "Period_8": "Free"
    },
    {
        "Class": "4B",
        "Day": "Tuesday",
        "Period_1": "Radha",
        "Period_2": "Venkatesh",
        "Period_3": "Free",
        "Period_4": "Vennila",
        "Period_5": "John",
        "Period_6": "Anju",
        "Period_7": "Ramachandran",
        "Period_8": "Free"
    },
    {
        "Class": "5Y",
        "Day": "Tuesday",
        "Period_1": "Gopal",
        "Period_2": "Free",
        "Period_3": "Raman",
        "Period_4": "Free",
        "Period_5": "Saranya",
        "Period_6": "Vasudevan",
        "Period_7": "Saranya",
        "Period_8": "Free"
    },
    {
        "Class": "5B",
        "Day": "Tuesday",
        "Period_1": "Ramachandran",
        "Period_2": "Gopal",
        "Period_3": "Shanthi",
        "Period_4": "Kavitha",
        "Period_5": "Anitha",
        "Period_6": "Free",
        "Period_7": "Anju",
        "Period_8": "Free"
    },
    {
        "Class": "6Y",
        "Day": "Tuesday",
        "Period_1": "Kavitha",
        "Period_2": "Arul",
        "Period_3": "Baskar",
        "Period_4": "Devi",
        "Period_5": "Deepak",
        "Period_6": "Anitha",
        "Period_7": "Free",
        "Period_8": "Anju"
    },
    {
        "Class": "6B",
        "Day": "Tuesday",
        "Period_1": "Saritha",
        "Period_2": "Selvi",
        "Period_3": "Vasudevan",
        "Period_4": "Mary",
        "Period_5": "Raman",
        "Period_6": "Murugan",
        "Period_7": "Saritha",
        "Period_8": "Kavitha"
    },
    {
        "Class": "7Y",
        "Day": "Tuesday",
        "Period_1": "Raman",
        "Period_2": "Vasudevan",
        "Period_3": "Devi",
        "Period_4": "Kanchana",
        "Period_5": "Free",
        "Period_6": "Priya",
        "Period_7": "Arul",
        "Period_8": "Saritha"
    },
    {
        "Class": "7G",
        "Day": "Tuesday",
        "Period_1": "Vasudevan",
        "Period_2": "Murugan",
        "Period_3": "Murugan",
        "Period_4": "Anju",
        "Period_5": "Mary",
        "Period_6": "Baskar",
        "Period_7": "Venkatesh",
        "Period_8": "Lakshmi"
    },
    {
        "Class": "8Y",
        "Day": "Tuesday",
        "Period_1": "Anitha",
        "Period_2": "Vennila",
        "Period_3": "Lakshmi",
        "Period_4": "Meena",
        "Period_5": "Vennila",
        "Period_6": "Radha",
        "Period_7": "Kavitha",
        "Period_8": "Anitha"
    },
    {
        "Class": "8G",
        "Day": "Tuesday",
        "Period_1": "Murugan",
        "Period_2": "Saritha",
        "Period_3": "Free",
        "Period_4": "Anitha",
        "Period_5": "Devi",
        "Period_6": "Gopal",
        "Period_7": "Anitha",
        "Period_8": "Selvi"
    },
    {
        "Class": "9Y",
        "Day": "Tuesday",
        "Period_1": "Venkatesh",
        "Period_2": "Free",
        "Period_3": "Anitha",
        "Period_4": "Priya",
        "Period_5": "Venkatesh",
        "Period_6": "Raman",
        "Period_7": "Devi",
        "Period_8": "Vasudevan"
    },
    {
        "Class": "9B",
        "Day": "Tuesday",
        "Period_1": "Anju",
        "Period_2": "Anitha",
        "Period_3": "Mary",
        "Period_4": "Kumar",
        "Period_5": "Free",
        "Period_6": "Meena",
        "Period_7": "Mary",
        "Period_8": "Murugan"
    },
    {
        "Class": "10Y",
        "Day": "Tuesday",
        "Period_1": "Vennila",
        "Period_2": "Saranya",
        "Period_3": "Priya",
        "Period_4": "Murugan",
        "Period_5": "Free",
        "Period_6": "Saritha",
        "Period_7": "Murugan",
        "Period_8": "Gopal"
    },
    {
        "Class": "10G",
        "Day": "Tuesday",
        "Period_1": "Kumar",
        "Period_2": "Kumar",
        "Period_3": "Vennila",
        "Period_4": "Arul",
        "Period_5": "Gopal",
        "Period_6": "Kumar",
        "Period_7": "Vasudevan",
        "Period_8": "Mary"
    },
    {
        "Class": "10B",
        "Day": "Tuesday",
        "Period_1": "Arul",
        "Period_2": "Anju",
        "Period_3": "Radha",
        "Period_4": "Ramachandran",
        "Period_5": "Selvi",
        "Period_6": "Free",
        "Period_7": "Vennila",
        "Period_8": "Devi"
    },
    {
        "Class": "11-G1",
        "Day": "Tuesday",
        "Period_1": "Rajesh",
        "Period_2": "Priya",
        "Period_3": "Free",
        "Period_4": "Baskar",
        "Period_5": "Mythili",
        "Period_6": "Kanchana",
        "Period_7": "Free",
        "Period_8": "Srinivasan"
    },
    {
        "Class": "11-G2",
        "Day": "Tuesday",
        "Period_1": "Deepak",
        "Period_2": "Krishnan",
        "Period_3": "Ramachandran",
        "Period_4": "Rajesh",
        "Period_5": "Free",
        "Period_6": "Deepak",
        "Period_7": "Srinivasan",
        "Period_8": "Venkatesh"
    },
    {
        "Class": "11-G3",
        "Day": "Tuesday",
        "Period_1": "Mary",
        "Period_2": "Rajesh",
        "Period_3": "Deepak",
        "Period_4": "Mythili",
        "Period_5": "Vasudevan",
        "Period_6": "Rajesh",
        "Period_7": "Mythili",
        "Period_8": "Deepak"
    },
    {
        "Class": "11-G4",
        "Day": "Tuesday",
        "Period_1": "Lakshmi",
        "Period_2": "Mary",
        "Period_3": "Kanchana",
        "Period_4": "Raman",
        "Period_5": "Kumar",
        "Period_6": "Free",
        "Period_7": "Kumar",
        "Period_8": "Kanchana"
    },
    {
        "Class": "12-G1",
        "Day": "Tuesday",
        "Period_1": "Mythili",
        "Period_2": "Ramachandran",
        "Period_3": "Anju",
        "Period_4": "Vasudevan",
        "Period_5": "Rajesh",
        "Period_6": "Mary",
        "Period_7": "Free",
        "Period_8": "Raman"
    },
    {
        "Class": "12-G2",
        "Day": "Tuesday",
        "Period_1": "Priya",
        "Period_2": "Deepak",
        "Period_3": "Gopal",
        "Period_4": "Deepak",
        "Period_5": "Priya",
        "Period_6": "Ramachandran",
        "Period_7": "Priya",
        "Period_8": "Rajesh"
    },
    {
        "Class": "12-G3",
        "Day": "Tuesday",
        "Period_1": "Srinivasan",
        "Period_2": "Srinivasan",
        "Period_3": "Mythili",
        "Period_4": "Venkatesh",
        "Period_5": "Lakshmi",
        "Period_6": "Free",
        "Period_7": "Baskar",
        "Period_8": "Free"
    },
    {
        "Class": "12-G5",
        "Day": "Tuesday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Arul",
        "Period_4": "Gopal",
        "Period_5": "Kanchana",
        "Period_6": "Krishnan",
        "Period_7": "Gopal",
        "Period_8": "Ramachandran"
    },
    {
        "Class": "1Y",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Radha",
        "Period_3": "Kavitha",
        "Period_4": "Raman",
        "Period_5": "Anitha",
        "Period_6": "Saranya",
        "Period_7": "Lakshmi",
        "Period_8": "Free"
    },
    {
        "Class": "1B",
        "Day": "Wednesday",
        "Period_1": "Kanchana",
        "Period_2": "Shanthi",
        "Period_3": "Free",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Shanthi",
        "Period_7": "Priya",
        "Period_8": "Free"
    },
    {
        "Class": "2Y",
        "Day": "Wednesday",
        "Period_1": "Anju",
        "Period_2": "Devi",
        "Period_3": "Free",
        "Period_4": "Free",
        "Period_5": "Kanchana",
        "Period_6": "Raman",
        "Period_7": "Srinivasan",
        "Period_8": "Free"
    },
    {
        "Class": "2B",
        "Day": "Wednesday",
        "Period_1": "Kavitha",
        "Period_2": "Vennila",
        "Period_3": "Radha",
        "Period_4": "Shanthi",
        "Period_5": "Raman",
        "Period_6": "Anju",
        "Period_7": "Radha",
        "Period_8": "Free"
    },
    {
        "Class": "3Y",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Meena",
        "Period_5": "Devi",
        "Period_6": "John",
        "Period_7": "Saritha",
        "Period_8": "Free"
    },
    {
        "Class": "3B",
        "Day": "Wednesday",
        "Period_1": "Saranya",
        "Period_2": "Free",
        "Period_3": "Murugan",
        "Period_4": "Lakshmi",
        "Period_5": "Kavitha",
        "Period_6": "Saritha",
        "Period_7": "Anitha",
        "Period_8": "Free"
    },
    {
        "Class": "4Y",
        "Day": "Wednesday",
        "Period_1": "Shanthi",
        "Period_2": "Saranya",
        "Period_3": "Arul",
        "Period_4": "Gopal",
        "Period_5": "Srinivasan",
        "Period_6": "Arul",
        "Period_7": "Saranya",
        "Period_8": "Free"
    },
    {
        "Class": "4B",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Mary",
        "Period_3": "Free",
        "Period_4": "Anju",
        "Period_5": "Lakshmi",
        "Period_6": "Radha",
        "Period_7": "Devi",
        "Period_8": "Free"
    },
    {
        "Class": "5Y",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Srinivasan",
        "Period_4": "Ramachandran",
        "Period_5": "Mary",
        "Period_6": "Srinivasan",
        "Period_7": "Venkatesh",
        "Period_8": "Free"
    },
    {
        "Class": "5B",
        "Day": "Wednesday",
        "Period_1": "Selvi",
        "Period_2": "Kavitha",
        "Period_3": "Devi",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Mary",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "6Y",
        "Day": "Wednesday",
        "Period_1": "Radha",
        "Period_2": "Kumar",
        "Period_3": "Anju",
        "Period_4": "Anitha",
        "Period_5": "Kumar",
        "Period_6": "Priya",
        "Period_7": "Free",
        "Period_8": "Selvi"
    },
    {
        "Class": "6B",
        "Day": "Wednesday",
        "Period_1": "Anitha",
        "Period_2": "Selvi",
        "Period_3": "Venkatesh",
        "Period_4": "Priya",
        "Period_5": "Venkatesh",
        "Period_6": "Venkatesh",
        "Period_7": "Arul",
        "Period_8": "Devi"
    },
    {
        "Class": "7Y",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Kanchana",
        "Period_3": "Anitha",
        "Period_4": "Radha",
        "Period_5": "Selvi",
        "Period_6": "Kanchana",
        "Period_7": "Raman",
        "Period_8": "Vennila"
    },
    {
        "Class": "7G",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "John",
        "Period_3": "Free",
        "Period_4": "Kumar",
        "Period_5": "Krishnan",
        "Period_6": "Kavitha",
        "Period_7": "Free",
        "Period_8": "Venkatesh"
    },
    {
        "Class": "8Y",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Venkatesh",
        "Period_3": "Free",
        "Period_4": "Selvi",
        "Period_5": "Gopal",
        "Period_6": "Selvi",
        "Period_7": "Kavitha",
        "Period_8": "Kavitha"
    },
    {
        "Class": "8G",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Gopal",
        "Period_3": "Gopal",
        "Period_4": "Vasudevan",
        "Period_5": "Vennila",
        "Period_6": "Murugan",
        "Period_7": "Free",
        "Period_8": "Radha"
    },
    {
        "Class": "9Y",
        "Day": "Wednesday",
        "Period_1": "Raman",
        "Period_2": "Priya",
        "Period_3": "Kanchana",
        "Period_4": "Vennila",
        "Period_5": "Radha",
        "Period_6": "Kumar",
        "Period_7": "Kumar",
        "Period_8": "Kumar"
    },
    {
        "Class": "9B",
        "Day": "Wednesday",
        "Period_1": "Arul",
        "Period_2": "Free",
        "Period_3": "Saritha",
        "Period_4": "Kavitha",
        "Period_5": "Free",
        "Period_6": "Vennila",
        "Period_7": "Shanthi",
        "Period_8": "Arul"
    },
    {
        "Class": "10Y",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Rajesh",
        "Period_3": "Raman",
        "Period_4": "Kanchana",
        "Period_5": "Arul",
        "Period_6": "Lakshmi",
        "Period_7": "Selvi",
        "Period_8": "Anju"
    },
    {
        "Class": "10G",
        "Day": "Wednesday",
        "Period_1": "Lakshmi",
        "Period_2": "Raman",
        "Period_3": "Selvi",
        "Period_4": "Free",
        "Period_5": "Vasudevan",
        "Period_6": "Vasudevan",
        "Period_7": "Meena",
        "Period_8": "Murugan"
    },
    {
        "Class": "10B",
        "Day": "Wednesday",
        "Period_1": "Devi",
        "Period_2": "Krishnan",
        "Period_3": "Vasudevan",
        "Period_4": "Free",
        "Period_5": "Murugan",
        "Period_6": "Gopal",
        "Period_7": "Murugan",
        "Period_8": "Krishnan"
    },
    {
        "Class": "11-G1",
        "Day": "Wednesday",
        "Period_1": "Venkatesh",
        "Period_2": "Free",
        "Period_3": "Mythili",
        "Period_4": "Mary",
        "Period_5": "Deepak",
        "Period_6": "Anitha",
        "Period_7": "Free",
        "Period_8": "Rajesh"
    },
    {
        "Class": "11-G2",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Deepak",
        "Period_3": "Rajesh",
        "Period_4": "Free",
        "Period_5": "Rajesh",
        "Period_6": "Rajesh",
        "Period_7": "Rajesh",
        "Period_8": "Priya"
    },
    {
        "Class": "11-G3",
        "Day": "Wednesday",
        "Period_1": "Mary",
        "Period_2": "Baskar",
        "Period_3": "Free",
        "Period_4": "Rajesh",
        "Period_5": "Baskar",
        "Period_6": "Mythili",
        "Period_7": "Anju",
        "Period_8": "Anitha"
    },
    {
        "Class": "11-G4",
        "Day": "Wednesday",
        "Period_1": "Ramachandran",
        "Period_2": "Free",
        "Period_3": "Lakshmi",
        "Period_4": "Free",
        "Period_5": "Meena",
        "Period_6": "Meena",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "12-G1",
        "Day": "Wednesday",
        "Period_1": "Priya",
        "Period_2": "Lakshmi",
        "Period_3": "Mary",
        "Period_4": "Venkatesh",
        "Period_5": "John",
        "Period_6": "Baskar",
        "Period_7": "Deepak",
        "Period_8": "Deepak"
    },
    {
        "Class": "12-G2",
        "Day": "Wednesday",
        "Period_1": "Deepak",
        "Period_2": "Anju",
        "Period_3": "Free",
        "Period_4": "Mythili",
        "Period_5": "Anju",
        "Period_6": "Krishnan",
        "Period_7": "Gopal",
        "Period_8": "Free"
    },
    {
        "Class": "12-G3",
        "Day": "Wednesday",
        "Period_1": "Baskar",
        "Period_2": "Srinivasan",
        "Period_3": "Baskar",
        "Period_4": "Srinivasan",
        "Period_5": "Saritha",
        "Period_6": "Devi",
        "Period_7": "Mary",
        "Period_8": "Srinivasan"
    },
    {
        "Class": "12-G5",
        "Day": "Wednesday",
        "Period_1": "Free",
        "Period_2": "Ramachandran",
        "Period_3": "Meena",
        "Period_4": "Baskar",
        "Period_5": "Ramachandran",
        "Period_6": "Ramachandran",
        "Period_7": "Ramachandran",
        "Period_8": "Mary"
    },
    {
        "Class": "1Y",
        "Day": "Thursday",
        "Period_1": "Anju",
        "Period_2": "Free",
        "Period_3": "Gopal",
        "Period_4": "Saranya",
        "Period_5": "Anitha",
        "Period_6": "John",
        "Period_7": "Anitha",
        "Period_8": "Free"
    },
    {
        "Class": "1B",
        "Day": "Thursday",
        "Period_1": "Free",
        "Period_2": "Free",
        "Period_3": "Kanchana",
        "Period_4": "Free",
        "Period_5": "Rajesh",
        "Period_6": "Devi",
        "Period_7": "Mythili",
        "Period_8": "Free"
    },
    {
        "Class": "2Y",
        "Day": "Thursday",
        "Period_1": "Gopal",
        "Period_2": "Saritha",
        "Period_3": "Lakshmi",
        "Period_4": "Anitha",
        "Period_5": "Free",
        "Period_6": "Lakshmi",
        "Period_7": "Selvi",
        "Period_8": "Free"
    },
    {
        "Class": "2B",
        "Day": "Thursday",
        "Period_1": "Mary",
        "Period_2": "Venkatesh",
        "Period_3": "Shanthi",
        "Period_4": "Radha",
        "Period_5": "Saranya",
        "Period_6": "Free",
        "Period_7": "Murugan",
        "Period_8": "Free"
    },
    {
        "Class": "3Y",
        "Day": "Thursday",
        "Period_1": "Free",
        "Period_2": "Saranya",
        "Period_3": "Selvi",
        "Period_4": "Kavitha",
        "Period_5": "Gopal",
        "Period_6": "Srinivasan",
        "Period_7": "Shanthi",
        "Period_8": "Free"
    },
    {
        "Class": "3B",
        "Day": "Thursday",
        "Period_1": "Srinivasan",
        "Period_2": "Free",
        "Period_3": "Anju",
        "Period_4": "Shanthi",
        "Period_5": "Free",
        "Period_6": "Saranya",
        "Period_7": "Saranya",
        "Period_8": "Free"
    },
    {
        "Class": "4Y",
        "Day": "Thursday",
        "Period_1": "Shanthi",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Selvi",
        "Period_5": "Shanthi",
        "Period_6": "Vasudevan",
        "Period_7": "Arul",
        "Period_8": "Free"
    },
    {
        "Class": "4B",
        "Day": "Thursday",
        "Period_1": "Saranya",
        "Period_2": "Anju",
        "Period_3": "Free",
        "Period_4": "Lakshmi",
        "Period_5": "Mary",
        "Period_6": "Priya",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "5Y",
        "Day": "Thursday",
        "Period_1": "Free",
        "Period_2": "Shanthi",
        "Period_3": "Free",
        "Period_4": "Vasudevan",
        "Period_5": "Free",
        "Period_6": "Radha",
        "Period_7": "Rajesh",
        "Period_8": "Free"
    },
    {
        "Class": "5B",
        "Day": "Thursday",
        "Period_1": "Selvi",
        "Period_2": "Lakshmi",
        "Period_3": "Saranya",
        "Period_4": "Anju",
        "Period_5": "Radha",
        "Period_6": "Selvi",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "6Y",
        "Day": "Thursday",
        "Period_1": "Kumar",
        "Period_2": "Free",
        "Period_3": "Vennila",
        "Period_4": "Arul",
        "Period_5": "Raman",
        "Period_6": "Kavitha",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "6B",
        "Day": "Thursday",
        "Period_1": "Lakshmi",
        "Period_2": "Free",
        "Period_3": "Murugan",
        "Period_4": "Free",
        "Period_5": "Selvi",
        "Period_6": "Kanchana",
        "Period_7": "Kavitha",
        "Period_8": "Raman"
    },
    {
        "Class": "7Y",
        "Day": "Thursday",
        "Period_1": "Krishnan",
        "Period_2": "Gopal",
        "Period_3": "Arul",
        "Period_4": "Gopal",
        "Period_5": "Devi",
        "Period_6": "Baskar",
        "Period_7": "Mary",
        "Period_8": "Devi"
    },
    {
        "Class": "7G",
        "Day": "Thursday",
        "Period_1": "Free",
        "Period_2": "Selvi",
        "Period_3": "Radha",
        "Period_4": "Venkatesh",
        "Period_5": "Free",
        "Period_6": "Free",
        "Period_7": "Kanchana",
        "Period_8": "Mythili"
    },
    {
        "Class": "8Y",
        "Day": "Thursday",
        "Period_1": "Baskar",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Free",
        "Period_5": "Vasudevan",
        "Period_6": "Raman",
        "Period_7": "Free",
        "Period_8": "Murugan"
    },
    {
        "Class": "8G",
        "Day": "Thursday",
        "Period_1": "Anitha",
        "Period_2": "Free",
        "Period_3": "John",
        "Period_4": "Kanchana",
        "Period_5": "Murugan",
        "Period_6": "Murugan",
        "Period_7": "Saritha",
        "Period_8": "Vasudevan"
    },
    {
        "Class": "9Y",
        "Day": "Thursday",
        "Period_1": "Mythili",
        "Period_2": "Free",
        "Period_3": "Kumar",
        "Period_4": "Free",
        "Period_5": "Vennila",
        "Period_6": "Arul",
        "Period_7": "Raman",
        "Period_8": "Venkatesh"
    },
    {
        "Class": "9B",
        "Day": "Thursday",
        "Period_1": "Murugan",
        "Period_2": "Vasudevan",
        "Period_3": "Vasudevan",
        "Period_4": "Kumar",
        "Period_5": "Free",
        "Period_6": "Shanthi",
        "Period_7": "Gopal",
        "Period_8": "Arul"
    },
    {
        "Class": "10Y",
        "Day": "Thursday",
        "Period_1": "Venkatesh",
        "Period_2": "Free",
        "Period_3": "Free",
        "Period_4": "Mary",
        "Period_5": "Anju",
        "Period_6": "Gopal",
        "Period_7": "Vennila",
        "Period_8": "Kanchana"
    },
    {
        "Class": "10G",
        "Day": "Thursday",
        "Period_1": "Arul",
        "Period_2": "Murugan",
        "Period_3": "Anitha",
        "Period_4": "Free",
        "Period_5": "Kanchana",
        "Period_6": "Venkatesh",
        "Period_7": "Devi",
        "Period_8": "Selvi"
    },
    {
        "Class": "10B",
        "Day": "Thursday",
        "Period_1": "Free",
        "Period_2": "Mary",
        "Period_3": "Kavitha",
        "Period_4": "Free",
        "Period_5": "Kavitha",
        "Period_6": "Mary",
        "Period_7": "Venkatesh",
        "Period_8": "Mary"
    },
    {
        "Class": "11-G1",
        "Day": "Thursday",
        "Period_1": "Free",
        "Period_2": "Rajesh",
        "Period_3": "Free",
        "Period_4": "Priya",
        "Period_5": "Venkatesh",
        "Period_6": "Mythili",
        "Period_7": "Deepak",
        "Period_8": "Gopal"
    },
    {
        "Class": "11-G2",
        "Day": "Thursday",
        "Period_1": "Kanchana",
        "Period_2": "Priya",
        "Period_3": "Priya",
        "Period_4": "Srinivasan",
        "Period_5": "Arul",
        "Period_6": "Free",
        "Period_7": "Anju",
        "Period_8": "Deepak"
    },
    {
        "Class": "11-G3",
        "Day": "Thursday",
        "Period_1": "Rajesh",
        "Period_2": "Kanchana",
        "Period_3": "Venkatesh",
        "Period_4": "Baskar",
        "Period_5": "Baskar",
        "Period_6": "Rajesh",
        "Period_7": "Priya",
        "Period_8": "Srinivasan"
    },
    {
        "Class": "11-G4",
        "Day": "Thursday",
        "Period_1": "Raman",
        "Period_2": "Krishnan",
        "Period_3": "Free",
        "Period_4": "Meena",
        "Period_5": "Free",
        "Period_6": "Meena",
        "Period_7": "John",
        "Period_8": "Anju"
    },
    {
        "Class": "12-G1",
        "Day": "Thursday",
        "Period_1": "Priya",
        "Period_2": "Deepak",
        "Period_3": "Baskar",
        "Period_4": "Raman",
        "Period_5": "Lakshmi",
        "Period_6": "Deepak",
        "Period_7": "Srinivasan",
        "Period_8": "Lakshmi"
    },
    {
        "Class": "12-G2",
        "Day": "Thursday",
        "Period_1": "Saritha",
        "Period_2": "Baskar",
        "Period_3": "Raman",
        "Period_4": "Murugan",
        "Period_5": "Mythili",
        "Period_6": "Anju",
        "Period_7": "Radha",
        "Period_8": "Baskar"
    },
    {
        "Class": "12-G3",
        "Day": "Thursday",
        "Period_1": "Deepak",
        "Period_2": "Mythili",
        "Period_3": "Mary",
        "Period_4": "Devi",
        "Period_5": "Free",
        "Period_6": "Ramachandran",
        "Period_7": "Lakshmi",
        "Period_8": "Rajesh"
    },
    {
        "Class": "12-G5",
        "Day": "Thursday",
        "Period_1": "Meena",
        "Period_2": "Free",
        "Period_3": "Meena",
        "Period_4": "Krishnan",
        "Period_5": "Krishnan",
        "Period_6": "Anitha",
        "Period_7": "Meena",
        "Period_8": "Ramachandran"
    },
    {
        "Class": "1Y",
        "Day": "Friday",
        "Period_1": "Mary",
        "Period_2": "Shanthi",
        "Period_3": "Raman",
        "Period_4": "Anitha",
        "Period_5": "Saranya",
        "Period_6": "Murugan",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "1B",
        "Day": "Friday",
        "Period_1": "Free",
        "Period_2": "Gopal",
        "Period_3": "Free",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Raman",
        "Period_7": "Lakshmi",
        "Period_8": "Free"
    },
    {
        "Class": "2Y",
        "Day": "Friday",
        "Period_1": "Radha",
        "Period_2": "Free",
        "Period_3": "Mary",
        "Period_4": "Free",
        "Period_5": "Kavitha",
        "Period_6": "Free",
        "Period_7": "Shanthi",
        "Period_8": "Free"
    },
    {
        "Class": "2B",
        "Day": "Friday",
        "Period_1": "Vasudevan",
        "Period_2": "Saranya",
        "Period_3": "Free",
        "Period_4": "Kavitha",
        "Period_5": "Free",
        "Period_6": "Free",
        "Period_7": "Selvi",
        "Period_8": "Free"
    },
    {
        "Class": "3Y",
        "Day": "Friday",
        "Period_1": "Saranya",
        "Period_2": "Meena",
        "Period_3": "Kanchana",
        "Period_4": "Devi",
        "Period_5": "Shanthi",
        "Period_6": "Free",
        "Period_7": "Priya",
        "Period_8": "Free"
    },
    {
        "Class": "3B",
        "Day": "Friday",
        "Period_1": "Free",
        "Period_2": "Kavitha",
        "Period_3": "Gopal",
        "Period_4": "Murugan",
        "Period_5": "Free",
        "Period_6": "Mary",
        "Period_7": "Saranya",
        "Period_8": "Free"
    },
    {
        "Class": "4Y",
        "Day": "Friday",
        "Period_1": "Anju",
        "Period_2": "Murugan",
        "Period_3": "Saranya",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Kavitha",
        "Period_7": "Kanchana",
        "Period_8": "Free"
    },
    {
        "Class": "4B",
        "Day": "Friday",
        "Period_1": "Selvi",
        "Period_2": "Mary",
        "Period_3": "Srinivasan",
        "Period_4": "Venkatesh",
        "Period_5": "Devi",
        "Period_6": "Arul",
        "Period_7": "Kavitha",
        "Period_8": "Free"
    },
    {
        "Class": "5Y",
        "Day": "Friday",
        "Period_1": "Venkatesh",
        "Period_2": "Arul",
        "Period_3": "Arul",
        "Period_4": "Free",
        "Period_5": "Meena",
        "Period_6": "Free",
        "Period_7": "John",
        "Period_8": "Free"
    },
    {
        "Class": "5B",
        "Day": "Friday",
        "Period_1": "Kanchana",
        "Period_2": "Anju",
        "Period_3": "Shanthi",
        "Period_4": "Ramachandran",
        "Period_5": "Murugan",
        "Period_6": "Free",
        "Period_7": "Venkatesh",
        "Period_8": "Free"
    },
    {
        "Class": "6Y",
        "Day": "Friday",
        "Period_1": "Murugan",
        "Period_2": "Kumar",
        "Period_3": "Rajesh",
        "Period_4": "Selvi",
        "Period_5": "Vennila",
        "Period_6": "Selvi",
        "Period_7": "Free",
        "Period_8": "Free"
    },
    {
        "Class": "6B",
        "Day": "Friday",
        "Period_1": "Devi",
        "Period_2": "Devi",
        "Period_3": "Kumar",
        "Period_4": "Kanchana",
        "Period_5": "Saritha",
        "Period_6": "Free",
        "Period_7": "Ramachandran",
        "Period_8": "Free"
    },
    {
        "Class": "7Y",
        "Day": "Friday",
        "Period_1": "Anitha",
        "Period_2": "Raman",
        "Period_3": "Selvi",
        "Period_4": "Saritha",
        "Period_5": "Kumar",
        "Period_6": "Free",
        "Period_7": "Arul",
        "Period_8": "Devi"
    },
    {
        "Class": "7G",
        "Day": "Friday",
        "Period_1": "Vennila",
        "Period_2": "Free",
        "Period_3": "Anitha",
        "Period_4": "Raman",
        "Period_5": "Kanchana",
        "Period_6": "Anitha",
        "Period_7": "Vennila",
        "Period_8": "Radha"
    },
    {
        "Class": "8Y",
        "Day": "Friday",
        "Period_1": "Kumar",
        "Period_2": "Vennila",
        "Period_3": "Kavitha",
        "Period_4": "Free",
        "Period_5": "Free",
        "Period_6": "Anju",
        "Period_7": "Srinivasan",
        "Period_8": "Free"
    },
    {
        "Class": "8G",
        "Day": "Friday",
        "Period_1": "Arul",
        "Period_2": "Vasudevan",
        "Period_3": "Devi",
        "Period_4": "Gopal",
        "Period_5": "Ramachandran",
        "Period_6": "Kumar",
        "Period_7": "Murugan",
        "Period_8": "Free"
    },
    {
        "Class": "9Y",
        "Day": "Friday",
        "Period_1": "Free",
        "Period_2": "Radha",
        "Period_3": "Baskar",
        "Period_4": "Radha",
        "Period_5": "Arul",
        "Period_6": "Vasudevan",
        "Period_7": "Saritha",
        "Period_8": "Venkatesh"
    },
    {
        "Class": "9B",
        "Day": "Friday",
        "Period_1": "Saritha",
        "Period_2": "Lakshmi",
        "Period_3": "Lakshmi",
        "Period_4": "Anju",
        "Period_5": "Anju",
        "Period_6": "Gopal",
        "Period_7": "Kumar",
        "Period_8": "Vennila"
    },
    {
        "Class": "10Y",
        "Day": "Friday",
        "Period_1": "Baskar",
        "Period_2": "Free",
        "Period_3": "Murugan",
        "Period_4": "Mary",
        "Period_5": "Radha",
        "Period_6": "Vennila",
        "Period_7": "Free",
        "Period_8": "Raman"
    },
    {
        "Class": "10G",
        "Day": "Friday",
        "Period_1": "Kavitha",
        "Period_2": "Baskar",
        "Period_3": "Saritha",
        "Period_4": "Free",
        "Period_5": "Mary",
        "Period_6": "Devi",
        "Period_7": "Vasudevan",
        "Period_8": "Kavitha"
    },
    {
        "Class": "10B",
        "Day": "Friday",
        "Period_1": "Raman",
        "Period_2": "Free",
        "Period_3": "Meena",
        "Period_4": "Vennila",
        "Period_5": "Free",
        "Period_6": "Mythili",
        "Period_7": "Devi",
        "Period_8": "Free"
    },
    {
        "Class": "11-G1",
        "Day": "Friday",
        "Period_1": "Free",
        "Period_2": "Kanchana",
        "Period_3": "Anju",
        "Period_4": "Lakshmi",
        "Period_5": "Srinivasan",
        "Period_6": "Kanchana",
        "Period_7": "Gopal",
        "Period_8": "Deepak"
    },
    {
        "Class": "11-G2",
        "Day": "Friday",
        "Period_1": "Srinivasan",
        "Period_2": "Mythili",
        "Period_3": "Deepak",
        "Period_4": "Priya",
        "Period_5": "Baskar",
        "Period_6": "Meena",
        "Period_7": "Free",
        "Period_8": "Baskar"
    },
    {
        "Class": "11-G3",
        "Day": "Friday",
        "Period_1": "Mythili",
        "Period_2": "Srinivasan",
        "Period_3": "Venkatesh",
        "Period_4": "Mythili",
        "Period_5": "Venkatesh",
        "Period_6": "Free",
        "Period_7": "Mary",
        "Period_8": "Lakshmi"
    },
    {
        "Class": "11-G4",
        "Day": "Friday",
        "Period_1": "Krishnan",
        "Period_2": "Rajesh",
        "Period_3": "Krishnan",
        "Period_4": "Meena",
        "Period_5": "Free",
        "Period_6": "Saritha",
        "Period_7": "Raman",
        "Period_8": "Krishnan"
    },
    {
        "Class": "12-G1",
        "Day": "Friday",
        "Period_1": "Lakshmi",
        "Period_2": "Venkatesh",
        "Period_3": "Mythili",
        "Period_4": "Srinivasan",
        "Period_5": "Free",
        "Period_6": "Baskar",
        "Period_7": "Baskar",
        "Period_8": "Free"
    },
    {
        "Class": "12-G2",
        "Day": "Friday",
        "Period_1": "Gopal",
        "Period_2": "Anitha",
        "Period_3": "Free",
        "Period_4": "John",
        "Period_5": "Free",
        "Period_6": "Deepak",
        "Period_7": "Anitha",
        "Period_8": "Anitha"
    },
    {
        "Class": "12-G3",
        "Day": "Friday",
        "Period_1": "Free",
        "Period_2": "Priya",
        "Period_3": "Free",
        "Period_4": "Baskar",
        "Period_5": "Lakshmi",
        "Period_6": "Rajesh",
        "Period_7": "Rajesh",
        "Period_8": "Free"
    },
    {
        "Class": "12-G5",
        "Day": "Friday",
        "Period_1": "Ramachandran",
        "Period_2": "John",
        "Period_3": "John",
        "Period_4": "Free",
        "Period_5": "Anitha",
        "Period_6": "Krishnan",
        "Period_7": "Meena",
        "Period_8": "Gopal"
    }
];

let pool;

async function initDatabase() {
    if (process.env.DATABASE_URL) {
        console.log("Connecting directly using DATABASE_URL...");
        pool = new Pool({
            connectionString: process.env.DATABASE_URL,
            ssl: { rejectUnauthorized: false }
        });
    } else {
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
    }
    
    // Create tables
    await pool.query(`
        CREATE TABLE IF NOT EXISTS teachers (
            teacher_name VARCHAR(100) PRIMARY KEY,
            main_subject VARCHAR(100),
            max_periods_per_day INT DEFAULT 5,
            class_name VARCHAR(50),
            teacher_type VARCHAR(50) DEFAULT 'Class Teacher'
        )
    `);
    
    // Migrations for existing databases
    await pool.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS class_name VARCHAR(50)");
    await pool.query("ALTER TABLE teachers ADD COLUMN IF NOT EXISTS teacher_type VARCHAR(50) DEFAULT 'Class Teacher'");
    
    await pool.query(`
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
    `);
    
    await pool.query(`
        CREATE TABLE IF NOT EXISTS absentees (
            id SERIAL PRIMARY KEY,
            date DATE,
            teacher_name VARCHAR(100) REFERENCES teachers(teacher_name) ON DELETE CASCADE,
            absence_type VARCHAR(50),
            specific_periods_absent VARCHAR(200),
            status VARCHAR(50) DEFAULT 'Absent',
            UNIQUE (date, teacher_name)
        )
    `);
    
    await pool.query(`
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
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS classes (
            class_name VARCHAR(50) PRIMARY KEY
        )
    `);

    await pool.query(`
        CREATE TABLE IF NOT EXISTS subjects (
            subject_name VARCHAR(100) PRIMARY KEY
        )
    `);

    // Drop legacy primary key if exists to support multiple exceptions per teacher
    try {
        const pkCheck = await pool.query(`
            SELECT a.attname
            FROM   pg_index i
            JOIN   pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
            WHERE  i.indrelid = 'exceptions'::regclass AND i.indisprimary
        `);
        if (pkCheck.rows.length === 1 && pkCheck.rows[0].attname === 'teacher_name') {
            console.log("Migrating exceptions table: dropping primary key on teacher_name...");
            await pool.query("ALTER TABLE exceptions DROP CONSTRAINT IF EXISTS exceptions_pkey CASCADE");
        }
    } catch (e) {
        console.log("Exceptions PK migration check complete.");
    }

    await pool.query(`
        CREATE TABLE IF NOT EXISTS exceptions (
            id SERIAL PRIMARY KEY,
            teacher_name VARCHAR(100) REFERENCES teachers(teacher_name) ON DELETE CASCADE,
            except_timing VARCHAR(200) DEFAULT 'All',
            reason VARCHAR(200),
            added_on TIMESTAMP DEFAULT NOW()
        )
    `);
    await pool.query("ALTER TABLE exceptions ADD COLUMN IF NOT EXISTS id SERIAL PRIMARY KEY");
    await pool.query("ALTER TABLE exceptions ADD COLUMN IF NOT EXISTS except_timing VARCHAR(200) DEFAULT 'All'");

    await pool.query("DROP TABLE IF EXISTS period_timings");
    await pool.query(`
        CREATE TABLE IF NOT EXISTS period_timings (
            id SERIAL PRIMARY KEY,
            period_name VARCHAR(100) UNIQUE,
            start_time VARCHAR(20),
            end_time VARCHAR(20),
            description VARCHAR(100)
        )
    `);
    // Create users credentials table
    await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
            username VARCHAR(50) PRIMARY KEY,
            password VARCHAR(100) NOT NULL,
            role VARCHAR(20) NOT NULL
        )
    `);
    
    // Seed default users if empty
    const userCheck = await pool.query("SELECT COUNT(*) FROM users");
    if (parseInt(userCheck.rows[0].count, 10) === 0) {
        console.log("Seeding default users...");
        await pool.query("INSERT INTO users (username, password, role) VALUES ('admin', 'admin123', 'Admin')");
        await pool.query("INSERT INTO users (username, password, role) VALUES ('teacher', 'teacher123', 'Teacher')");
        console.log("Default users seeded.");
    }

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
                `INSERT INTO timetable 
                (class_name, day_name, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8) 
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
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

    const classCheck = await pool.query("SELECT COUNT(*) FROM classes");
    if (parseInt(classCheck.rows[0].count, 10) === 0) {
        console.log("Seeding classes from existing timetable...");
        await pool.query("INSERT INTO classes (class_name) SELECT DISTINCT class_name FROM timetable ON CONFLICT DO NOTHING");
        console.log("Classes seeded.");
    }

    const subjectCheck = await pool.query("SELECT COUNT(*) FROM subjects");
    if (parseInt(subjectCheck.rows[0].count, 10) === 0) {
        console.log("Seeding default subjects...");
        const defaultSubjects = [
            'Mathematics', 'Physics', 'Chemistry', 'Computer Science', 'English', 'Tamil', 
            'Science', 'Social Science', 'Accountancy', 'Business Studies', 'Economics', 
            'Moral Science', 'Physical Training', 'Drawing', 'Yoga'
        ];
        for (const sub of defaultSubjects) {
            await pool.query("INSERT INTO subjects (subject_name) VALUES ($1) ON CONFLICT DO NOTHING", [sub]);
        }
        console.log("Subjects seeded.");
    }

    const timingsCheck = await pool.query("SELECT COUNT(*) FROM period_timings");
    if (parseInt(timingsCheck.rows[0].count, 10) === 0) {
        console.log("Seeding default period timings...");
        const defaultTimes = [
            { name: 'Class Incharge', start: '08:45', end: '09:30', desc: 'Morning Roll Call' },
            { name: 'Period 1', start: '09:30', end: '10:15', desc: 'Class Hour' },
            { name: 'Period 2', start: '10:15', end: '11:00', desc: 'Class Hour' },
            { name: 'Morning Break', start: '11:00', end: '11:20', desc: '20 mins interval' },
            { name: 'Period 3', start: '11:20', end: '12:00', desc: 'Class Hour' },
            { name: 'Period 4', start: '12:00', end: '12:40', desc: 'Class Hour' },
            { name: 'Lunch Break', start: '12:40', end: '01:20', desc: '40 mins lunch break' },
            { name: 'Period 5', start: '01:20', end: '02:00', desc: 'Class Hour' },
            { name: 'Period 6', start: '02:00', end: '02:40', desc: 'Class Hour' },
            { name: 'Evening Break', start: '02:40', end: '02:50', desc: '10 mins interval' },
            { name: 'Period 7', start: '02:50', end: '03:30', desc: 'Class Hour' },
            { name: 'Period 8', start: '03:30', end: '04:05', desc: 'Class Hour' },
            { name: 'Diary / Games', start: '04:05', end: '05:30', desc: 'Activity & Departure' }
        ];
        for (const t of defaultTimes) {
            await pool.query(
                "INSERT INTO period_timings (period_name, start_time, end_time, description) VALUES ($1, $2, $3, $4)",
                [t.name, t.start, t.end, t.desc]
            );
        }
        console.log("Period timings seeded.");
    }
    
    console.log("Database initialization finished.");
}

// REST API Routes

// Get state: teachers, timetable, absentees, subLog for frontend
app.get('/api/state', async (req, res) => {
    try {
        const teachersRes = await pool.query("SELECT * FROM teachers ORDER BY teacher_name");
        const timetableRes = await pool.query("SELECT * FROM timetable ORDER BY class_name, day_name");
        const absenteesRes = await pool.query("SELECT id, TO_CHAR(date, 'YYYY-MM-DD') as date_str, teacher_name, absence_type, specific_periods_absent, status FROM absentees ORDER BY date, teacher_name");
        const subLogRes = await pool.query("SELECT id, TO_CHAR(date, 'YYYY-MM-DD') as date_str, day_name, period_num, class_name, subject_name, absent_teacher, substitute_teacher FROM sub_log ORDER BY date, period_num, class_name");
        const classesRes = await pool.query("SELECT * FROM classes ORDER BY class_name");
        const subjectsRes = await pool.query("SELECT * FROM subjects ORDER BY subject_name");
        const timingsRes = await pool.query("SELECT * FROM period_timings ORDER BY id");
        const exceptionsRes = await pool.query("SELECT id, teacher_name, except_timing, reason FROM exceptions ORDER BY teacher_name");
        
        const teachersData = teachersRes.rows.map(r => ({
            Teacher_Name: r.teacher_name,
            Main_Subject: r.main_subject,
            Max_Periods_Per_Day: String(r.max_periods_per_day),
            Class_Name: r.class_name,
            Teacher_Type: r.teacher_type
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
        
        const absenteesData = absenteesRes.rows.map(r => ({
            Date: r.date_str,
            Teacher_Name: r.teacher_name,
            Absence_Type: r.absence_type,
            Specific_Periods_Absent: r.specific_periods_absent,
            Status: r.status
        }));
        
        const subLogData = subLogRes.rows.map(r => ({
            Date: r.date_str,
            Day: r.day_name,
            Period: String(r.period_num),
            Class: r.class_name,
            Subject: r.subject_name,
            Absent_Teacher: r.absent_teacher,
            Substitute_Teacher: r.substitute_teacher
        }));

        const classesData = classesRes.rows.map(r => r.class_name);
        const subjectsData = subjectsRes.rows.map(r => r.subject_name);
        const timingsData = timingsRes.rows.map(r => ({
            id: r.id,
            period_name: r.period_name,
            start_time: r.start_time,
            end_time: r.end_time,
            description: r.description
        }));
        const exceptionsData = exceptionsRes.rows.map(r => ({
            id: r.id,
            Teacher_Name: r.teacher_name,
            Timing: r.except_timing || 'All',
            Reason: r.reason || ''
        }));
        
        res.json({
            teachers: teachersData,
            timetable: timetableData,
            absentees: absenteesData,
            subLog: subLogData,
            classes: classesData,
            subjects: subjectsData,
            timings: timingsData,
            exceptions: exceptionsData
        });
    } catch (err) {
        console.error("Error fetching state:", err);
        res.status(500).json({ error: err.message });
    }
});

// Authentication login endpoint
app.post('/api/login', async (req, res) => {
    const { Username, Password } = req.body;
    if (!Username || !Password) {
        return res.json({ success: false, message: 'Username and password are required' });
    }
    try {
        const result = await pool.query(
            "SELECT username, role FROM users WHERE LOWER(username) = $1 AND password = $2",
            [Username.trim().toLowerCase(), Password]
        );
        if (result.rows.length > 0) {
            res.json({ success: true, role: result.rows[0].role, username: result.rows[0].username });
        } else {
            res.json({ success: false, message: 'Invalid username or password' });
        }
    } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: err.message });
    }
});

// Get current users configuration (Settings credentials)
app.get('/api/settings/users', async (req, res) => {
    try {
        const result = await pool.query("SELECT username, role, password FROM users");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update credentials endpoint
app.post('/api/settings/update-credentials', async (req, res) => {
    const { Role, NewUsername, NewPassword } = req.body;
    if (!Role || !NewUsername || !NewPassword) {
        return res.status(400).json({ error: 'Role, Username and Password are required' });
    }
    try {
        await pool.query(
            "UPDATE users SET username = $1, password = $2 WHERE role = $3",
            [NewUsername.trim(), NewPassword, Role]
        );
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add teacher absence
app.post('/api/absentees', async (req, res) => {
    const { Date: dateStr, Teacher_Name, Absence_Type, Specific_Periods_Absent } = req.body;
    try {
        await pool.query(
            `INSERT INTO absentees (date, teacher_name, absence_type, specific_periods_absent, status)
             VALUES ($1, $2, $3, $4, 'Absent')
             ON CONFLICT (date, teacher_name) 
             DO UPDATE SET absence_type = $3, specific_periods_absent = $4, status = 'Absent'`,
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
    const { Teacher_Name, Main_Subject, Max_Periods_Per_Day, Class_Name, Teacher_Type, isEdit } = req.body;
    try {
        if (isEdit) {
            await pool.query(
                "UPDATE teachers SET main_subject = $1, max_periods_per_day = $2, class_name = $3, teacher_type = $4 WHERE teacher_name = $5",
                [Main_Subject, parseInt(Max_Periods_Per_Day, 10), Class_Name, Teacher_Type, Teacher_Name]
            );
        } else {
            await pool.query(
                "INSERT INTO teachers (teacher_name, main_subject, max_periods_per_day, class_name, teacher_type) VALUES ($1, $2, $3, $4, $5)",
                [Teacher_Name, Main_Subject, parseInt(Max_Periods_Per_Day, 10), Class_Name, Teacher_Type]
            );
        }
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
                `UPDATE timetable SET period_${p} = 'Free' WHERE period_${p} = $1`,
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

// Add new class
app.post('/api/classes', async (req, res) => {
    const { Class_Name } = req.body;
    try {
        await pool.query("BEGIN");
        await pool.query("INSERT INTO classes (class_name) VALUES ($1)", [Class_Name]);
        
        // Initialize Monday to Friday timetable records for this class
        const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
        for (const d of days) {
            await pool.query(
                `INSERT INTO timetable 
                 (class_name, day_name, period_1, period_2, period_3, period_4, period_5, period_6, period_7, period_8) 
                 VALUES ($1, $2, 'Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free', 'Free')`,
                [Class_Name, d]
            );
        }
        await pool.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        await pool.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    }
});

// Delete class
app.delete('/api/classes', async (req, res) => {
    const { Class_Name } = req.query;
    try {
        await pool.query("BEGIN");
        await pool.query("DELETE FROM classes WHERE class_name = $1", [Class_Name]);
        await pool.query("DELETE FROM timetable WHERE class_name = $1", [Class_Name]);
        await pool.query("DELETE FROM sub_log WHERE class_name = $1", [Class_Name]);
        await pool.query("COMMIT");
        res.json({ success: true });
    } catch (err) {
        await pool.query("ROLLBACK");
        res.status(500).json({ error: err.message });
    }
});

// Add subject
app.post('/api/subjects', async (req, res) => {
    const { Subject_Name } = req.body;
    try {
        await pool.query("INSERT INTO subjects (subject_name) VALUES ($1)", [Subject_Name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete subject
app.delete('/api/subjects', async (req, res) => {
    const { Subject_Name } = req.query;
    try {
        await pool.query("DELETE FROM subjects WHERE subject_name = $1", [Subject_Name]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Add/Update period timing slot
app.post('/api/timings', async (req, res) => {
    const { id, period_name, start_time, end_time, description } = req.body;
    try {
        if (id) {
            await pool.query(
                "UPDATE period_timings SET period_name = $1, start_time = $2, end_time = $3, description = $4 WHERE id = $5",
                [period_name, start_time, end_time, description, parseInt(id, 10)]
            );
        } else {
            await pool.query(
                "INSERT INTO period_timings (period_name, start_time, end_time, description) VALUES ($1, $2, $3, $4)",
                [period_name, start_time, end_time, description]
            );
        }
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete period timing slot
app.delete('/api/timings', async (req, res) => {
    const { id } = req.query;
    try {
        await pool.query("DELETE FROM period_timings WHERE id = $1", [parseInt(id, 10)]);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// --- EXCEPTIONS API ---
// Get all exceptions
app.get('/api/exceptions', async (req, res) => {
    try {
        const result = await pool.query("SELECT id, teacher_name, except_timing, reason FROM exceptions ORDER BY teacher_name");
        res.json(result.rows);
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Add teacher to exceptions
app.post('/api/exceptions', async (req, res) => {
    const { Teacher_Name, Timing, Reason } = req.body;
    try {
        // Prevent duplicate exact teacher+timing combination
        const check = await pool.query(
            "SELECT 1 FROM exceptions WHERE teacher_name = $1 AND except_timing = $2",
            [Teacher_Name, Timing || 'All']
        );
        if (check.rowCount === 0) {
            await pool.query(
                "INSERT INTO exceptions (teacher_name, except_timing, reason) VALUES ($1, $2, $3)",
                [Teacher_Name, Timing || 'All', Reason || '']
            );
        } else {
            await pool.query(
                "UPDATE exceptions SET reason = $3 WHERE teacher_name = $1 AND except_timing = $2",
                [Teacher_Name, Timing || 'All', Reason || '']
            );
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Remove teacher from exceptions
app.delete('/api/exceptions', async (req, res) => {
    const { id } = req.query;
    try {
        await pool.query("DELETE FROM exceptions WHERE id = $1", [parseInt(id, 10)]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// Update cell in timetable
app.post('/api/timetable/cell', async (req, res) => {
    const { Class, Day, Period, Value } = req.body;
    try {
        await pool.query(
            `UPDATE timetable SET period_${Period} = $1 WHERE class_name = $2 AND day_name = $3`,
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
            `UPDATE sub_log SET substitute_teacher = $1 
             WHERE class_name = $2 AND period_num = $3 AND date = $4`,
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
        const exceptionsRes = await pool.query("SELECT teacher_name, except_timing FROM exceptions");
        const exceptedMap = {};
        exceptionsRes.rows.forEach(r => {
            exceptedMap[r.teacher_name] = r.except_timing || 'All';
        });
        
        const teachersMap = teachersRes.rows;
        const timetableMap = timetableRes.rows;
        const absentNames = absenteesRes.rows.map(r => r.teacher_name);
        
        await pool.query("DELETE FROM sub_log WHERE date = $1", [dateStr]);
        
        const requirements = [];
        
        // 1. Core period class substitutions (1 to 8)
        timetableMap.forEach(row => {
            if (row.day_name === day) {
                for (let p = 1; p <= 8; p++) {
                    const key = `period_${p}`;
                    const teacher = row[key];
                    if (teacher && teacher !== 'Free' && absentNames.includes(teacher)) {
                        const isAbsent = isTeacherAbsentForPeriod(absenteesRes.rows, teacher, p);
                        if (isAbsent) {
                            // If absent teacher is excepted for this specific period — skip creating requirement (no sub assigned)
                            if (exceptedMap.hasOwnProperty(teacher) && isPeriodCoveredByTiming(exceptedMap[teacher], p)) {
                                return;
                            }
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
        // 2. Supervision slots (Class Incharge, Breaks, Lunch, Games) for absent Class Teachers
        absenteesRes.rows.forEach(absentee => {
            const name = absentee.teacher_name;
            const record = teachersMap.find(t => t.teacher_name === name);
            if (record && record.teacher_type === 'Class Teacher' && record.class_name) {
                const specialPeriods = [0, 9, 10, 11, 12];
                specialPeriods.forEach(sp => {
                    if (isAbsentForSupervision(absentee, sp)) {
                        // Skip supervision requirement if excepted for this specific slot
                        if (exceptedMap.hasOwnProperty(name) && isPeriodCoveredByTiming(exceptedMap[name], sp)) {
                            return;
                        }
                        requirements.push({
                            class: record.class_name,
                            day: day,
                            date: dateStr,
                            period: sp,
                            absentTeacher: name,
                            subject: 'Supervision'
                        });
                    }
                });
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
            // Pass exceptedMap so excepted teachers are not picked as substitutes for their excepted periods
            const sub = findSubstituteForPeriod(req, activeSubs, teachersMap, timetableMap, absenteesRes.rows, exceptedMap);
            await pool.query(
                `INSERT INTO sub_log 
                (date, day_name, period_num, class_name, subject_name, absent_teacher, substitute_teacher)
                VALUES ($1, $2, $3, $4, $5, $6, $7)
                ON CONFLICT (date, period_num, class_name)
                DO UPDATE SET substitute_teacher = $7`,
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

function isPeriodCoveredByTiming(timingStr, period) {
    if (!timingStr) return true; // Default to 'All'
    const normalized = timingStr.trim().toLowerCase();
    if (normalized === 'all' || normalized === 'all periods' || normalized === '') return true;

    // Map supervision periods to names
    const periodNamesMap = {
        0: ['class incharge', 'incharge', 'morning roll call', 'roll call', '0'],
        9: ['morning break', 'break 1', 'interval 1', '9'],
        10: ['lunch break', 'lunch', '10'],
        11: ['evening break', 'break 2', 'interval 2', '11'],
        12: ['games', 'diary', 'activity', 'departure', '12']
    };

    // If it's a supervision period
    if (periodNamesMap[period]) {
        return periodNamesMap[period].some(term => normalized.includes(term));
    }

    // Otherwise it's a teaching period 1-8
    // Check if the timingStr explicitly specifies this period (e.g. "P1", "Period 1", "P1-P3", "1,2", "1-4")
    // First remove prefix 'period' or 'p' to make parsing cleaner
    const cleaned = normalized.replace(/\bperiod\b/g, '').replace(/\bp\b/g, '');
    
    // Check ranges like "1-4"
    const rangeMatch = cleaned.match(/(\d+)\s*-\s*(\d+)/);
    if (rangeMatch) {
        const start = parseInt(rangeMatch[1], 10);
        const end = parseInt(rangeMatch[2], 10);
        if (period >= start && period <= end) return true;
    }

    // Check list of numbers like "1, 2, 3" or single number "2"
    const numbers = cleaned.match(/\d+/g);
    if (numbers) {
        const parsedNums = numbers.map(Number);
        if (parsedNums.includes(period)) return true;
    }

    return false;
}

function isAbsentForSupervision(absenceRecord, supervisionPeriod) {
    if (!absenceRecord) return false;
    const type = absenceRecord.absence_type;
    if (type === 'Full Day') return true;
    
    // Map supervision periods to representative teaching periods:
    // 0 (Class Incharge) -> Period 1
    // 9 (Morning Break) -> Period 2
    // 10 (Lunch Break) -> Period 4
    // 11 (Evening Break) -> Period 6
    // 12 (Diary / Games) -> Period 8
    let checkPeriod = 1;
    if (supervisionPeriod === 0) checkPeriod = 1;
    if (supervisionPeriod === 9) checkPeriod = 2;
    if (supervisionPeriod === 10) checkPeriod = 4;
    if (supervisionPeriod === 11) checkPeriod = 6;
    if (supervisionPeriod === 12) checkPeriod = 8;
    
    return isTeacherAbsentForPeriod([absenceRecord], absenceRecord.teacher_name, checkPeriod);
}

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
    
    const numbers = normalized.match(/\d+/g);
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
        schedule[`Period_${p}`] = 'Free';
    }
    
    timetable.forEach(row => {
        if (row.day_name === day) {
            for (let p = 1; p <= 8; p++) {
                const key = `period_${p}`;
                if (row[key] === name) {
                    schedule[`Period_${p}`] = row.class_name;
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
        if (schedule[`Period_${p}`] !== 'Free') count++;
    }
    const subsToday = activeSubs.filter(row => row.Date === date && row.Substitute_Teacher === name);
    count += subsToday.length;
    return count;
}

function findSubstituteForPeriod(req, activeSubs, teachers, timetable, absentees, exceptedMap = {}) {
    const { day, date, period, absentTeacher, subject } = req;
    const isSupervision = [0, 9, 10, 11, 12].includes(period);
    const periodKey = `Period_${period}`;
    
    const candidates = [];
    
    teachers.forEach(teacherRecord => {
        const name = teacherRecord.teacher_name;
        if (!name || name === absentTeacher) return;
        
        // Skip teachers who are in the exceptions list for this period
        if (exceptedMap.hasOwnProperty(name) && isPeriodCoveredByTiming(exceptedMap[name], period)) return;
        
        // 1. Check if the candidate is absent
        if (isSupervision) {
            const absRecord = absentees.find(r => r.teacher_name === name);
            if (absRecord && isAbsentForSupervision(absRecord, period)) return;
        } else {
            if (isTeacherAbsentForPeriod(absentees, name, period)) return;
        }
        
        // 2. Class Type validation
        if (isSupervision) {
            // Only Non Class Teachers can do break supervision duties
            if (teacherRecord.teacher_type !== 'Non Class Teacher') return;
        }
        
        // 3. Conflict checks
        if (!isSupervision) {
            const originalSchedule = getTeacherDailySchedule(timetable, name, day);
            if (originalSchedule[periodKey] !== 'Free') return;
        }
        
        // 4. Double booking (already subbing this same slot today)
        const isSubbingThisPeriod = activeSubs.some(row => 
            row.Date === date && 
            row.Period === String(period) && 
            row.Substitute_Teacher === name
        );
        if (isSubbingThisPeriod) return;

        // 5. Normal class rule filters (only for standard teaching periods 1-8)
        let hasSubbedToday = false;
        let hasAdjacentClass = false;
        let workload = 0;
        let maxCapacity = 5;
        let isSubjectMatch = false;
        
        if (!isSupervision) {
            hasSubbedToday = activeSubs.some(row => 
                row.Date === date && 
                row.Substitute_Teacher === name
            );
            
            const originalSchedule = getTeacherDailySchedule(timetable, name, day);
            const checkPeriods = [];
            if (period > 1) checkPeriods.push(period - 1);
            if (period < 8) checkPeriods.push(period + 1);
            
            for (const adjPeriod of checkPeriods) {
                const adjPeriodKey = `Period_${adjPeriod}`;
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
            
            workload = calculateWorkload(teachers, timetable, name, day, date, activeSubs);
            maxCapacity = getTeacherMaxCapacity(teachers, name);
            if (workload >= maxCapacity) return;
            
            isSubjectMatch = teacherRecord.main_subject === subject;
        }
        
        candidates.push({
            name,
            workload,
            hasSubbedToday,
            hasAdjacentClass,
            isSubjectMatch
        });
    });
    
    // Filters and prioritization
    let filtered = candidates;
    if (!isSupervision) {
        filtered = candidates.filter(c => !c.hasSubbedToday && !c.hasAdjacentClass);
        if (filtered.length === 0) {
            filtered = candidates.filter(c => !c.hasSubbedToday);
        }
        if (filtered.length === 0) {
            filtered = candidates.filter(c => !c.hasAdjacentClass);
        }
        if (filtered.length === 0) {
            filtered = candidates;
        }
    }
    
    if (filtered.length === 0) return 'MANUAL INTERVENTION REQUIRED';
    
    if (!isSupervision) {
        filtered.sort((a, b) => {
            if (a.isSubjectMatch && !b.isSubjectMatch) return -1;
            if (!a.isSubjectMatch && b.isSubjectMatch) return 1;
            return a.workload - b.workload;
        });
    } else {
        // Balance break duty supervision load among available Non Class Teachers
        filtered.sort((a, b) => {
            const countA = activeSubs.filter(row => row.Date === date && row.Substitute_Teacher === a.name).length;
            const countB = activeSubs.filter(row => row.Date === date && row.Substitute_Teacher === b.name).length;
            return countA - countB;
        });
    }
    
    return filtered[0].name;
}

// Start Server after DB check
initDatabase().then(() => {
    app.listen(PORT, () => {
        console.log(`Backend server running at http://localhost:${PORT}`);
        console.log(`Open your browser at http://localhost:${PORT} to access the dashboard!`);
    });
}).catch(err => {
    console.error("Failed to initialize database:", err);
});
