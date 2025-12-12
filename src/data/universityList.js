// s:\project\smart-notes-backend\src\data\universityList.js

const commonCourses = ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA", "M.Tech"];
const techCourses = ["B.Tech", "M.Tech", "BCA", "MCA"];
const medicalCourses = ["MBBS", "BDS", "B.Pharma"];
const lawCourses = ["LLB", "BA LLB", "LLM"];

const universityList = [
    // --- Uttar Pradesh ---
    {
        state: "Uttar Pradesh",
        universities: [
            { name: "University of Lucknow", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA", "M.Com"] },
            { name: "Banaras Hindu University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA", "M.Tech"] },
            { name: "Aligarh Muslim University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA", "LLB"] },
            { name: "University of Allahabad", courses: ["B.Com", "B.A.", "B.Sc", "LLB"] },
            { name: "Chhatrapati Shahu Ji Maharaj University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA"] },
            { name: "Deen Dayal Upadhyaya Gorakhpur University", courses: ["BBA", "B.Com", "B.A.", "B.Sc"] },
            { name: "Dr. A.P.J. Abdul Kalam Technical University", courses: ["B.Tech", "M.Tech", "MBA", "MCA"] },
            { name: "Dr. Ram Manohar Lohia Avadh University", courses: ["BBA", "B.Com", "B.A.", "B.Sc"] },
            { name: "Bundelkhand University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA"] },
            { name: "Chaudhary Charan Singh University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc"] },
            { name: "Mahatma Jyotiba Phule Rohilkhand University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc"] },
            { name: "Sampurnanand Sanskrit Vishwavidyalaya", courses: ["Shastri", "Acharya"] },
            { name: "King George's Medical University", courses: ["MBBS", "BDS", "MD", "MS"] },
            { name: "Madan Mohan Malaviya University of Technology", courses: ["B.Tech", "BBA", "MBA", "M.Tech"] },
            { name: "Amity University, Noida", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "B.Arch"] },
            { name: "Sharda University, Greater Noida", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "MBBS"] },
            { name: "Galgotias University, Greater Noida", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "LLB"] },
            { name: "GLA University, Mathura", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "BCA"] },
            { name: "Shiv Nadar University, Greater Noida", courses: ["B.Tech", "BBA", "B.A.", "B.Sc", "MBA"] },
            { name: "Bennett University, Greater Noida", courses: ["B.Tech", "BBA", "B.A.", "LLB", "MBA"] },
            { name: "Integral University, Lucknow", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA"] },
            { name: "Mangalayatan University, Aligarh", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA"] },
            { name: "Shri Ramswaroop Memorial University, Barabanki", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA"] }
        ]
    },

    // --- Delhi ---
    {
        state: "Delhi",
        universities: [
            { name: "University of Delhi", courses: ["B.Com", "B.A.", "B.Sc", "MA", "M.Com"] },
            { name: "Jawaharlal Nehru University", courses: ["B.A.", "MA", "M.Phil", "Ph.D"] },
            { name: "Jamia Millia Islamia", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "B.Arch"] },
            { name: "Guru Gobind Singh Indraprastha University", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "LLB"] },
            { name: "Delhi Technological University", courses: ["B.Tech", "M.Tech", "MBA", "BBA"] },
            { name: "Netaji Subhas University of Technology", courses: ["B.Tech", "M.Tech", "MBA", "BBA"] },
            { name: "Indira Gandhi Delhi Technical University for Women", courses: ["B.Tech", "M.Tech", "B.Arch"] },
            { name: "Ambedkar University Delhi", courses: ["B.A.", "MA", "MBA"] },
            { name: "National Law University, Delhi", courses: ["BA LLB", "LLM", "Ph.D"] },
            { name: "Indraprastha Institute of Information Technology, Delhi", courses: ["B.Tech", "M.Tech", "Ph.D"] },
            { name: "TERI School of Advanced Studies", courses: ["M.Sc", "MBA", "M.Tech", "Ph.D"] }
        ]
    },

    // --- Uttarakhand ---
    {
        state: "Uttarakhand",
        universities: [
            { name: "Kumaun University, Nainital", courses: commonCourses },
            { name: "H.N.B. Garhwal University, Srinagar", courses: commonCourses },
            { name: "Doon University, Dehradun", courses: ["BBA", "B.A.", "B.Com", "MBA", "MA"] },
            { name: "Uttarakhand Technical University, Dehradun", courses: ["B.Tech", "M.Tech", "MBA", "B.Pharma"] },
            { name: "G.B. Pant University of Agriculture and Technology, Pantnagar", courses: ["B.Tech", "B.Sc Agriculture", "M.Tech", "MBA"] },
            { name: "Uttarakhand Open University, Haldwani", courses: ["BBA", "B.Com", "B.A.", "MBA", "MA"] },
            { name: "Veer Chandra Singh Garhwali Government Institute of Medical Science and Research, Srinagar", courses: medicalCourses },
            { name: "University of Petroleum and Energy Studies (UPES), Dehradun", courses: ["B.Tech", "BBA", "B.A.", "LLB", "MBA", "B.Des"] },
            { name: "DIT University, Dehradun", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "B.Arch"] },
            { name: "Graphic Era University, Dehradun", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "HM"] },
            { name: "Uttaranchal University, Dehradun", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "LLB", "MBA"] },
            { name: "Himgiri Zee University, Dehradun", courses: commonCourses },
            { name: "ICFAI University, Dehradun", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "LLB", "MBA"] },
            { name: "Swami Rama Himalayan University, Dehradun", courses: ["MBBS", "B.Tech", "BBA", "B.Sc"] }
        ]
    },

    // --- Rajasthan ---
    {
        state: "Rajasthan",
        universities: [
            { name: "University of Rajasthan, Jaipur", courses: ["BBA", "B.Com", "B.A.", "B.Sc", "MBA", "LLB"] },
            { name: "Jai Narain Vyas University, Jodhpur", courses: ["B.Com", "B.A.", "B.Sc", "LLB", "MBA"] },
            { name: "Mohanlal Sukhadia University, Udaipur", courses: ["B.Com", "B.A.", "B.Sc", "LLB", "MBA"] },
            { name: "Maharshi Dayanand Saraswati University, Ajmer", courses: ["B.Com", "B.A.", "B.Sc", "MBA"] },
            { name: "Rajasthan Technical University, Kota", courses: ["B.Tech", "M.Tech", "MBA", "MCA"] },
            { name: "Birla Institute of Technology and Science (BITS), Pilani", courses: ["B.Tech", "B.Pharm", "M.Sc", "MBA"] },
            { name: "Manipal University, Jaipur", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Arch", "MBA"] },
            { name: "Amity University, Jaipur", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "LLB"] },
            { name: "The LNM Institute of Information and Technology, Jaipur", courses: ["B.Tech", "M.Tech", "M.Sc", "Ph.D"] },
            { name: "JK Lakshmipat University, Jaipur", courses: ["B.Tech", "BBA", "B.Des", "MBA"] },
            { name: "Poornima University, Jaipur", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Arch", "MBA"] },
            { name: "Suresh Gyan Vihar University, Jaipur", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Pharm", "MBA"] }
        ]
    },

    // --- Gujarat ---
    {
        state: "Gujarat",
        universities: [
            { name: "Gujarat University, Ahmedabad", courses: commonCourses },
            { name: "Maharaja Sayajirao University of Baroda, Vadodara", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA"] },
            { name: "Sardar Patel University, Vallabh Vidyanagar", courses: commonCourses },
            { name: "Saurashtra University, Rajkot", courses: commonCourses },
            { name: "Gujarat Technological University, Ahmedabad", courses: ["B.Tech", "M.Tech", "MBA", "MCA"] },
            { name: "Nirma University, Ahmedabad", courses: ["B.Tech", "BBA", "B.Com", "MBA", "LLB", "B.Arch"] },
            { name: "Pandit Deendayal Energy University, Gandhinagar", courses: ["B.Tech", "BBA", "B.Com", "B.Sc", "MBA", "M.Tech"] },
            { name: "CEPT University, Ahmedabad", courses: ["B.Arch", "B.Des", "B.Plan", "M.Arch"] },
            { name: "Adani University, Ahmedabad", courses: ["B.Tech", "MBA", "M.Tech"] },
            { name: "Marwadi University, Rajkot", courses: ["B.Tech", "BBA", "B.Com", "B.Sc", "MBA", "MCA"] },
            { name: "Parul University, Vadodara", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "B.Sc", "MBA", "MBBS"] }
        ]
    },

    // --- Maharashtra ---
    {
        state: "Maharashtra",
        universities: [
            { name: "University of Mumbai, Mumbai", courses: commonCourses },
            { name: "Savitribai Phule Pune University, Pune", courses: commonCourses },
            { name: "Rashtrasant Tukadoji Maharaj Nagpur University, Nagpur", courses: commonCourses },
            { name: "Dr. Babasaheb Ambedkar Marathwada University, Aurangabad", courses: commonCourses },
            { name: "Shivaji University, Kolhapur", courses: commonCourses },
            { name: "Institute of Chemical Technology, Mumbai", courses: ["B.Chem.Engg", "B.Tech", "M.Tech", "Ph.D"] },
            { name: "Symbiosis International (Deemed University), Pune", courses: ["BBA", "B.A.", "B.Sc", "LLB", "MBA", "B.Tech"] },
            { name: "NMIMS (Deemed to be University), Mumbai", courses: ["B.Tech", "BBA", "B.Com", "MBA", "B.Arch"] },
            { name: "MIT World Peace University, Pune", courses: ["B.Tech", "BBA", "B.Com", "B.Sc", "MBA", "M.Tech"] },
            { name: "Bharati Vidyapeeth (Deemed to be University), Pune", courses: ["B.Tech", "BBA", "B.Com", "MBA", "LLB", "MBBS"] },
            { name: "Flame University, Pune", courses: ["BBA", "B.A.", "B.Sc", "MBA"] }
        ]
    },

    // --- Madhya Pradesh ---
    {
        state: "Madhya Pradesh",
        universities: [
            { name: "Devi Ahilya Vishwavidyalaya, Indore", courses: commonCourses },
            { name: "Jiwaji University, Gwalior", courses: commonCourses },
            { name: "Barkatullah University, Bhopal", courses: commonCourses },
            { name: "Rani Durgavati Vishwavidyalaya, Jabalpur", courses: commonCourses },
            { name: "Amity University, Gwalior", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "LLB"] },
            { name: "Jagran Lakecity University, Bhopal", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "LLB", "MBA"] },
            { name: "People's University, Bhopal", courses: ["MBBS", "BDS", "B.Tech", "BBA", "MBA"] },
            { name: "RKDF University, Bhopal", courses: commonCourses },
            { name: "SAGE University, Indore", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA"] },
            { name: "Prestige University, Indore", courses: ["BBA", "MBA", "B.Com"] },
            { name: "Oriental University, Indore", courses: ["B.Tech", "BBA", "B.Com", "B.Sc", "MBA", "Pharmacy"] }
        ]
    },

    // --- Chhattisgarh ---
    {
        state: "Chhattisgarh",
        universities: [
            { name: "Pt. Ravishankar Shukla University, Raipur", courses: commonCourses },
            { name: "Guru Ghasidas Vishwavidyalaya, Bilaspur", courses: ["B.Tech", "B.Sc", "B.Com", "B.A.", "MBA"] },
            { name: "Indira Gandhi Krishi Vishwavidyalaya, Raipur", courses: ["B.Sc Agriculture", "M.Sc Agriculture"] },
            { name: "Chhattisgarh Swami Vivekanand Technical University, Bhilai", courses: ["B.Tech", "M.Tech", "MBA", "MCA"] },
            { name: "Hidayatullah National Law University, Raipur", courses: ["BA LLB", "LLM", "Ph.D"] },
            { name: "Amity University, Raipur", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA"] },
            { name: "Kalinga University, Raipur", courses: commonCourses },
            { name: "MATS University, Raipur", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "B.Ed"] },
            { name: "Dr. C.V. Raman University, Bilaspur", courses: commonCourses },
            { name: "ISBM University, Gariaband", courses: commonCourses },
            { name: "O.P. Jindal University, Raigarh", courses: ["B.Tech", "BBA", "B.Sc", "MBA", "M.Tech"] }
        ]
    },

    // --- Bihar ---
    {
        state: "Bihar",
        universities: [
            { name: "Patna University, Patna", courses: ["B.A.", "B.Sc", "B.Com", "MA", "M.Sc"] },
            { name: "Babasaheb Bhimrao Ambedkar Bihar University, Muzaffarpur", courses: commonCourses },
            { name: "Tilka Manhi Bhagalpur University, Bhagalpur", courses: commonCourses },
            { name: "Magadh University, Bodh Gaya", courses: commonCourses },
            { name: "Nalanda Open University, Patna", courses: ["B.A.", "B.Sc", "B.Com", "BBA", "BCA", "MA"] },
            { name: "Central University of South Bihar, Gaya", courses: ["BA LLB", "B.Sc B.Ed", "MA", "M.Sc"] },
            { name: "Amity University, Patna", courses: ["BBA", "B.Com", "B.A.", "MBA", "BCA"] },
            { name: "K.K. University, Nalanda", courses: ["B.Tech", "BBA", "B.Com", "Polytechnic"] },
            { name: "Sandip University, Sijoul", courses: ["B.Tech", "BBA", "B.Com", "MBA"] },
            { name: "Gopal Narayan Singh University, Sasaram", courses: ["MBBS", "B.Sc Nursing", "BBA", "LLB"] }
        ]
    },

    // --- Punjab ---
    {
        state: "Punjab",
        universities: [
            { name: "Panjab University, Chandigarh", courses: commonCourses },
            { name: "Punjabi University, Patiala", courses: commonCourses },
            { name: "Guru Nanak Dev University, Amritsar", courses: ["B.Tech", "B.Sc", "B.A.", "MBA", "MCA"] },
            { name: "Punjab Agricultural University, Ludhiana", courses: ["B.Sc Agriculture", "M.Sc Agriculture"] },
            { name: "I.K. Gujral Punjab Technical University, Jalandhar", courses: ["B.Tech", "M.Tech", "MBA", "BBA", "BCA"] },
            { name: "Maharaja Ranjit Singh Punjab Technical University, Bathinda", courses: ["B.Tech", "B.Pharm", "MBA", "MCA"] },
            { name: "Lovely Professional University, Phagwara", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "B.Des"] },
            { name: "Chandigarh University, Mohali", courses: ["B.Tech", "BBA", "B.Com", "B.A.", "MBA", "LLB"] },
            { name: "Thapar Institute of Engineering and Technology, Patiala", courses: ["B.Tech", "M.Tech", "MBA", "Ph.D"] },
            { name: "Chitkara University, Rajpura", courses: ["B.Tech", "BBA", "B.Com", "B.Arch", "MBA"] },
            { name: "DAV University, Jalandhar", courses: ["B.Tech", "BBA", "B.Com", "B.Sc", "MBA"] },
            { name: "Akal University, Talwandi Sabo", courses: ["B.A.", "B.Sc", "B.Com", "MA", "M.Sc"] },
            { name: "Adesh University, Bathinda", courses: ["MBBS", "BDS", "B.Pharm", "B.Sc Nursing"] }
        ]
    }
];

module.exports = universityList;
