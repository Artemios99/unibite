// REGISTER
document.getElementById("registerForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    username: document.getElementById("regUsername").value,
    email: document.getElementById("regEmail").value,
    password: document.getElementById("regPassword").value,
    role: document.getElementById("regRole").value,
  };

  try {
    const res = await fetch("http://localhost:3000/api/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    alert(result.message || result.error);
  } catch (err) {
    console.error(err);
    alert("Register error");
  }
});

// LOGIN
document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const data = {
    email: document.getElementById("loginEmail").value,
    password: document.getElementById("loginPassword").value,
  };

  try {
    const res = await fetch("http://localhost:3000/api/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });

    const result = await res.json();

    if (result.user) {
      localStorage.setItem("user", JSON.stringify(result.user));
      alert("Σύνδεση επιτυχής!");

      // 🔥 ΣΙΓΟΥΡΟ REDIRECT
      window.location.href = "/unibite/frontend/index.html";
    } else {
      alert(result.error);
    }
  } catch (err) {
    console.error(err);
    alert("Login error");
  }
});