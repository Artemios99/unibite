const mealForm = document.getElementById("mealForm");
const mealsList = document.getElementById("mealsList");
const requestsList = document.getElementById("requestsList");

const loggedUser = JSON.parse(localStorage.getItem("user"));
let editMealId = null;

if (!loggedUser) {
  window.location.href = "login.html";
}

document.getElementById("userInfo").innerText =
  loggedUser.username + " (" + loggedUser.role + ")";

if (loggedUser.role !== "cook") {
  document.getElementById("addMealSection").style.display = "none";
}

if (loggedUser.role !== "consumer") {
  document.getElementById("consumerTools").style.display = "none";
}

if (loggedUser.role === "cook") {
  const consumerLayout = document.querySelector(".consumer-layout");

  if (consumerLayout) {
    consumerLayout.style.display = "none";
  }
}

let selectedMealId = null;
let selectedMealPortions = 0;
let allMeals = [];

let map;
let pickMap;

let markers = [];
let userMarker = null;
let pickMarker = null;

let selectedLat = null;
let selectedLng = null;

// =====================
// MAIN MAP
// =====================
function initMap() {
  const mapDiv = document.getElementById("map");

  if (!mapDiv || loggedUser.role !== "consumer") return;

  map = L.map("map", {
    fullscreenControl: true,
  }).setView([38.2885, 21.7889], 14);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(map);
}

// =====================
// PICK MAP FOR COOK
// =====================
function initPickMap() {
  const pickMapDiv = document.getElementById("pickMap");

  if (!pickMapDiv || loggedUser.role !== "cook") return;

  pickMap = L.map("pickMap").setView([38.2885, 21.7889], 15);

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap",
  }).addTo(pickMap);

  pickMap.on("click", (e) => {
    selectedLat = e.latlng.lat;
    selectedLng = e.latlng.lng;

    if (pickMarker) {
      pickMap.removeLayer(pickMarker);
    }

    pickMarker = L.marker([selectedLat, selectedLng], {
      draggable: true,
    }).addTo(pickMap);

    pickMarker.bindPopup("Σημείο παραλαβής").openPopup();

    pickMarker.on("dragend", function (e) {
      const position = e.target.getLatLng();
      selectedLat = position.lat;
      selectedLng = position.lng;
    });
  });
}

// =====================
// SEARCH PICKUP LOCATION
// =====================
async function searchPickupLocation() {
  const address = document.getElementById("location").value.trim();

  if (!address) {
    alert("Γράψε πρώτα μια διεύθυνση.");
    return;
  }

  const coords = await getCoordinates(address);

  if (!coords) {
    alert("Δεν βρέθηκε η διεύθυνση.");
    return;
  }

  selectedLat = coords.lat;
  selectedLng = coords.lng;

  pickMap.setView([selectedLat, selectedLng], 17);

  if (pickMarker) {
    pickMap.removeLayer(pickMarker);
  }

  pickMarker = L.marker([selectedLat, selectedLng], {
    draggable: true,
  }).addTo(pickMap);

  pickMarker.bindPopup("Διόρθωσε το σημείο αν χρειάζεται").openPopup();

  pickMarker.on("dragend", function (e) {
    const position = e.target.getLatLng();
    selectedLat = position.lat;
    selectedLng = position.lng;
  });
}

// =====================
// GEOCODING
// =====================
async function getCoordinates(address) {
  try {
    const fullAddress = address + ", Patras, Greece";

    const url =
      "https://nominatim.openstreetmap.org/search?format=json&q=" +
      encodeURIComponent(fullAddress);

    const res = await fetch(url);
    const data = await res.json();

    if (data.length === 0) return null;

    return {
      lat: Number(data[0].lat),
      lng: Number(data[0].lon),
    };
  } catch (err) {
    console.log("Geocoding error:", err);
    return null;
  }
}

// =====================
// DISTANCE
// =====================
function getDistanceKm(lat1, lon1, lat2, lon2) {
  const R = 6371;

  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}

// =====================
// LOAD MEALS
// =====================
async function loadMeals() {
  const res = await fetch("http://localhost:3000/api/meals");
  allMeals = await res.json();

  if (loggedUser.role === "cook") {
    const cookMeals = allMeals.filter(
      (meal) => Number(meal.user_id) === Number(loggedUser.id)
    );

    renderMeals(cookMeals);
  } else {
    renderMeals(allMeals);
  }

  if (loggedUser.role === "consumer") {
    renderMap(allMeals);
  }
}

// =====================
// RENDER MEALS
// =====================
function renderMeals(meals) {
  mealsList.innerHTML = "";

  if (meals.length === 0) {
    mealsList.innerHTML = "<p>Δεν υπάρχουν αγγελίες τελευταίων 48 ωρών.</p>";
    return;
  }

  meals.forEach((meal) => {
    const div = document.createElement("div");
    const isEmpty = Number(meal.portions) === 0;
    const allergens = parseAllergens(meal.allergens);

    div.className = isEmpty ? "meal-card empty-meal" : "meal-card";

    div.innerHTML = `
      <h3>${meal.title}</h3>
      <p>${meal.description}</p>
      <p><b>Μάγειρας:</b> ${meal.cook_name || "Άγνωστος"}</p>
      <p><b>Μερίδες:</b> ${meal.portions}</p>
      <p><b>Τοποθεσία:</b> ${meal.location || "Δεν δηλώθηκε"}</p>
      <p><b>Παραλαβή:</b> ${formatDate(meal.pickup_time)}</p>
      <p><b>Τιμή:</b> ${meal.price}€</p>

      <details class="allergens-dropdown">
        <summary>Δες αλλεργιογόνα</summary>
        <p>
          ${
            allergens.length > 0
              ? allergens.join(", ")
              : "Δεν δηλώθηκαν αλλεργιογόνα"
          }
        </p>
      </details>

      ${isEmpty ? `<p class="empty-label">Εξαντλήθηκε</p>` : ""}

      ${
        Number(meal.user_id) === Number(loggedUser.id)
          ? `
            <button onclick="editMeal(${meal.id})">Επεξεργασία</button>
            <button onclick="deleteMeal(${meal.id})">Διαγραφή</button>
          `
          : ""
      }

      ${
        loggedUser.role === "consumer" && !isEmpty
          ? `<button onclick="openRequest(${meal.id}, '${escapeText(
              meal.title
            )}', ${meal.portions})">Ζήτηση</button>`
          : ""
      }
    `;

    mealsList.appendChild(div);
  });
}

// =====================
// RENDER MAP
// =====================
function renderMap(meals) {
  if (!map) return;

  markers.forEach((marker) => map.removeLayer(marker));
  markers = [];

  meals.forEach((meal) => {
    if (!meal.latitude || !meal.longitude) return;

    const isEmpty = Number(meal.portions) === 0;

    const marker = L.marker([meal.latitude, meal.longitude], {
      title: meal.title,
    }).addTo(map);

    marker.bindPopup(`
      <b>${meal.title}</b><br>
      ${meal.location || ""}<br>
      Μερίδες: ${meal.portions}<br>
      ${isEmpty ? "<b>Εξαντλήθηκε</b>" : ""}
    `);

    markers.push(marker);
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

// =====================
// SORT BY DISTANCE
// =====================
async function sortByDistance() {
  const address = document.getElementById("userLocation").value.trim();

  if (!address) {
    alert("Γράψε πρώτα τη διεύθυνσή σου.");
    return;
  }

  const coords = await getCoordinates(address);

  if (!coords) {
    alert("Δεν βρέθηκε η διεύθυνση. Δοκίμασε π.χ. CEID, Πάτρα.");
    return;
  }

  if (userMarker) {
    map.removeLayer(userMarker);
  }

  const userIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
    shadowSize: [41, 41],
  });

  userMarker = L.marker([coords.lat, coords.lng], {
    icon: userIcon,
  }).addTo(map);

  userMarker.bindPopup("<b>Η τοποθεσία σου</b>").openPopup();

  const sorted = [...allMeals].sort((a, b) => {
    if (!a.latitude || !a.longitude) return 1;
    if (!b.latitude || !b.longitude) return -1;

    const distA = getDistanceKm(
      coords.lat,
      coords.lng,
      Number(a.latitude),
      Number(a.longitude)
    );

    const distB = getDistanceKm(
      coords.lat,
      coords.lng,
      Number(b.latitude),
      Number(b.longitude)
    );

    return distA - distB;
  });

  renderMealsWithDistance(sorted, coords);
  renderMap(sorted);

  map.setView([coords.lat, coords.lng], 14);
}

// =====================
// RENDER MEALS WITH DISTANCE
// =====================
function renderMealsWithDistance(meals, coords) {
  mealsList.innerHTML = "";

  meals.forEach((meal) => {
    const div = document.createElement("div");
    const isEmpty = Number(meal.portions) === 0;
    const allergens = parseAllergens(meal.allergens);

    let distanceText = "Άγνωστη απόσταση";

    if (meal.latitude && meal.longitude) {
      const distance = getDistanceKm(
        coords.lat,
        coords.lng,
        Number(meal.latitude),
        Number(meal.longitude)
      );

      distanceText = distance.toFixed(2) + " km";
    }

    div.className = isEmpty ? "meal-card empty-meal" : "meal-card";

    div.innerHTML = `
      <h3>${meal.title}</h3>
      <p>${meal.description}</p>
      <p><b>Μάγειρας:</b> ${meal.cook_name || "Άγνωστος"}</p>
      <p><b>Μερίδες:</b> ${meal.portions}</p>
      <p><b>Τοποθεσία:</b> ${meal.location || "Δεν δηλώθηκε"}</p>
      <p><b>Απόσταση:</b> ${distanceText}</p>
      <p><b>Παραλαβή:</b> ${formatDate(meal.pickup_time)}</p>
      <p><b>Τιμή:</b> ${meal.price}€</p>

      <details class="allergens-dropdown">
        <summary>Δες αλλεργιογόνα</summary>
        <p>
          ${
            allergens.length > 0
              ? allergens.join(", ")
              : "Δεν δηλώθηκαν αλλεργιογόνα"
          }
        </p>
      </details>

      ${isEmpty ? `<p class="empty-label">Εξαντλήθηκε</p>` : ""}

      ${
        Number(meal.user_id) === Number(loggedUser.id)
          ? `
            <button onclick="editMeal(${meal.id})">Επεξεργασία</button>
            <button onclick="deleteMeal(${meal.id})">Διαγραφή</button>
          `
          : ""
      }

      ${
        loggedUser.role === "consumer" && !isEmpty
          ? `<button onclick="openRequest(${meal.id}, '${escapeText(
              meal.title
            )}', ${meal.portions})">Ζήτηση</button>`
          : ""
      }
    `;

    mealsList.appendChild(div);
  });
}

// =====================
// ADD / UPDATE MEAL
// =====================
mealForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const selectedAllergens = Array.from(
    document.querySelectorAll('input[name="allergen"]:checked')
  ).map((checkbox) => checkbox.value);

  const data = {
    user_id: loggedUser.id,
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    portions: document.getElementById("portions").value,
    location: document.getElementById("location").value,
    pickup_time: document.getElementById("pickup_time").value,
    price: document.getElementById("price").value,
    latitude: selectedLat,
    longitude: selectedLng,
    allergens: JSON.stringify(selectedAllergens),
  };

  if (editMealId) {
    await fetch(`http://localhost:3000/api/meals/${editMealId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    alert("Το φαγητό ενημερώθηκε!");
  } else {
    await fetch("http://localhost:3000/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    alert("Το φαγητό προστέθηκε!");
  }

  mealForm.reset();

  clearAllergenCheckboxes();

  editMealId = null;
  selectedLat = null;
  selectedLng = null;

  document.querySelector("#mealForm button[type='submit']").innerText =
    "Προσθήκη";

  loadMeals();
});

// =====================
// EDIT MEAL
// =====================
function editMeal(id) {
  const meal = allMeals.find((m) => Number(m.id) === Number(id));

  if (!meal) {
    alert("Δεν βρέθηκε το φαγητό.");
    return;
  }

  editMealId = id;

  document.getElementById("title").value = meal.title;
  document.getElementById("description").value = meal.description;
  document.getElementById("portions").value = meal.portions;
  document.getElementById("location").value = meal.location || "";

  document.getElementById("pickup_time").value = meal.pickup_time
    ? meal.pickup_time.slice(0, 16)
    : "";

  document.getElementById("price").value = meal.price;

  selectedLat = meal.latitude;
  selectedLng = meal.longitude;

  clearAllergenCheckboxes();

  const allergens = parseAllergens(meal.allergens);

  document.querySelectorAll('input[name="allergen"]').forEach((checkbox) => {
    checkbox.checked = allergens.includes(checkbox.value);
  });

  document.querySelector("#mealForm button[type='submit']").innerText =
    "Ενημέρωση φαγητού";

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// =====================
// DELETE MEAL
// =====================

async function deleteMeal(id) {

  const confirmDelete = confirm(
    "Θέλεις σίγουρα να διαγράψεις το φαγητό;"
  );

  if (!confirmDelete) return;

  const res = await fetch(
    `http://localhost:3000/api/meals/${id}`,
    {
      method: "DELETE",
    }
  );

  if (!res.ok) {
    alert("Σφάλμα στη διαγραφή");
    return;
  }

  alert("Το φαγητό διαγράφηκε!");

  loadMeals();
}

// =====================
// MODAL
// =====================
function openRequest(id, title, portions) {
  selectedMealId = id;
  selectedMealPortions = portions;

  document.getElementById("requestModal").style.display = "block";
  document.getElementById("mealTitle").innerText = title;

  const portionSelect = document.getElementById("portionSelect");
  portionSelect.innerHTML = "";

  for (let i = 1; i <= selectedMealPortions; i++) {
    portionSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }
}

function closeModal() {
  document.getElementById("requestModal").style.display = "none";
}

// =====================
// SEND REQUEST
// =====================
async function submitRequest() {
  const data = {
    meal_id: selectedMealId,
    consumer_id: loggedUser.id,
    portions: document.getElementById("portionSelect").value,
    note: document.getElementById("requestNote").value,
  };

  const res = await fetch("http://localhost:3000/api/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    alert("Σφάλμα στο request");
    return;
  }

  alert("Το αίτημα στάλθηκε!");
  closeModal();
}

// =====================
// LOAD REQUESTS FOR COOK
// =====================
async function loadRequests() {
  if (loggedUser.role !== "cook") return;

  const res = await fetch(`http://localhost:3000/api/requests/${loggedUser.id}`);
  const data = await res.json();

  const pendingRequests = data.filter((r) => r.status === "pending");
  const approvedRequests = data.filter((r) => r.status === "accepted");

  requestsList.innerHTML = `
    <div class="requests-columns">

      <div class="requests-column">
        <h3>Νέα αιτήματα</h3>
        <div id="pendingRequestsList"></div>
      </div>

      <div class="requests-column">
        <h3>Εγκεκριμένα αιτήματα</h3>
        <div id="approvedRequestsList"></div>
      </div>

    </div>
  `;

  const pendingList = document.getElementById("pendingRequestsList");
  const approvedList = document.getElementById("approvedRequestsList");

  if (pendingRequests.length === 0) {
    pendingList.innerHTML = "<p>Δεν υπάρχουν νέα αιτήματα.</p>";
  }

  if (approvedRequests.length === 0) {
    approvedList.innerHTML = "<p>Δεν υπάρχουν εγκεκριμένα αιτήματα.</p>";
  }

  pendingRequests.forEach((r) => {
    pendingList.innerHTML += `
      <div class="request-card">
        <p>
          <b>${r.username}</b> ζητά 
          <b>${r.portions}</b> μερίδες από 
          "<b>${r.title}</b>"
        </p>

        <p>${r.note || ""}</p>

        <button onclick="acceptRequest(${r.id}, ${r.portions})">
          Accept
        </button>

        <button onclick="rejectRequest(${r.id})">
          Reject
        </button>
      </div>
    `;
  });

  approvedRequests.forEach((r) => {
    approvedList.innerHTML += `
      <div class="request-card">
        <p>
          <b>${r.username}</b> έχει εγκριθεί για 
          <b>${r.portions}</b> μερίδες από 
          "<b>${r.title}</b>"
        </p>

        <p>${r.note || ""}</p>

        ${
          Number(r.picked_up) === 1
            ? `<p class="picked-label">✅ Παραλήφθηκε</p>`
            : `
              <button onclick="pickupRequest(${r.id})">
                Παραλήφθηκε
              </button>

              <button onclick="notPickupRequest(${r.id})">
                Δεν παραλήφθηκε
              </button>
            `
        }
      </div>
    `;
  });
}

// =====================
// ACCEPT
// =====================
async function acceptRequest(id, portions) {
  const res = await fetch("http://localhost:3000/api/requests/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: id,
      portions: portions,
    }),
  });

  if (!res.ok) {
    alert("Δεν υπάρχουν αρκετές μερίδες ή έγινε σφάλμα.");
    return;
  }

  alert("Το αίτημα εγκρίθηκε!");

  await loadMeals();
  await loadRequests();
}

// =====================
// REJECT
// =====================
async function rejectRequest(id) {
  await fetch("http://localhost:3000/api/requests/reject", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: id,
    }),
  });

  alert("Απόρριψη!");
  loadRequests();
}

// =====================
// PICKUP REQUEST
// =====================
async function pickupRequest(id) {
  const res = await fetch("http://localhost:3000/api/requests/pickup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: id,
    }),
  });

  if (!res.ok) {
    alert("Σφάλμα στην παραλαβή");
    return;
  }

  alert("Η παραλαβή ολοκληρώθηκε!");
  loadRequests();
}

// =====================
// HELPERS
// =====================
function formatDate(date) {
  if (!date) return "Δεν δηλώθηκε";
  return new Date(date).toLocaleString("el-GR");
}

function escapeText(text) {
  return text.replace(/'/g, "\\'");
}

function parseAllergens(allergens) {
  if (!allergens) return [];

  if (Array.isArray(allergens)) {
    return allergens;
  }

  try {
    return JSON.parse(allergens);
  } catch (err) {
    return [];
  }
}

function clearAllergenCheckboxes() {
  document.querySelectorAll('input[name="allergen"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
}

// =====================
// LOGOUT
// =====================
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

initMap();
initPickMap();
loadMeals();
loadRequests();