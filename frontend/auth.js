// =====================
// TOASTR SETTINGS
// =====================
toastr.options = {
  closeButton: true,
  progressBar: true,
  positionClass: "toast-top-right",
  timeOut: "2500",
};

// =====================
// REGISTER
// =====================
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

    if (result.message) {
      toastr.success("Η εγγραφή ολοκληρώθηκε με επιτυχία!");

      document.getElementById("registerForm").reset();
      document.getElementById("registerSection").style.display = "none";
      document.getElementById("loginSection").style.display = "block";
    } else {
      toastr.error(result.error || "Αποτυχία εγγραφής");
    }
  } catch (err) {
    console.error(err);
    toastr.error("Σφάλμα κατά την εγγραφή");
  }
});

// =====================
// LOGIN
// =====================
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

      toastr.success("Σύνδεση επιτυχής!");

      setTimeout(() => {
        window.location.replace("index.html");
      }, 1000);
    } else {
      toastr.error(result.error || "Λάθος στοιχεία σύνδεσης");
    }
  } catch (err) {
    console.error(err);
    toastr.error("Σφάλμα σύνδεσης");
  }
});

// =====================
// SHOW / HIDE FORMS
// =====================
const loginSection = document.getElementById("loginSection");
const registerSection = document.getElementById("registerSection");

document.getElementById("showRegisterBtn").addEventListener("click", () => {
  loginSection.style.display = "none";
  registerSection.style.display = "block";
});

document.getElementById("showLoginBtn").addEventListener("click", () => {
  registerSection.style.display = "none";
  loginSection.style.display = "block";
});