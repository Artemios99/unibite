const mealForm = document.getElementById("mealForm");
const mealsList = document.getElementById("mealsList");
const requestsList = document.getElementById("requestsList");

const loggedUser = JSON.parse(localStorage.getItem("user"));

if (!loggedUser) {
  window.location.href = "login.html";
}

document.getElementById("userInfo").innerText =
  loggedUser.username + " (" + loggedUser.role + ")";

if (loggedUser.role !== "cook") {
  document.getElementById("addMealSection").style.display = "none";
}

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
      <p>Τοποθεσία: ${meal.location}</p>
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

  const mealData = {
    user_id: loggedUser.id,
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    portions: document.getElementById("portions").value,
    location: document.getElementById("location").value,
    pickup_time: document.getElementById("pickup_time").value,
    price: document.getElementById("price").value,
  };

  await fetch("http://localhost:3000/api/meals", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify(mealData),
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
function openRequest(mealId, title) {
  selectedMealId = mealId;

  document.getElementById("requestModal").style.display = "block";
  document.getElementById("mealTitle").innerText = title;

  const select = document.getElementById("portionSelect");
  select.innerHTML = "";

  for (let i = 1; i <= 10; i++) {
    const option = document.createElement("option");
    option.value = i;
    option.text = i;
    select.appendChild(option);
  }
}

function closeModal() {
  document.getElementById("requestModal").style.display = "none";
}

// SEND REQUEST
async function submitRequest() {
  const portions = document.getElementById("portionSelect").value;
  const time = document.getElementById("requestTime").value;

  await fetch("http://localhost:3000/api/requests", {
    method: "POST",
    headers: {"Content-Type": "application/json"},
    body: JSON.stringify({
      meal_id: selectedMealId,
      consumer_id: loggedUser.id,
      portions,
      time,
    }),
  });

  alert("Αίτημα στάλθηκε!");
  closeModal();
}

// LOAD REQUESTS
async function loadRequests() {
  if (loggedUser.role !== "cook") return;

  const res = await fetch(`http://localhost:3000/api/requests/${loggedUser.id}`);
  const data = await res.json();

  requestsList.innerHTML = "";

  data.forEach(r => {
    const div = document.createElement("div");
    div.innerHTML = `<p>${r.username} ζήτησε το "${r.title}"</p>`;
    requestsList.appendChild(div);
  });
}

// LOGOUT
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

loadMeals();
loadRequests();