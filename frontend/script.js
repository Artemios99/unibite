const mealForm = document.getElementById("mealForm");
const mealsList = document.getElementById("mealsList");

async function loadMeals() {
  try {
    const response = await fetch("http://localhost:3000/api/meals");
    const meals = await response.json();

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
        <button onclick="deleteMeal(${meal.id})">Διαγραφή</button>
      `;

      mealsList.appendChild(card);
    });
  } catch (error) {
    console.error(error);
    mealsList.innerHTML = "<p>Σφάλμα φόρτωσης αγγελιών.</p>";
  }
}

mealForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mealData = {
    user_id: 1,
    title: document.getElementById("title").value,
    description: document.getElementById("description").value,
    portions: document.getElementById("portions").value,
    location: document.getElementById("location").value,
    pickup_time: document.getElementById("pickup_time").value,
  };

  try {
    await fetch("http://localhost:3000/api/meals", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(mealData),
    });

    mealForm.reset();
    loadMeals();
  } catch (error) {
    console.error(error);
    alert("Σφάλμα σύνδεσης με server");
  }
});

async function deleteMeal(id) {
  const confirmDelete = confirm("Θέλεις σίγουρα να διαγράψεις αυτή την αγγελία;");

  if (!confirmDelete) return;

  try {
    await fetch(`http://localhost:3000/api/meals/${id}`, {
      method: "DELETE",
    });

    loadMeals();
  } catch (error) {
    console.error(error);
    alert("Σφάλμα στη διαγραφή");
  }
}

loadMeals();