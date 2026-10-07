import { AdminData } from "./admin.js";


const data ={
  "hospitals": [
    {
      "hospital_id": "HOSP001",
      "name": "City General Hospital",
      "location": "New York, NY",
      "emergency_services": true
    },
    {
      "hospital_id": "HOSP002",
      "name": "Metro Health Center",
      "location": "Chicago, IL",
      "emergency_services": true
    },
    {
      "hospital_id": "HOSP003",
      "name": "Sunrise Community Hospital",
      "location": "Miami, FL",
      "emergency_services": false
    },
    {
      "hospital_id": "HOSP004",
      "name": "Apex Medical Institute",
      "location": "Houston, TX",
      "emergency_services": true
    },
    {
      "hospital_id": "HOSP005",
      "name": "Pacific View Hospital",
      "location": "Los Angeles, CA",
      "emergency_services": true
    }
  ],
  "doctors": [
    {
      "doctor_id": "DOC001",
      "name": "Dr. Robert Smith",
      "specialization": "Cardiologist",
      "hospital_id": "HOSP001",
      "phone": "+1-555-0192"
    },
    {
      "doctor_id": "DOC002",
      "name": "Dr. Sarah Jenkins",
      "specialization": "Neurologist",
      "hospital_id": "HOSP001",
      "phone": "+1-555-0148"
    },
    {
      "doctor_id": "DOC003",
      "name": "Dr. Michael Chang",
      "specialization": "Pediatrician",
      "hospital_id": "HOSP002",
      "phone": "+1-555-0234"
    },
    {
      "doctor_id": "DOC004",
      "name": "Dr. Emily Davis",
      "specialization": "Orthopedic Surgeon",
      "hospital_id": "HOSP002",
      "phone": "+1-555-0256"
    },
    {
      "doctor_id": "DOC005",
      "name": "Dr. James Wilson",
      "specialization": "Dermatologist",
      "hospital_id": "HOSP003",
      "phone": "+1-555-0378"
    },
    {
      "doctor_id": "DOC006",
      "name": "Dr. Linda Martinez",
      "specialization": "General Practitioner",
      "hospital_id": "HOSP003",
      "phone": "+1-555-0390"
    },
    {
      "doctor_id": "DOC007",
      "name": "Dr. David Patel",
      "specialization": "Oncologist",
      "hospital_id": "HOSP004",
      "phone": "+1-555-0412"
    },
    {
      "doctor_id": "DOC008",
      "name": "Dr. Sophia Taylor",
      "specialization": "Gynecologist",
      "hospital_id": "HOSP004",
      "phone": "+1-555-0445"
    },
    {
      "doctor_id": "DOC009",
      "name": "Dr. William Brown",
      "specialization": "Psychiatrist",
      "hospital_id": "HOSP005",
      "phone": "+1-555-0567"
    },
    {
      "doctor_id": "DOC010",
      "name": "Dr. Olivia Anderson",
      "specialization": "Ophthalmologist",
      "hospital_id": "HOSP005",
      "phone": "+1-555-0589"
    }
  ],
  "patients": [
    {
      "patient_id": "PAT001",
      "name": "John Doe",
      "age": 45,
      "gender": "Male",
      "hospital_id": "HOSP001",
      "blood_group": "O+"
    },
    {
      "patient_id": "PAT002",
      "name": "Jane Smith",
      "age": 30,
      "gender": "Female",
      "hospital_id": "HOSP001",
      "blood_group": "A-"
    },
    {
      "patient_id": "PAT003",
      "name": "Carlos Gomez",
      "age": 52,
      "gender": "Male",
      "hospital_id": "HOSP002",
      "blood_group": "B+"
    },
    {
      "patient_id": "PAT004",
      "name": "Amina Khan",
      "age": 28,
      "gender": "Female",
      "hospital_id": "HOSP002",
      "blood_group": "AB+"
    },
    {
      "patient_id": "PAT005",
      "name": "Liam Johnson",
      "age": 63,
      "gender": "Male",
      "hospital_id": "HOSP003",
      "blood_group": "O-"
    },
    {
      "patient_id": "PAT006",
      "name": "Emma Wilson",
      "age": 35,
      "gender": "Female",
      "hospital_id": "HOSP003",
      "blood_group": "A+"
    },
    {
      "patient_id": "PAT007",
      "name": "Lucas Rossi",
      "age": 41,
      "gender": "Male",
      "hospital_id": "HOSP004",
      "blood_group": "B-"
    },
    {
      "patient_id": "PAT008",
      "name": "Mia Clark",
      "age": 22,
      "gender": "Female",
      "hospital_id": "HOSP004",
      "blood_group": "AB-"
    },
    {
      "patient_id": "PAT009",
      "name": "Ethan Wright",
      "age": 50,
      "gender": "Male",
      "hospital_id": "HOSP005",
      "blood_group": "O+"
    },
    {
      "patient_id": "PAT010",
      "name": "Harper Lee",
      "age": 39,
      "gender": "Female",
      "hospital_id": "HOSP005",
      "blood_group": "A+"
    }
  ],
  "payment_updation": [
    {
      "payment_id": "PAY001",
      "patient_id": "PAT001",
      "hospital_id": "HOSP001",
      "amount": 1500.00,
      "payment_method": "Credit Card",
      "status": "Completed",
      "updated_at": "2026-07-31T10:15:00Z"
    },
    {
      "payment_id": "PAY002",
      "patient_id": "PAT002",
      "hospital_id": "HOSP001",
      "amount": 350.00,
      "payment_method": "Insurance",
      "status": "Pending",
      "updated_at": "2026-07-31T11:00:00Z"
    },
    {
      "payment_id": "PAY003",
      "patient_id": "PAT003",
      "hospital_id": "HOSP002",
      "amount": 2200.50,
      "payment_method": "Bank Transfer",
      "status": "Completed",
      "updated_at": "2026-07-30T16:45:00Z"
    },
    {
      "payment_id": "PAY004",
      "patient_id": "PAT005",
      "hospital_id": "HOSP003",
      "amount": 450.00,
      "payment_method": "Cash",
      "status": "Failed",
      "updated_at": "2026-07-31T09:30:00Z"
    },
    {
      "payment_id": "PAY005",
      "patient_id": "PAT007",
      "hospital_id": "HOSP004",
      "amount": 5000.00,
      "payment_method": "Insurance",
      "status": "Completed",
      "updated_at": "2026-07-29T14:20:00Z"
    }
  ]
} 





function logging(){
const fs = require("fs");
const data = fs.readFileSync('a.txt','utf-8')
console.log(data)
}

export { data }

console.log(AdminData);


console.log("admin loaded")
