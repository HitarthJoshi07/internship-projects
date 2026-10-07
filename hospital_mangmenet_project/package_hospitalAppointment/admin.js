
function randomCode(length = 5) {
    return Math.random()
        .toString(36)
        .substring(2, length + 2)
        .toUpperCase();
}
function genId() {
    return `HOSP-${randomCode()}`;
}


let deptCounter = 1;
function deptGenId(departmentName, departmentCount = Math.floor(Math.random() * 10)) {

    const departmentCodes = {
        "General Medicine": "GMED",
        "Cardiology": "CARD",
        "Neurology": "NEUR",
        "Neurosurgery": "NSURG",
        "Orthopedics": "ORTH",
        "General Surgery": "GSURG",
        "Pediatrics": "PED",
        "Gynecology": "GYN",
        "Obstetrics": "OBS",
        "Dermatology": "DERM",
        "ENT (Ear, Nose & Throat)": "ENT",
        "Ophthalmology": "OPTH",
        "Urology": "URO",
        "Nephrology": "NEPH",
        "Pulmonology": "PULM",
        "Gastroenterology": "GASTRO",
        "Endocrinology": "ENDO",
        "Psychiatry": "PSY",
        "Psychology": "PSYCHO",
        "Radiology": "RAD",
        "Pathology": "PATH",
        "Emergency Medicine": "EMR",
        "Anesthesiology": "ANES",
        "ICU (Intensive Care Unit)": "ICU",
        "Physiotherapy": "PHYSIO",
        "Oncology": "ONCO",
        "Dental": "DENT",
        "Plastic Surgery": "PLAST",
        "Rheumatology": "RHEUM",
        "Infectious Diseases": "ID"
    };

    const code = departmentCodes[departmentName];

    if (!code) { return "INVALID-DEPARTMENT"; }
    return `DEPT-${code}-${String(deptCounter++).padStart(3, "0")}`;
}

let doctorCounter = 1;
function docGenId(doctorCount = Math.floor(Math.random() * 100)) {

    return `DOC-${String(doctorCounter++).padStart(4, "0")}`;

}

function createDoctorSchedule() {

    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    ];


    const box = document.getElementById("doctor-schedule");

    box.innerHTML = "";

    days.forEach(day => {

        box.innerHTML += `

        <div class="doctor-schedule-row flex items-center gap-2">
            <input  type="checkbox" class="doctor-day" data-day="${day}">
            <span class="w-20"> ${day} </span>
            <input type="time" class="doctor-start bg-gray-600 border rounded p-2">
            <span>-</span>
            <input  type="time" class="doctor-end bg-gray-600 border rounded p-2">
        </div>

        `;

    })

}

function getDoctorSchedule() {
    let schedule = [];
    const rows = document.querySelectorAll('.doctor-schedule-row')

    rows.forEach(row => {
        const checkbox = row.querySelector(".doctor-day");
        const day = checkbox.dataset.day;

        const startTime = row.querySelector(".doctor-start").value;
        const endTime = row.querySelector(".doctor-end").value;

        if (checkbox.checked) {

            if (!startTime || !endTime) {
                alert(`Please enter time for ${day}`);
                return;
            }

            if (startTime >= endTime) {
                alert(`End time must be after start time for ${day}`);
                return;
            }
        }

        schedule.push({
            day: day,
            available: checkbox.checked ? "bHAI MILEGA " : "SORRY BABU MONEY FOLLAS BROTHAA",
            timing: {
                startTime: checkbox.checked ? startTime : null,
                endTime: checkbox.checked ? endTime : null
            }
        });
    });

    // console.log(schedule)
    return schedule;
}




function formDetails() {
    const idGenBtn = document.getElementById('id-gen-btn')
    const hospitalId = document.getElementById('hospital-id');
    const hospitalName = document.getElementById('hospital-name');
    const hospitalLocation = document.getElementById('hospital-location');
    const emergencyServices = document.getElementById('hospital-emergency');

    const branchInput = document.getElementById('branch-input');
    const branchList = document.querySelector("#branches-list");
    const branchRemovedBtn = document.querySelector('[data-action= "remove-branch"]')
    const branchAddBtn = document.querySelector('[data-action="add-branch"]');

    const departmentsList = document.getElementById("departments-list");
    const addDepartmentBtn = document.getElementById("add-department-btn");
    const add_branch_btn = document.getElementById("add-branch-btn");
    // in this branch dropdown opens without assigning to varible


    add_branch_btn.addEventListener("click", function () {
        let branchtemplate = document.getElementById("branch-template");
        branchtemplate.classList.remove('hidden')
    });
    // window.addEventListener('load', () => {
    //     hospitalId.value = genId();
    //     formState.id = `${hospitalId.value}`;
    // })

    idGenBtn.addEventListener("click", () => {
        hospitalId.value = genId();
        formState.id = `${hospitalId.value}`;
    })

    hospitalName.addEventListener('change', function () {
        //  console.log(hospitalName.value) 
        formState.name = `${hospitalName.value}`
        // console.log(formState)
    });
    hospitalLocation.addEventListener('change', function () {
        // console.log(hospitalLocation.value)
        formState.location = `${hospitalLocation.value}`
        // console.log(formState)
    });
    emergencyServices.addEventListener('change', function () {
        // console.log(emergencyServices.checked)
        formState.emergency = emergencyServices.checked
        // console.log(formState)
    });


    branchAddBtn.addEventListener("click", () => {
        const value = branchInput.value.trim();
        const newBranch = document.createElement("div");

        if (!value) return;

        if (formState.branches.includes(value)) {
            alert("Branch already exists!");
        } else {
            formState.branches.push(value);
            branchList.appendChild(newBranch);
        }



        newBranch.innerHTML = `
            <div class=" new-branch flex items-center gap-3">
                <h3>${value}</h3>
            </div>
        `;


        // console.log(formState);

        branchInput.value = "";

        branchInput.focus();
    });

    branchRemovedBtn.addEventListener("click", () => {
        // console.log("the button is clicked")
        formState.branches.pop();
        // document.querySelector(".new-branch:last-child").remove(); non checked delete

        const lastBranch = document.querySelector(".new-branch:last-child");

        if (lastBranch) {
            lastBranch.remove();
        }
        // console.log(formState);
    });

    addDepartmentBtn.addEventListener("click", () => {

        const addDept = document.getElementById("add-dept");
        const addDoctor = document.getElementById("add-doctor");
        addDept.classList.toggle("hidden");
        addDoctor.classList.toggle("hidden");
        createDoctorSchedule()

    });

    const deptContainer = document.getElementById("departments-container")
    const selectedDepartment = document.getElementById("select-dept");
    const selectedDoctor = document.getElementById("select-doctor")
    const saveDeptBtn = document.getElementById("save-department-btn");
    const saveDoctorBtn = document.getElementById("save-doctor-btn");

    saveDeptBtn.addEventListener("click", () => {

        const deptName = selectedDepartment.value.trim();
        const hospitalId = document.getElementById('hospital-id');


        if (!deptName) {
            alert("Enter department name");
            return;
        }

        const alreadyExist = Departments.find(dept => dept.departmentName === deptName && dept.hospitalId === hospitalId.value
        );
        if (alreadyExist) {
            alert("dept already exist");
            selectedDepartment.value = ""
            selectedDepartment.disabled = false;
        }
        else {
            Departments.push({
                hospitalId: `${hospitalId.value}`,
                departmentId: `${deptGenId(deptName)}`,
                departmentName: deptName,
            })
            const departmentCard = document.createElement("div");
            departmentCard.className = `rounded-xl border p-4 mt-3`;
            departmentCard.dataset.department = deptName;
            departmentCard.innerHTML = `<h3 class="font-bold">Depatrment Name: ${deptName}</h3>
                                        <ul class="doctor-list flex gap-3">doctors in the dept:-</ul>`;

            deptContainer.appendChild(departmentCard);
        }

        // console.log(Departments)
        // selectedDepartment.disabled = true;
        // console.log(formState);


    });


    saveDoctorBtn.addEventListener("click", () => {

        const doctorName = selectedDoctor.value.trim();
        const deptName = selectedDepartment.value.trim();
        const hospitalId = document.getElementById('hospital-id');
        const schedule = getDoctorSchedule();
        if (!doctorName) {
            alert("Enter doctor name");
            return;
        }
        if (!deptName) {
            alert("Select the department first")
        }

        const department = Departments.find(
            dept => dept.departmentName === deptName
        );

        if (!department) {
            alert("Department not found!");
            return;
        }

        Doctors.push({
            hospitalId: `${hospitalId.value}`,
            departmentId: `${department.departmentId}`,
            doctorId: `${docGenId()}`,
            doctorName: doctorName,
            schedule: schedule
        });

        document.querySelectorAll(".doctor-day").forEach(day => {day.checked = false;})
      
        selectedDoctor.value = "";
        const nameDisplay = document.createElement("li");
        nameDisplay.innerHTML = `<span>${doctorName}</span>
                                <span></span>`;
        const nameDisplayCard = document.querySelector(`[data-department = "${deptName}"]`);
        nameDisplayCard.appendChild(nameDisplay);

        
        // console.log(formState);
        console.log(Doctors)
        // console.log(department)

    });


}

window.addEventListener("DOMContentLoaded", () => {
    formDetails();
});
// formDetails();

function emptyFormState() {
    return {
        id: "",
        name: "",
        location: "",
        emergency: false,
        branches: [],
        departments: [],
        doctors: []

    }
}

const Departments = [];
const Doctors = []

console.log(Departments)
console.log(Doctors)





let editingHospitalId = null;
let formState = emptyFormState();

const saveHospitalBtn = document.querySelector("#save-hospital-btn");
const formPreview = document.getElementById("form-preview");



function createHospitalCard(hospital) {
    const HospitalList = document.createElement("div");


    // const deptName = selectedDepartment.value.trim();

    HospitalList.className =
        "h-full w-full border border-gray-300 p-2 rounded-2xl";

    HospitalList.innerHTML = `
            <h3 class="font-bold">Hospital ID: ${hospital.id}</h3>

            <details>
                <summary class="cursor-pointer font-semibold">
                    ${hospital.name}
                </summary>

                <h2>Hospital Name: ${hospital.name}</h2>
                <h2>Hospital Location: ${hospital.location}</h2>

                <h2 class="font-medium">
                    Emergency Services:
                    ${hospital.emergency ? "Available" : "Not Available"}
                </h2>

                <h2 class="font-bold">
                    Branches:
                    <span class="font-medium">
                        ${hospital.branches}
                    </span>
                </h2>

                <h2 class="font-bold mt-3">Departments</h2>

               <h2> ${hospital.departments.map(dept => {

        const departmentDoctors = (hospital.doctors || []).filter(doctor =>
            doctor.departmentId === dept.departmentId &&
            doctor.hospitalId === hospital.id);
        return `
                <div>
                    <h3 class="font-semibold">${dept.departmentName}</h3>
                    <ul class="flex flex-col list-disc justify-start ml-3 ">${departmentDoctors.map(doctor => `<li>${doctor.doctorName}</li>`).join("")}</ul>
                </div>`;
    }).join("")}
         </h2>

            <div class="mt-4 flex gap-2">
                 <button
                    class="edit-btn bg-blue-500 px-3 py-1 rounded text-white" data-id="${hospital.id}"> Edit
                </button>

                <button
                     class="delete-btn bg-red-500 px-3 py-1 rounded text-white" data-id="${hospital.id}"> Delete
                </button>

                      <button
                     class=" bg-gray-500 px-3 py-1 rounded text-white text-nowrap" data-id="${hospital.id}"> View Appointments
                </button>
             </div>
            </details>
        `;

    formPreview.appendChild(HospitalList);
}


saveHospitalBtn.addEventListener("click", (e) => {
    e.preventDefault();


    formState.departments = structuredClone(Departments);
    formState.doctors = structuredClone(Doctors);

    // Read previous hospitals
    const AdminData =
        JSON.parse(localStorage.getItem("AdminData")) || [];

    // AdminData.push(structuredClone(formState));
    if (editingHospitalId === null) {
        AdminData.push(structuredClone(formState));
    } else {
        const index = AdminData.findIndex(
            hospital => hospital.id === editingHospitalId);
        AdminData[index] = structuredClone(formState);

        editingHospitalId = null;
    }

    localStorage.setItem(
        "AdminData",
        JSON.stringify(AdminData)
    );

    // Show only the newly added hospital
    // createHospitalCard(formState);

    // not work so to avoid duplication do that 
    formPreview.innerHTML = "";

    AdminData.forEach(hospital => {
        createHospitalCard(hospital);
    });

    // console.log(AdminData);

    formState = emptyFormState();


    resetForm();
});

window.addEventListener("DOMContentLoaded", () => {

    const AdminData =
        JSON.parse(localStorage.getItem("AdminData")) || [];

    AdminData.forEach(hospital => {
        createHospitalCard(hospital);
    });

});

document.addEventListener("click", (e) => {
    /* if(e.target.class.contains("delete-btn")){
    
    const id= e.taget.dataset.id
     let adminData = JSON.parse(localStorage.getItem("AdminData") || [];
     AdminData = AdminData.filter(hospital => hospital.id !== id) ]) */

    if (e.target.classList.contains("delete-btn")) {

        const id = e.target.dataset.id;

        let AdminData =
            JSON.parse(localStorage.getItem("AdminData")) || [];

        AdminData = AdminData.filter(hospital => hospital.id !== id);

        localStorage.setItem("AdminData", JSON.stringify(AdminData));

        formPreview.innerHTML = "";

        AdminData.forEach(hospital => {
            createHospitalCard(hospital);
        });

        return;
    }
    if (!e.target.classList.contains("edit-btn")) return;

    const id = e.target.dataset.id;

    const AdminData = JSON.parse(localStorage.getItem("AdminData")) || [];
    const hospital = AdminData.find(h => h.id === id);

    if (!hospital) return;

    editingHospitalId = id;

    formState = structuredClone(hospital);

    document.getElementById("hospital-id").value = hospital.id;
    document.getElementById("hospital-name").value = hospital.name;
    document.getElementById("hospital-location").value = hospital.location;
    document.getElementById("hospital-emergency").checked = hospital.emergency;
    document.querySelector("#branches-list").innerHTML = "";


    hospital.branches.forEach(branch => {
        const div = document.createElement("div");

        div.className = "new-branch";
        div.innerHTML = `<h3>${branch}</h3>`;

        document.querySelector("#branches-list").appendChild(div);
    });

    document.getElementById("departments-container").innerHTML = "";

    hospital.departments.forEach(dept => {

        const doctors = hospital.doctors.filter(
            doctor => doctor.departmentId === dept.departmentId
        );

        const card = document.createElement("div");

        card.className = `rounded-xl border p-4 mt-3`;
        card.innerHTML = ` <h3>${dept.departmentName}</h3>

        <ul>
            ${doctors.map(doctor => `<li>${doctor.doctorName}</li>`).join("")}
        </ul>
    `;

        document.getElementById("departments-container").appendChild(card);

    });


});

document
    .getElementById("clear-storage-btn")
    .addEventListener("click", clearHospitalData);

function clearHospitalData() {
    localStorage.removeItem("AdminData");
    formPreview.innerHTML = "";
    console.log("Hospital data cleared.");
}


function resetForm() {
    document.getElementById('hospital-id').value = "";
    document.getElementById('hospital-name').value = ''
    document.getElementById('hospital-location').value = ''
    document.getElementById('hospital-emergency').checked = false;
    document.getElementById('branch-input').value = "";
    document.querySelector("#branches-list").innerHTML = "";
    document.getElementById("select-dept").value = "";
    document.getElementById("select-doctor").value = "";
    document.getElementById("departments-container").innerHTML = "";
    document.querySelectorAll(".doctor-day").forEach(day => day.checked = false)
    document.querySelectorAll(".start-time").forEach(start => start.value = "")
}

const AdminData =
    JSON.parse(localStorage.getItem("AdminData")) || [];

export { AdminData };



export { Departments, Doctors };