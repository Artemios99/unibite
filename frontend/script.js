const mealForm = document.getElementById("mealForm");
const mealsList = document.getElementById("mealsList");

const loggedUser = JSON.parse(localStorage.getItem("user"));

if (!loggedUser) {
  window.location.href = "login.html";
}

// USER INFO
document.getElementById("userInfo").innerText =
  "Logged in as: " + loggedUser.username + " (" + loggedUser.role + ")";

// ROLE CONTROL
if (loggedUser.role !== "cook") {
  mealForm.style.display = "none";
}

// LOAD MEALS
async function loadMeals() {
  const res = await fetch("http://localhost:3000/api/meals");
  const meals = await res.json();

  mealsList.innerHTML = "";

  meals.forEach((meal) => {
    const card = document.createElement("div");
    card.className = "meal-card";

    card.innerHTML = `
      <h3>${meal.title}</h3>
      <p>${meal.description}</p>
      <p><strong>Μερίδες:</strong> ${meal.portions}</p>
      <p><strong>Τοποθεσία:</strong> ${meal.location}</p>
      <p><strong>Παραλαβή:</strong> ${meal.pickup_time}</p>

      ${
        meal.user_id === loggedUser.id
          ? `<button onclick="deleteMeal(${meal.id})">Διαγραφή</button>`
          : ""
      }
    `;

    mealsList.appendChild(card);
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
  };

  await fetch("http://localhost:3000/api/meals", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(mealData),
  });

  mealForm.reset();
  loadMeals();
});

// DELETE MEAL
async function deleteMeal(id) {
  const confirmDelete = confirm("Θέλεις σίγουρα να διαγράψεις;");

  if (!confirmDelete) return;

  await fetch(`http://localhost:3000/api/meals/${id}`, {
    method: "DELETE",
  });

  loadMeals();
}

// LOGOUT
function logout() {
  localStorage.removeItem("user");
  window.location.href = "login.html";
}

loadMeals();