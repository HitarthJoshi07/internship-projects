// import { data } from "./data.js"; // apni file path ke hisaab se change kar lena
// import { AdminData } from "./admin.js"


const cancelAppointBtn = document.getElementById("cancel-appoint-btn")
const bookAppointBtn = document.getElementById("book-appoint-btn")
const bookAppointmentModal = document.getElementById("book-appointment-modal")
const closeAppointmentDialog = document.getElementById("close-appoint-btn")
const apntCancelBtn = document.getElementById("apnt-cancel-btn")
const apntConfirmBtn = document.getElementById("apnt-confirm-btn")

function openOnBtnClick(button, dialog) {
    button.addEventListener("click", () => { dialog.classList.remove("hidden"); });
}

function closeOnBtnClick(button, dialog) {
    button.addEventListener("click", () => { dialog.classList.add("hidden"); });
}


openOnBtnClick(bookAppointBtn, bookAppointmentModal);
openOnBtnClick(cancelAppointBtn, bookAppointmentModal);

closeOnBtnClick(closeAppointmentDialog, bookAppointmentModal)

apntCancelBtn.addEventListener("click", () => {
    alert("Appointment booking cancelled.");
    bookAppointmentModal.classList.add("hidden");
})


const container = document.getElementById("page-hospitals");

// const hospitalImages = [
//  "https://picsum.photos/seed/48392/800/600",
//   "https://picsum.photos/seed/91754/800/600",
//   "https://picsum.photos/seed/26183/800/600",
//   "https://picsum.photos/seed/74015/800/600",
//   "https://picsum.photos/seed/15927/800/600",
//   "https://picsum.photos/seed/68431/800/600",
//   "https://picsum.photos/seed/32598/800/600"    
// ];
// const doctorsByDept = {
//     "General Medicine": ["Dr. Anil Mehta", "Dr. Priya Sharma", "Dr. Rajesh Kumar"],
//     "Cardiology": ["Dr. Suresh Rao", "Dr. Kavitha Nair"],
//     "Orthopedics": ["Dr. Vikram Singh", "Dr. Deepa Menon", "Dr. Arun Patel"],
//     "Dermatology": ["Dr. Meera Joshi", "Dr. Ravi Iyer"],
//     "Pediatrics": ["Dr. Sanjay Gupta", "Dr. Nisha Verma"],
//     "Neurology": ["Dr. Prakash Bhat", "Dr. Anjali Desai"],
//     "ENT": ["Dr. Mohammed Farhan", "Dr. Lakshmi Rao"],
//     "Ophthalmology": ["Dr. Suman Reddy", "Dr. Pooja Kulkarni"]
// };

const AdminData = JSON.parse(localStorage.getItem("AdminData") || []);
console.log(AdminData)


const departments = AdminData.flatMap(hospital => hospital.departments);
console.log(departments);

const doctor = document.getElementById("doctor");


// department.addEventListener('change', () => {
//     doctor.innerHTML = `<option value="">Select Doctor</option>`

//     const doctors = doctorsByDept[department.value] || [];

//     doctors.forEach(name => {
//         const option = document.createElement("option");
//         option.value = name;
//         option.textContent = name;
//         doctor.appendChild(option);
//     });
// });

const dateInput = document.getElementById("date");

dateInput.setAttribute(
    "min",
    new Date().toISOString().split("T")[0]
);

dateInput.addEventListener('change', () => {
    if (!dateInput.value) {
        error.textContent = "Please select a valid date.";
    } else {
        error.textContent = "";
    }
})

// apntConfirmBtn.addEventListener("submit", (e) => {
//     e.preventDefault();


//     clearError();


//     const form = document.getElementById("appointment-form");
//     const memberName = document.getElementById("member-name");
//     const memberEmail = document.getElementById("member-email");
//     const phoneNo = document.getElementById("phone-no");
//     const memberAddress = document.getElementById("member-address");
//     const hospital = document.getElementById("hospital");
//     const department = document.getElementById("department");
//     const doctor = document.getElementById("doctor");
//     const timeSlot = document.getElementById("time-slot");
//     const date = document.getElementById("date");
//     const reason = document.getElementById("reason");
//     const formError = document.getElementById("member-form-error");


//     if (memberName.value.trim() === "") {
//         showError("Name is required");
//         return;
//     }
//     const emailRegex = /^[^\s@]+@[^\s@]+\.[\s@]+$/;
//     if (!emailRegex.test(memberEmail.value.trim())) {
//         showError("Enter a valid Email");
//         return;
//     }
//     const phoneRegex = /^[6-9]\d{9}$/;
//     if (!phoneRegex.test(phoneNo.value.trim())) {
//         showError("enter a valid phone no");
//         return;
//     }
//     if (hospital.value === "") {
//         hospital.value = AdminData;
//         return;
//     }
//     if (department.value === "") {
//         showError("Select department");
//         return;
//     }
//     if (doctor.value === "") {

//         showError("Select doctor");

//         return;

//     }
//     if (timeSlot.value === "") {

//         showError("Select time slot");

//         return;

//     }
//     if (date.value === "") {

//         showError("Select appointment date");

//         return;

//     }
//     if (reason.value.trim().length < 10) {

//         showError("Reason should be at least 10 characters.");

//         return;

//     }
//     function showError(message) {
//         formError.textContent = message;
//         formError.classList.remove("hidden");
//     }
//     function clearError() {
//         formError.textContent = "";
//         formError.classList.add("hidden");
//     }
// });


apntConfirmBtn.addEventListener("click", (e) => {
    e.preventDefault();

    const hospital = document.getElementById("hospital");
    const department = document.getElementById("department");
    const doctor = document.getElementById("doctor");

    const appointmentData = {
        hospitalId: hospital.value,
        hospitalName: hospital.options[hospital.selectedIndex].text,

        departmentId: department.value,
        departmentName: department.options[department.selectedIndex].text,

        doctorId: doctor.value,
        doctorName: doctor.options[doctor.selectedIndex].text,

        date: document.getElementById("date").value,
        timeSlot: document.getElementById("time-slot").value,
        reason: document.getElementById("reason").value

    };

    localStorage.setItem(
        "appointment",
        JSON.stringify(appointmentData)
    );

    console.log("Saved:", appointmentData);
});

const pageHospitals = document.getElementById("page-hospitals")

const hospitalName = AdminData.map(hospital => hospital.name);
const hospitalLocation = AdminData.map(hospital => hospital.location)
console.log(hospitalName)
console.log(hospitalLocation)




AdminData.forEach((hospital) => {

    const card = document.createElement("div");

    card.className =
        "bg-white w-72 h-120 rounded-2xl shadow-lg overflow-hidden hover:scale-101 group transition-all duration-100";

    card.innerHTML = `
                <div class=" h-70 flex items-center justify-center  bg-gradient-to-br from-white via-slate-100 to-emerald-300 ">
                    Hospital Image
                </div>

                <div class="p-4 space-y-1">

                    <h2 class="text-md font-bold line-clamp-2">
                     ${hospital.name}
                    </h2>

                    <p class="text-gray-600">
                        ${hospital.location}
                    </p>

                    <p class="mt-2">
                        Emergency :
                        ${hospital.emergency ? "✅ Available" : "❌ Not Available"}
                    </p>
                    <button
                            class="hosp-apnt-btn p-2 hover:underline bg-green-200 hover:shadow-sm hover:ring ring-white hover:text-lg shadow-gray-900 group-hover:bg-green-400 hover:shadow rounded-xl font-bold">
                            book appointment
                        </button>

                </div>
            `;

    const btn = card.querySelector(".hosp-apnt-btn");

    btn.addEventListener("click", () => {
        bookAppointmentModal.classList.remove("hidden");

        bookAppointmentModal.querySelector('#hospital').innerHTML =
            `<option value="${hospital.id}">${hospital.name}</option>`;

        const deptSelect = bookAppointmentModal.querySelector("#department");
        const doctorSelect = bookAppointmentModal.querySelector("#doctor");

        // Fill departments
        deptSelect.innerHTML = '<option value="">Select Department</option>';

        hospital.departments.forEach((dept) => {
            const option = document.createElement("option");
            option.value = dept.departmentId;
            option.textContent = dept.departmentName;
            deptSelect.appendChild(option);
        });

        // Department change event
        deptSelect.addEventListener("change", () => {

            // Clear doctors
            doctorSelect.innerHTML = '<option value="">Select Doctor</option>';

            const selectedDeptId = deptSelect.value;

            // Find doctors by departmentId
            const filteredDoctors = hospital.doctors.filter(
                doctor => doctor.departmentId === selectedDeptId
            );

            // Add doctors
            filteredDoctors.forEach((doctor) => {
                const option = document.createElement("option");
                option.value = doctor.doctorId;
                option.textContent = doctor.doctorName;
                doctorSelect.appendChild(option);
            });
        });
    });
    pageHospitals.append(card);

});
