const API_URL = "https://api.restcountries.com/countries/v5";

const countryList = document.getElementById("country-list");
const countryNames = document.getElementById("country-names");
const template = document.getElementById("country-template");
const searchInput = document.getElementById("search-input");
const searchType = document.getElementById("search-type");
const regionSelect = document.getElementById("region-select");
const limitSelect = document.getElementById("limit-select");
const offsetInput = document.getElementById("offset-input");
const responseFields = document.getElementById("response-fields");
const prettyCheckbox = document.getElementById("pretty-checkbox");
const applyBtn = document.getElementById("apply-btn");
const resetBtn = document.getElementById("reset-btn");
const apiUrl = document.getElementById("api-url");
const status = document.getElementById("status");
 


function buildQuery() {
  const params = new URLSearchParams();

  const search = searchInput.value.trim();
  const searchMode = searchType.value;
  if (search) {
    if (searchMode === 'q') {
      params.set('q', search);
    }else{
      params.set(searchMode, search);
    }
  }

  const region = regionSelect.value;
  if(region){
    params.set('region', region)
  }

  params.set('limit', limitSelect.value);

  const offset = Number(offsetInput.value);
  if(offset > 0){
    params.set("offset", offset);
  }
  const fields = responseFields.value.trim();
  if(fields){
    params.set("response_fields", fields);
  }
  if(prettyCheckbox.checked){
    params.set("pretty", "1");
  }
  return params;
}
// console.log(buildQuery().toLocaleString())
function renderCountry(country) {
  const card = template.content.cloneNode(true);
  const commonName = country.names?.common || "Unknow country";
  const officalName = country.names?.offical || "No official name";
  const capital = country.capitals?.[0]?.name || "no capital";
  const region = country.region || "unknown region";
  const population = country.population != null ? country.population.toLocaleString : "unknown";
  const flag = country.flag?.emoji || "flagg";
  const alternates = country.names?.alternates || [];

  card.querySelector("[data-flag]").textContent = flag;
  card.querySelector("[data-common-name").textContent = commonName;
  card.querySelector("[data-official-name]").textContent = officalName;
  card.querySelector("[data-capital]").textContent = capital;
  card.querySelector("[data-region]").textContent = region;
  card.querySelector("[data-population]").textContent = population;
  const alternateContainer = card.querySelector('[data-alternates]');
  if (alternates.length) {
    alternates.forEach(alternate => {
      const span = document.createElement("span")
      span.className = "inline-block bg-blue-200 text-blue-800 px-2 py-1 rounded-md text-sm mr-1 mt-1";
      span.textContent = alternate;
      alternateContainer.appendChild(span);
    });
  } else {
    alternateContainer.textContent = "no alternate names";
  }
  countryList.appendChild(card);
}

function renderCountryName(country) {
  const li = document.createElement('li');
  const flag = country.flag?.emoji || "flag";
  const name = country.names?.common || "Unknown";
  li.textContent = `${flag} ${name}      `
  li.className = "p-2 rounded-lg hover:bg-blue-200 cursor-pointer"
  countryNames.appendChild(li)
}

async function getCountries() {
  try {
    status.textContent = "Loading...";
    status.className = "mb-5 font-semibold text-blue-600";
    countryList.innerHTML = "";
    countryNames.innerHTML = "";
    // Build query
    const params = buildQuery();
    const url = `${API_URL}?${params.toString()}`;
    // Show generated URL
    apiUrl.textContent = url;
    console.log("API REQUEST:", url);
    // Request
    const response = await fetch(url, {
      headers: {
        Authorization: "rc_live_fb0032a897cf4427b38e92ffad519aaf"
      }
    });
    // Error
    if (!response.ok) {
      let message = `HTTP Error: ${response.status}`;
      try {
        const errorData = await response.json();
        console.error("API ERROR:", errorData);
        message = errorData?.errors?.[0]?.message || errorData?.message || message;
      } catch {
        // Response wasn't JSON
      }
      throw new Error(message);
    }

    const data = await response.json();
    console.log("API DATA:", data);
    const countries = data?.data?.objects || [];

    if (!countries.length) {
      status.textContent = "No countries found.";
      status.className = "mb-5 font-semibold text-orange-600";
      return;
    }
    // Render
    countries.forEach(
      (country) => {
        renderCountry(country);
        renderCountryName(country);
      });
    // Meta
    const meta = data?.data?.meta;
    if (meta) {
      status.textContent = `Showing ${meta.count} of ${meta.total} countries`;
    } else {
      status.textContent = `Showing ${countries.length} countries`;
    }
    status.className = "mb-5 font-semibold text-green-600";
  } catch (error) {
    console.error("FETCH ERROR:", error);
    status.textContent = error.message;
    status.className = "mb-5 font-semibold text-red-600";
    countryList.innerHTML = `
      <div class="col-span-full bg-red-50 border border-red-200 text-red-700 rounded-lg p-5">
        <strong>Error:</strong>
        ${error.message}
      </div>
    `;
  }
}

applyBtn.addEventListener("click", getCountries);


searchInput.addEventListener("keydown",
  (event) => {
    if (event.key === "Enter") {
      getCountries();
    }
  });


resetBtn.addEventListener("click",
  () => {
    searchInput.value = "";
    searchType.value = "q";
    regionSelect.value = "";
    limitSelect.value = "25";
    offsetInput.value = "0";
    responseFields.value = "";
    prettyCheckbox.checked = false;
    getCountries();
  });


getCountries();