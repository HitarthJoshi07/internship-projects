import { data } from '../data.js';

const LOCAL_STORAGE_KEY = 'hospitalAdminHospitals';

const hospitalListElement = document.getElementById('hospital-list');
const hospitalForm = document.getElementById('hospital-form');
const hospitalIdInput = document.getElementById('hospital-id');
const hospitalNameInput = document.getElementById('hospital-name');
const hospitalLocationInput = document.getElementById('hospital-location');
const hospitalEmergencyInput = document.getElementById('hospital-emergency');
const formTitle = document.getElementById('form-title');
const formDescription = document.getElementById('form-description');
const saveHospitalButton = document.getElementById('save-hospital-btn');
const cancelEditButton = document.getElementById('cancel-edit-btn');
const newHospitalButton = document.getElementById('new-hospital-btn');
const formFeedback = document.getElementById('form-feedback');
const liveSummaryElement = document.getElementById('live-summary-content');
const branchesList = document.getElementById('branches-list');
const departmentsList = document.getElementById('departments-list');

let hospitals = [];
let editingHospitalId = null;
let nextDepartmentId = 1;

function loadHospitals() {
  const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (saved) {
    try {
      return JSON.parse(saved);
    } catch {
      return [...data.hospitals];
    }
  }
  return [...data.hospitals];
}

function saveHospitals() {
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(hospitals));
}

function generateHospitalId() {
  let nextIndex = hospitals.length + 1;
  let id;
  do {
    id = `HOSP${String(nextIndex).padStart(3, '0')}`;
    nextIndex += 1;
  } while (hospitals.some((hospital) => hospital.hospital_id === id));
  return id;
}

function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function createBranchRow(branch = {}) {
  const wrapper = document.createElement('div');
  wrapper.dataset.branchRow = 'true';
  wrapper.className = 'grid gap-4 sm:grid-cols-[1.4fr_1.6fr_auto] items-end rounded-2xl border border-brand-700 bg-brand-900 p-4';
  wrapper.innerHTML = `
    <div>
      <label class="block text-sm font-medium text-brand-100">Branch Name</label>
      <input data-field="branch-name" type="text" value="${escapeHtml(branch.name)}" placeholder="e.g. Downtown Clinic" class="mt-2 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3 text-sm text-brand-50 outline-none transition focus:border-brand-500 focus:ring-brand-200 focus:ring-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-brand-100">Branch Address</label>
      <input data-field="branch-location" type="text" value="${escapeHtml(branch.address)}" placeholder="e.g. 123 Main St, City" class="mt-2 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3 text-sm text-brand-50 outline-none transition focus:border-brand-500 focus:ring-brand-200 focus:ring-2" />
    </div>
    <button type="button" data-action="remove-branch" class="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">Remove</button>
  `;
  return wrapper;
}

function createDoctorRow(departmentId, doctor = {}) {
  const wrapper = document.createElement('div');
  wrapper.dataset.doctorRow = 'true';
  wrapper.dataset.departmentId = departmentId;
  wrapper.className = 'grid gap-4 sm:grid-cols-[1.4fr_1.2fr_1fr_auto] items-end rounded-2xl border border-brand-700 bg-brand-900 p-3';
  wrapper.innerHTML = `
    <div>
      <label class="block text-sm font-medium text-brand-100">Doctor Name</label>
      <input data-field="doctor-name" type="text" value="${escapeHtml(doctor.name)}" placeholder="e.g. Dr. Priya Sharma" class="mt-2 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3 text-sm text-brand-50 outline-none transition focus:border-brand-500 focus:ring-brand-200 focus:ring-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-brand-100">Specialization</label>
      <input data-field="doctor-specialization" type="text" value="${escapeHtml(doctor.specialization)}" placeholder="e.g. Cardiology" class="mt-2 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3 text-sm text-brand-50 outline-none transition focus:border-brand-500 focus:ring-brand-200 focus:ring-2" />
    </div>
    <div>
      <label class="block text-sm font-medium text-brand-100">Phone</label>
      <input data-field="doctor-phone" type="tel" value="${escapeHtml(doctor.phone)}" placeholder="e.g. +1-555-1234" class="mt-2 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3 text-sm text-brand-50 outline-none transition focus:border-brand-500 focus:ring-brand-200 focus:ring-2" />
    </div>
    <button type="button" data-action="remove-doctor" class="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">Remove</button>
  `;
  return wrapper;
}

function createDepartmentCard(department = {}) {
  const departmentId = department.id || `department-${nextDepartmentId++}`;
  const wrapper = document.createElement('section');
  wrapper.dataset.departmentCard = departmentId;
  wrapper.className = 'rounded-3xl border border-brand-700 bg-brand-900 p-4 shadow-sm';
  wrapper.innerHTML = `
    <div class="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
      <div>
        <label class="block text-sm font-medium text-brand-100">Department Name</label>
        <input data-field="department-name" type="text" value="${escapeHtml(department.name)}" placeholder="e.g. Cardiology" class="mt-2 w-full rounded-2xl border border-brand-700 bg-brand-900 px-4 py-3 text-sm text-brand-50 outline-none transition focus:border-brand-500 focus:ring-brand-200 focus:ring-2" />
      </div>
      <button type="button" data-action="remove-department" class="inline-flex h-12 items-center justify-center rounded-2xl bg-rose-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-rose-700">Remove Department</button>
    </div>
    <div class="mt-4 rounded-3xl border border-brand-700 bg-brand-800 p-4">
      <div class="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p class="text-sm font-semibold text-brand-50">Doctors in this department</p>
          <p class="text-sm text-brand-200">Add physicians and their specialization for this department.</p>
        </div>
        <button type="button" data-action="add-doctor" class="inline-flex items-center justify-center rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">Add Doctor</button>
      </div>
      <div class="space-y-3 department-doctors"></div>
    </div>
  `;

  const doctorsContainer = wrapper.querySelector('.department-doctors');
  const doctors = Array.isArray(department.doctors) && department.doctors.length > 0 ? department.doctors : [{}];
  doctors.forEach((doctor) => doctorsContainer.appendChild(createDoctorRow(departmentId, doctor)));

  return wrapper;
}

function renderLiveSummary(hospital) {
  if (!liveSummaryElement) return;

  if (!hospital || (!hospital.name && !hospital.location && !hospital.branches?.length && !hospital.departments?.length)) {
    liveSummaryElement.innerHTML = '<p class="text-brand-200">Fill out the form to see a live summary of the hospital details.</p>';
    return;
  }

  const branchCount = hospital.branches?.length || 0;
  const departmentCount = hospital.departments?.length || 0;
  const doctorCount = hospital.departments?.reduce((count, department) => count + (department.doctors?.length || 0), 0) || 0;

  const branchesHtml = hospital.branches?.length
    ? `<ul class="list-disc list-inside space-y-1 text-brand-100">${hospital.branches.map((branch) => `<li><strong>${escapeHtml(branch.name || 'Unnamed branch')}</strong>: ${escapeHtml(branch.address || 'No address')}</li>`).join('')}</ul>`
    : '<p class="text-brand-200">No branches added yet.</p>';

  const departmentsHtml = hospital.departments?.length
    ? hospital.departments.map((department) => `
        <div class="rounded-2xl border border-brand-700 bg-brand-800 p-4">
          <p class="text-sm font-semibold text-brand-50">${escapeHtml(department.name || 'Unnamed department')}</p>
          <p class="text-xs text-brand-200">${(department.doctors?.length || 0)} doctor(s)</p>
          ${department.doctors?.length ? `<ul class="mt-3 list-disc list-inside space-y-1 text-brand-100">${department.doctors.map((doctor) => `<li><strong>${escapeHtml(doctor.name || 'Unnamed doctor')}</strong> — ${escapeHtml(doctor.specialization || 'No specialization')}, ${escapeHtml(doctor.phone || 'No phone')}</li>`).join('')}</ul>` : '<p class="text-brand-200 mt-2">No doctors added.</p>'}
        </div>`
    ).join('')
    : '<p class="text-brand-200">No departments added yet.</p>';

  liveSummaryElement.innerHTML = `
    <div class="space-y-4">
      <div class="rounded-2xl bg-brand-900 p-4 text-brand-100 border border-brand-700">
        <p><span class="font-semibold text-brand-50">Name:</span> ${escapeHtml(hospital.name || 'Untitled hospital')}</p>
        <p><span class="font-semibold text-brand-50">Main Location:</span> ${escapeHtml(hospital.location || 'Not specified')}</p>
        <p><span class="font-semibold text-brand-50">Emergency Services:</span> ${hospital.emergency_services ? 'Enabled' : 'Disabled'}</p>
        <div class="mt-3 grid gap-2 sm:grid-cols-3">
          <span class="rounded-2xl bg-brand-800 px-3 py-2 text-sm text-brand-100">Branches: ${branchCount}</span>
          <span class="rounded-2xl bg-brand-800 px-3 py-2 text-sm text-brand-100">Departments: ${departmentCount}</span>
          <span class="rounded-2xl bg-brand-800 px-3 py-2 text-sm text-brand-100">Doctors: ${doctorCount}</span>
        </div>
      </div>
      <div>
        <p class="text-sm font-semibold text-brand-50">Branch details</p>
        ${branchesHtml}
      </div>
      <div>
        <p class="text-sm font-semibold text-brand-50">Department details</p>
        ${departmentsHtml}
      </div>
    </div>`;
}

function getCurrentFormSnapshot() {
  return {
    name: hospitalNameInput.value.trim(),
    location: hospitalLocationInput.value.trim(),
    emergency_services: hospitalEmergencyInput.checked,
    branches: gatherBranches(),
    departments: gatherDepartments()
  };
}

function updateLiveSummary() {
  renderLiveSummary(getCurrentFormSnapshot());
}

function addBranch(branch) {
  branchesList.appendChild(createBranchRow(branch));
}

function addDepartment(department) {
  departmentsList.appendChild(createDepartmentCard(department));
}

function gatherBranches() {
  return Array.from(branchesList.querySelectorAll('[data-branch-row]')).map((row) => ({
    name: row.querySelector('[data-field="branch-name"]').value.trim(),
    address: row.querySelector('[data-field="branch-location"]').value.trim()
  })).filter((branch) => branch.name || branch.address);
}

function gatherDepartments() {
  return Array.from(departmentsList.querySelectorAll('[data-department-card]')).map((card) => {
    const name = card.querySelector('[data-field="department-name"]').value.trim();
    const doctors = Array.from(card.querySelectorAll('[data-doctor-row]')).map((doctorRow) => ({
      name: doctorRow.querySelector('[data-field="doctor-name"]').value.trim(),
      specialization: doctorRow.querySelector('[data-field="doctor-specialization"]').value.trim(),
      phone: doctorRow.querySelector('[data-field="doctor-phone"]').value.trim()
    })).filter((doctor) => doctor.name || doctor.specialization || doctor.phone);
    return { name, doctors };
  }).filter((department) => department.name || department.doctors.length > 0);
}

function resetForm() {
  editingHospitalId = null;
  formTitle.textContent = 'Add Hospital';
  formDescription.textContent = 'Provide hospital details and save to update the list.';
  saveHospitalButton.textContent = 'Save Hospital';
  cancelEditButton.classList.add('hidden');
  hospitalForm.reset();
  hospitalIdInput.value = '';
  hospitalEmergencyInput.checked = false;
  formFeedback.textContent = '';
  formFeedback.classList.remove('text-brand-100');
  formFeedback.classList.add('text-rose-400');
  branchesList.innerHTML = '';
  departmentsList.innerHTML = '';
  addBranch();
  addDepartment();
  updateLiveSummary();
}

function showFeedback(message, isError = true) {
  formFeedback.textContent = message;
  formFeedback.classList.toggle('text-brand-100', !isError);
  formFeedback.classList.toggle('text-rose-400', isError);
}

function populateForm(hospital) {
  resetForm();

  hospitalIdInput.value = hospital.hospital_id;
  hospitalNameInput.value = hospital.name;
  hospitalLocationInput.value = hospital.location;
  hospitalEmergencyInput.checked = Boolean(hospital.emergency_services);

  branchesList.innerHTML = '';
  if (Array.isArray(hospital.branches) && hospital.branches.length) {
    hospital.branches.forEach(addBranch);
  } else {
    addBranch();
  }

  departmentsList.innerHTML = '';
  if (Array.isArray(hospital.departments) && hospital.departments.length) {
    hospital.departments.forEach((department) => addDepartment(department));
  } else {
    addDepartment();
  }

  updateLiveSummary();
}

function renderHospitals() {
  if (hospitals.length === 0) {
    hospitalListElement.innerHTML = '<p class="text-brand-200">No hospitals available. Add a hospital to get started.</p>';
    return;
  }

  const rows = hospitals
    .map((hospital) => {
      const emergencyBadge = hospital.emergency_services
        ? '<span class="inline-flex items-center rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Emergency services available</span>'
        : '<span class="inline-flex items-center rounded-full bg-rose-100 px-3 py-1 text-xs font-semibold text-rose-700">Emergency services unavailable</span>';

      const branchCount = Array.isArray(hospital.branches) ? hospital.branches.length : 0;
      const departmentCount = Array.isArray(hospital.departments) ? hospital.departments.length : 0;
      const doctorCount = Array.isArray(hospital.departments)
        ? hospital.departments.reduce((sum, department) => sum + (Array.isArray(department.doctors) ? department.doctors.length : 0), 0)
        : 0;

      return `
        <div class="rounded-3xl border border-brand-700 bg-brand-900 p-5 shadow-sm">
          <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.2em] text-brand-200">${hospital.hospital_id}</p>
              <h3 class="mt-2 text-xl font-semibold text-brand-50">${escapeHtml(hospital.name)}</h3>
              <p class="mt-1 text-sm text-brand-200">${escapeHtml(hospital.location)}</p>
            </div>
            <div class="flex flex-wrap items-center gap-2">${emergencyBadge}</div>
          </div>
          <div class="mt-4 grid gap-3 sm:grid-cols-3">
            <span class="rounded-2xl bg-brand-800 px-3 py-2 text-sm text-brand-100">Branches: ${branchCount}</span>
            <span class="rounded-2xl bg-brand-800 px-3 py-2 text-sm text-brand-100">Departments: ${departmentCount}</span>
            <span class="rounded-2xl bg-brand-800 px-3 py-2 text-sm text-brand-100">Doctors: ${doctorCount}</span>
          </div>
          <div class="mt-5 flex flex-wrap gap-3 border-t border-brand-700 pt-4">
            <button data-action="edit" data-id="${hospital.hospital_id}" class="rounded-2xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-700">Edit</button>
            <button data-action="delete" data-id="${hospital.hospital_id}" class="rounded-2xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700">Delete</button>
          </div>
        </div>
      `;
    })
    .join('');

  hospitalListElement.innerHTML = `<div class="space-y-4">${rows}</div>`;
}

function getHospitalById(hospitalId) {
  return hospitals.find((hospital) => hospital.hospital_id === hospitalId);
}

function beginEditHospital(hospitalId) {
  const hospital = getHospitalById(hospitalId);
  if (!hospital) {
    showFeedback('Hospital not found.', true);
    return;
  }

  editingHospitalId = hospitalId;
  formTitle.textContent = 'Edit Hospital';
  formDescription.textContent = 'Update the hospital details and save to keep the changes.';
  saveHospitalButton.textContent = 'Update Hospital';
  cancelEditButton.classList.remove('hidden');
  populateForm(hospital);
  formFeedback.textContent = '';
}

function removeHospital(hospitalId) {
  const hospital = getHospitalById(hospitalId);
  if (!hospital) {
    showFeedback('Selected hospital does not exist.', true);
    return;
  }

  const confirmed = window.confirm(`Delete ${hospital.name}? This action cannot be undone.`);
  if (!confirmed) {
    return;
  }

  hospitals = hospitals.filter((item) => item.hospital_id !== hospitalId);
  saveHospitals();
  renderHospitals();
  resetForm();
  showFeedback('Hospital deleted successfully.', false);
}

hospitalListElement.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  const action = button.dataset.action;
  const hospitalId = button.dataset.id;
  if (!action || !hospitalId) return;

  if (action === 'edit') {
    beginEditHospital(hospitalId);
  } else if (action === 'delete') {
    removeHospital(hospitalId);
  }
});

hospitalForm.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (!button) return;

  switch (button.dataset.action) {
    case 'add-branch':
      addBranch();
      break;
    case 'remove-branch':
      button.closest('[data-branch-row]')?.remove();
      break;
    case 'add-department':
      addDepartment();
      break;
    case 'remove-department':
      button.closest('[data-department-card]')?.remove();
      break;
    case 'add-doctor': {
      const departmentCard = button.closest('[data-department-card]');
      const departmentId = departmentCard?.dataset.departmentCard;
      const doctorContainer = departmentCard?.querySelector('.department-doctors');
      if (doctorContainer && departmentId) {
        doctorContainer.appendChild(createDoctorRow(departmentId));
      }
      break;
    }
    case 'remove-doctor':
      button.closest('[data-doctor-row]')?.remove();
      break;
    default:
      return;
  }

  updateLiveSummary();
});

hospitalForm.addEventListener('input', updateLiveSummary);

hospitalForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const rawId = hospitalIdInput.value.trim();
  const name = hospitalNameInput.value.trim();
  const location = hospitalLocationInput.value.trim();
  const emergency = hospitalEmergencyInput.checked;
  const branches = gatherBranches();
  const departments = gatherDepartments();

  if (!name) {
    showFeedback('Hospital name is required.');
    return;
  }

  if (!location) {
    showFeedback('Hospital main location is required.');
    return;
  }

  if (!departments.length) {
    showFeedback('At least one department is required.');
    return;
  }

  for (const department of departments) {
    if (!department.name) {
      showFeedback('Each department must have a name.');
      return;
    }
    if (!department.doctors.length) {
      showFeedback(`Department "${department.name || 'Unnamed'}" must have at least one doctor.`);
      return;
    }
    for (const doctor of department.doctors) {
      if (!doctor.name) {
        showFeedback('Each doctor must have a name.');
        return;
      }
      if (!doctor.specialization) {
        showFeedback('Each doctor must have a specialization.');
        return;
      }
      if (!doctor.phone) {
        showFeedback('Each doctor must have a phone number.');
        return;
      }
    }
  }

  const hospitalId = rawId || generateHospitalId();
  const existingById = hospitals.find((hospital) => hospital.hospital_id === hospitalId);

  if (editingHospitalId) {
    if (hospitalId !== editingHospitalId && existingById) {
      showFeedback('A different hospital already uses this ID. Choose another ID or leave it blank.');
      return;
    }

    hospitals = hospitals.map((hospital) => {
      if (hospital.hospital_id === editingHospitalId) {
        return {
          hospital_id: hospitalId,
          name,
          location,
          emergency_services: emergency,
          branches,
          departments
        };
      }
      return hospital;
    });

    saveHospitals();
    renderHospitals();
    showFeedback('Hospital updated successfully.', false);
    resetForm();
    return;
  }

  if (existingById) {
    showFeedback('Hospital ID already exists. Leave the ID blank to generate a new one or choose a unique ID.');
    return;
  }

  hospitals.push({
    hospital_id: hospitalId,
    name,
    location,
    emergency_services: emergency,
    branches,
    departments
  });

  saveHospitals();
  renderHospitals();
  showFeedback('Hospital added successfully.', false);
  resetForm();
});

cancelEditButton.addEventListener('click', resetForm);
newHospitalButton.addEventListener('click', () => {
  resetForm();
  hospitalNameInput.focus();
  updateLiveSummary();
});

window.addEventListener('DOMContentLoaded', () => {
  hospitals = loadHospitals();
  renderHospitals();
  resetForm();
});
