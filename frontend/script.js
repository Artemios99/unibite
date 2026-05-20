const mealForm = document.getElementById("mealForm");
const mealsList = document.getElementById("mealsList");
const requestsList = document.getElementById("requestsList");
const ratingsList = document.getElementById("ratingsList");

const loggedUser = JSON.parse(localStorage.getItem("user"));

if (!loggedUser) {
  window.location.href = "login.html";
}

document.getElementById("userInfo").innerText =
  loggedUser.username + " (" + loggedUser.role + ")";

loadUserPoints();
// =====================
// LOAD USER POINTS
// =====================
async function loadUserPoints() {

  const res = await fetch(
    `http://localhost:3000/api/users/${loggedUser.id}`
  );

  const user = await res.json();

   console.log("USER POINTS:", user);

  document.getElementById("userPoints").innerHTML = `
    ⭐ ${user.points} points
  `;
}

if (loggedUser.role !== "cook") {
  document.getElementById("addMealSection").style.display = "none";
}

if (loggedUser.role !== "consumer") {
  document.getElementById("consumerTools").style.display = "none";
}

if (loggedUser.role !== "consumer") {
  document.getElementById("ratingsSection").style.display = "none";
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
let editingMealId = null;

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
// PICK MAP
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
// SEARCH LOCATION
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

  pickMarker.bindPopup("Διόρθωσε το σημείο").openPopup();

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
    console.log(err);
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

  renderMeals(allMeals);

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
    mealsList.innerHTML = "<p>Δεν υπάρχουν αγγελίες.</p>";
    return;
  }

  meals.forEach((meal) => {
    const div = document.createElement("div");
    const isEmpty = Number(meal.portions) === 0;

    div.className = isEmpty ? "meal-card empty-meal" : "meal-card";

    div.innerHTML = `
      <h3>${meal.title}</h3>

      <p>${meal.description}</p>

      <p><b>Μάγειρας:</b> ${meal.cook_name}</p>

      <p><b>Μερίδες:</b> ${meal.portions}</p>

      <p><b>Τοποθεσία:</b> ${meal.location}</p>

      <p><b>Τιμή:</b> ${meal.price}€</p>

      ${
        meal.allergens
          ? `<p><b>Αλλεργιογόνα:</b> ${meal.allergens}</p>`
          : ""
      }

      ${isEmpty ? `<p class="empty-label">Εξαντλήθηκε</p>` : ""}

      ${
        Number(meal.user_id) === Number(loggedUser.id)
          ? `
            <div class="meal-actions">
              <button onclick="editMeal(${meal.id})">
                ✏️ Επεξεργασία
              </button>

              <button onclick="deleteMeal(${meal.id})">
                🗑 Διαγραφή
              </button>
            </div>
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

    const marker = L.marker([meal.latitude, meal.longitude]).addTo(map);

    marker.bindPopup(`
      <b>${meal.title}</b><br>
      ${meal.location}
    `);

    markers.push(marker);
  });

  if (markers.length > 0) {
    const group = L.featureGroup(markers);
    map.fitBounds(group.getBounds().pad(0.2));
  }
}

// =====================
// SORT DISTANCE
// =====================
async function sortByDistance() {
  const address = document.getElementById("userLocation").value.trim();

  if (!address) {
    alert("Γράψε τη διεύθυνσή σου.");
    return;
  }

  const coords = await getCoordinates(address);

  if (!coords) {
    alert("Δεν βρέθηκε η διεύθυνση.");
    return;
  }

  const userIcon = L.icon({
    iconUrl:
      "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
    shadowUrl:
      "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
    iconSize: [25, 41],
    iconAnchor: [12, 41],
  });

  if (userMarker) {
    map.removeLayer(userMarker);
  }

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

  renderMeals(sorted);
  renderMap(sorted);

  map.setView([coords.lat, coords.lng], 14);
}

// =====================
// ADD / UPDATE MEAL
// =====================
mealForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!selectedLat || !selectedLng) {
    alert("Επίλεξε σημείο στον χάρτη.");
    return;
  }

  const allergens = [];

  document
    .querySelectorAll('input[name="allergen"]:checked')
    .forEach((checkbox) => {
      allergens.push(checkbox.value);
    });

  const data = {
    user_id: loggedUser.id,
    title: title.value,
    description: description.value,
    portions: portions.value,
    location: location.value,
    latitude: selectedLat,
    longitude: selectedLng,
    pickup_time: pickup_time.value,
    price: price.value,
    allergens: allergens.join(", "),
  };

  if (editingMealId) {
    await fetch(`http://localhost:3000/api/meals/${editingMealId}`, {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    editingMealId = null;
    alert("Η αγγελία ενημερώθηκε!");
  } else {
    await fetch("http://localhost:3000/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    alert("Η αγγελία προστέθηκε!");
  }

  mealForm.reset();

  document
    .querySelectorAll('input[name="allergen"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  if (pickMarker) {
    pickMap.removeLayer(pickMarker);
    pickMarker = null;
  }

  selectedLat = null;
  selectedLng = null;
  editingMealId = null;

  loadMeals();
});

// =====================
// DELETE
// =====================
async function deleteMeal(id) {
  await fetch(`http://localhost:3000/api/meals/${id}`, {
    method: "DELETE",
  });

  loadMeals();
}

// =====================
// EDIT MEAL
// =====================
function editMeal(id) {
  const meal = allMeals.find((m) => Number(m.id) === Number(id));

  if (!meal) return;

  title.value = meal.title;
  description.value = meal.description;
  portions.value = meal.portions;
  location.value = meal.location;

  pickup_time.value = meal.pickup_time ? meal.pickup_time.slice(0, 16) : "";

  price.value = meal.price;

  selectedLat = meal.latitude;
  selectedLng = meal.longitude;

  document
    .querySelectorAll('input[name="allergen"]')
    .forEach((checkbox) => {
      checkbox.checked = false;
    });

  if (meal.allergens) {
    const allergensArray = meal.allergens
      .split(",")
      .map((a) => a.trim());

    document
      .querySelectorAll('input[name="allergen"]')
      .forEach((checkbox) => {
        checkbox.checked = allergensArray.includes(checkbox.value);
      });
  }

  if (pickMap && meal.latitude && meal.longitude) {
    pickMap.setView([meal.latitude, meal.longitude], 17);

    if (pickMarker) {
      pickMap.removeLayer(pickMarker);
    }

    pickMarker = L.marker([meal.latitude, meal.longitude], {
      draggable: true,
    }).addTo(pickMap);

    pickMarker.bindPopup("Διόρθωσε το σημείο").openPopup();

    pickMarker.on("dragend", function (e) {
      const pos = e.target.getLatLng();
      selectedLat = pos.lat;
      selectedLng = pos.lng;
    });
  }

  editingMealId = id;

  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
}

// =====================
// MODAL
// =====================
function openRequest(id, title, portions) {
  selectedMealId = id;
  selectedMealPortions = portions;

  requestModal.style.display = "block";
  mealTitle.innerText = title;

  portionSelect.innerHTML = "";

  for (let i = 1; i <= portions; i++) {
    portionSelect.innerHTML += `
      <option value="${i}">${i}</option>
    `;
  }
}

function closeModal() {
  requestModal.style.display = "none";
}

// =====================
// SEND REQUEST
// =====================
async function submitRequest() {
  const data = {
    meal_id: selectedMealId,
    consumer_id: loggedUser.id,
    portions: portionSelect.value,
    note: requestNote.value,
  };

  const res = await fetch("http://localhost:3000/api/requests", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    alert("Σφάλμα.");
    return;
  }

  alert("Το αίτημα στάλθηκε!");

  closeModal();
  loadRequests();
}

// =====================
// LOAD REQUESTS
// =====================
async function loadRequests() {
  requestsList.innerHTML = "";

  if (loggedUser.role === "cook") {
    const res = await fetch(
      `http://localhost:3000/api/requests/${loggedUser.id}`
    );

    const data = await res.json();

    if (data.length === 0) {
      requestsList.innerHTML = "<p>Δεν υπάρχουν αιτήματα.</p>";
      return;
    }

    data.forEach((r) => {
      requestsList.innerHTML += `
        <div class="request-card">

          <p>
            <b>${r.username}</b> ζητά 
            <b>${r.portions}</b> μερίδες από 
            "<b>${r.title}</b>"
          </p>

          <p>${r.note || ""}</p>

          <p><b>Status:</b> ${getStatusLabel(r.status)}</p>

          ${
            r.status === "pending"
              ? `
              <button onclick="acceptRequest(${r.id}, ${r.portions})">
                Αποδοχή
              </button>

              <button onclick="rejectRequest(${r.id})">
                Απόρριψη
              </button>
            `
              : ""
          }

          ${
            r.status === "accepted" && r.picked_up == null
              ? `
              <button onclick="pickupRequest(${r.id})">
                Παραλήφθηκε
              </button>

              <button onclick="notPickupRequest(${r.id})">
                Δεν παραλήφθηκε
              </button>
            `
              : ""
          }

          ${
            r.picked_up !== null && Number(r.picked_up) === 1
              ? `<p class="picked-label">✅ Παραλήφθηκε</p>`
              : ""
          }

          ${
            r.picked_up !== null && Number(r.picked_up) === 0
              ? `<p class="rejected-label">❌ Δεν παραλήφθηκε</p>`
              : ""
          }

        </div>
      `;
    });

    return;
  }

  if (loggedUser.role === "consumer") {
    const res = await fetch(
      `http://localhost:3000/api/myrequests/${loggedUser.id}`
    );

    const data = await res.json();

    if (data.length === 0) {
      requestsList.innerHTML = "<p>Δεν έχεις κάνει ακόμα αιτήματα.</p>";
      return;
    }

    data.forEach((r) => {
      requestsList.innerHTML += `
        <div class="request-card">

          <h3>${r.title}</h3>

          <p>${r.description || ""}</p>

          <p><b>Μάγειρας:</b> ${r.cook_name}</p>

          <p><b>Μερίδες που ζήτησες:</b> ${r.portions}</p>

          <p><b>Τοποθεσία:</b> ${r.location || "Δεν δηλώθηκε"}</p>

          <p><b>Ώρα παραλαβής:</b> ${formatDate(r.pickup_time)}</p>

          <p><b>Τιμή:</b> ${r.price}€</p>

          <p>
            <b>Κατάσταση:</b>
            <span class="status-badge ${r.status}">
              ${getStatusLabel(r.status)}
            </span>
          </p>

          ${
            r.picked_up !== null && Number(r.picked_up) === 1
              ? `<p class="picked-label">✅ Ο cook σημείωσε ότι παραλήφθηκε.</p>`
              : ""
          }

          ${
            r.picked_up !== null && Number(r.picked_up) === 0
              ? `<p class="rejected-label">❌ Ο cook σημείωσε ότι δεν παραλήφθηκε.</p>`
              : ""
          }

          ${
            r.status === "completed"
              ? `<p class="completed-label">⭐ Ολοκληρώθηκε με αξιολόγηση.</p>`
              : ""
          }

        </div>
      `;
    });
  }
}

// =====================
// ACCEPT
// =====================
async function acceptRequest(id, portions) {
  await fetch("http://localhost:3000/api/requests/accept", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: id,
      portions: portions,
    }),
  });

  loadMeals();
  loadRequests();
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

  loadRequests();
}

// =====================
// PICKUP
// =====================
async function pickupRequest(id) {
  await fetch("http://localhost:3000/api/requests/pickup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: id,
    }),
  });

  loadRequests();
}

// =====================
// NOT PICKUP
// =====================
async function notPickupRequest(id) {
  await fetch("http://localhost:3000/api/requests/not-pickup", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: id,
    }),
  });

  loadRequests();
}

// =====================
// LOAD RATINGS
// =====================
async function loadPendingRatings() {
  if (loggedUser.role !== "consumer") return;

  await fetch(`http://localhost:3000/api/ratings/check-expired/${loggedUser.id}`, {
    method: "POST",
  });

  const res = await fetch(
    `http://localhost:3000/api/ratings/pending/${loggedUser.id}`
  );

  const data = await res.json();

  ratingsList.innerHTML = "";

  if (data.length === 0) {
    ratingsList.innerHTML = "<p>Δεν υπάρχουν αξιολογήσεις.</p>";
    return;
  }

  data.forEach((item) => {
    const hoursPassed = Number(item.hours_passed);
    const hoursLeft = 48 - hoursPassed;

    let warning = "";

    if (hoursLeft > 0) {
      warning = `
        <p class="rating-warning">
          ⚠️ Έχεις περίπου ${hoursLeft} ώρες για να αξιολογήσεις.
          Αν δεν αξιολογήσεις μέσα σε 48 ώρες από την παραλαβή, θα αφαιρεθεί 1 πόντος.
        </p>
      `;
    } else {
      warning = `
        <p class="rating-danger">
          Η προθεσμία των 48 ωρών πέρασε. Αν δεν έχει αφαιρεθεί ήδη, θα αφαιρεθεί 1 πόντος.
        </p>
      `;
    }

    ratingsList.innerHTML += `
      <div class="request-card">
        <h3>${item.title}</h3>

        <p>${item.description || ""}</p>

        <p><b>Μάγειρας:</b> ${item.cook_name}</p>

        ${warning}

        <div class="rating-box">
          <p><b>Επίλεξε βαθμολογία:</b></p>

          <div class="stars">
            <button onclick="submitRating(${item.request_id}, ${item.meal_id}, 1)">★<span>1</span></button>
            <button onclick="submitRating(${item.request_id}, ${item.meal_id}, 2)">★<span>2</span></button>
            <button onclick="submitRating(${item.request_id}, ${item.meal_id}, 3)">★<span>3</span></button>
            <button onclick="submitRating(${item.request_id}, ${item.meal_id}, 4)">★<span>4</span></button>
            <button onclick="submitRating(${item.request_id}, ${item.meal_id}, 5)">★<span>5</span></button>
          </div>
        </div>
      </div>
    `;
  });
}

// =====================
// SUBMIT RATING
// =====================
async function submitRating(requestId, mealId, rating) {
  const res = await fetch("http://localhost:3000/api/ratings", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      request_id: requestId,
      meal_id: mealId,
      user_id: loggedUser.id,
      rating: rating,
    }),
  });

  if (!res.ok) {
    alert("Σφάλμα.");
    return;
  }

  alert("Η αξιολόγηση καταχωρήθηκε!");

  loadPendingRatings();
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

function getStatusLabel(status) {
  if (status === "pending") return "Σε αναμονή";
  if (status === "accepted") return "Εγκρίθηκε";
  if (status === "rejected") return "Απορρίφθηκε";
  if (status === "completed") return "Ολοκληρώθηκε";
  return status;
}

async function loadUserPoints() {

  const res = await fetch(
    `http://localhost:3000/api/users/${loggedUser.id}`
  );

  const user = await res.json();

  console.log(user);

  document.getElementById("userPoints").innerText =
    `⭐ ${user.points} points`;
}

// =====================
// LOGOUT
// =====================
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

// =====================
// TOGGLE REQUESTS
// =====================
function toggleRequests() {
  const list = document.getElementById("requestsList");
  const btn = document.getElementById("toggleRequestsBtn");

  if (list.style.display === "none") {
    list.style.display = "block";
    btn.innerText = "❌ Κλείσιμο";
  } else {
    list.style.display = "none";
    btn.innerText = "📦 Τα αιτήματά μου";
  }
}

initMap();
initPickMap();

loadMeals();
loadRequests();
loadPendingRatings();

if (loggedUser.role === "consumer") {
  setInterval(loadPendingRatings, 5000);
}