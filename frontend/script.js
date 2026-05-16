const mealForm = document.getElementById("mealForm");
const mealsList = document.getElementById("mealsList");
const requestsList = document.getElementById("requestsList");

const loggedUser = JSON.parse(localStorage.getItem("user"));

if (!loggedUser) window.location.href = "login.html";

document.getElementById("userInfo").innerText =
  loggedUser.username + " (" + loggedUser.role + ")";

if (loggedUser.role !== "cook")
  document.getElementById("addMealSection").style.display = "none";

let selectedMealId = null;

// LOAD MEALS
async function loadMeals() {
  const res = await fetch("http://localhost:3000/api/meals");
  const meals = await res.json();

  mealsList.innerHTML = "";

  meals.forEach((meal) => {
    const div = document.createElement("div");

    div.innerHTML = `
      <h3>${meal.title}</h3>
      <p>${meal.description}</p>
      <p>Μερίδες: ${meal.portions}</p>
      <p>Τιμή: ${meal.price}€</p>

      ${
        meal.user_id === loggedUser.id
          ? `<button onclick="deleteMeal(${meal.id})">Διαγραφή</button>`
          : ""
      }

      ${
        loggedUser.role === "consumer"
          ? `<button onclick="openRequest(${meal.id}, '${meal.title}')">Ζήτηση</button>`
          : ""
      }
    `;

    mealsList.appendChild(div);
  });
}

// ADD MEAL
mealForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    user_id: loggedUser.id,
    title: title.value,
    description: description.value,
    portions: portions.value,
    location: location.value,
    pickup_time: pickup_time.value,
    price: price.value,
  };

  await fetch("http://localhost:3000/api/meals", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(data),
  });

  mealForm.reset();
  loadMeals();
});

// DELETE
async function deleteMeal(id) {
  await fetch(`http://localhost:3000/api/meals/${id}`, {
    method: "DELETE",
  });
  loadMeals();
}

// MODAL
function openRequest(id, title) {
  selectedMealId = id;
  requestModal.style.display = "block";
  mealTitle.innerText = title;

  portionSelect.innerHTML = "";
  for (let i = 1; i <= 10; i++) {
    portionSelect.innerHTML += `<option value="${i}">${i}</option>`;
  }
}

function closeModal() {
  requestModal.style.display = "none";
}

// SEND REQUEST
async function submitRequest() {
  await fetch("http://localhost:3000/api/requests", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      meal_id: selectedMealId,
      consumer_id: loggedUser.id,
      portions: portionSelect.value,
      note: requestNote.value,
    }),
  });

  alert("στάλθηκε");
  closeModal();
}

// LOAD REQUESTS
async function loadMyRequests() {
  if (loggedUser.role !== "consumer") return;

  const res = await fetch(`http://localhost:3000/api/myrequests/${loggedUser.id}`);
  const data = await res.json();

  requestsList.innerHTML = "<h3>Οι παραγγελίες μου</h3>";

  data.forEach(r => {
    requestsList.innerHTML += `
      <div>
        <p>Παρήγγειλες ${r.portions} από ${r.title}</p>

        <button onclick="completeRequest(${r.id})">
          Ολοκλήρωση
        </button>
      </div>
    `;
  });
}

// ACCEPT
async function completeRequest(id) {
  await fetch("http://localhost:3000/api/requests/complete", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      request_id: id
    }),
  });

  alert("Ολοκληρώθηκε!");
  loadMyRequests();
}
// LOGOUT
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

loadMeals();
loadRequests();
loadMyRequests();