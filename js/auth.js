// URL Backenda
const API_URL = "http://localhost:8080/api/auth";

// Selektujemo formu
const registerForm = document.getElementById("registerForm");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 0. UX POBOLJŠANJA - POČETAK PROCESA
    // Selektujemo dugme i Alert box
    const submitBtn = registerForm.querySelector('button[type="submit"]');
    const alertBox = document.getElementById("alertMessage");

    // Sakrij prethodne poruke o greškama (ako ih ima)
    if (alertBox) {
      alertBox.style.display = "none";
      alertBox.className = "";
      alertBox.innerHTML = "";
    }

    // Disable dugme da ne moze da klikne dvaput
    submitBtn.disabled = true;
    const originalBtnText = submitBtn.innerText;
    submitBtn.innerText = "Processing...";

    // 1. Pokupi podatke
    const formData = {
      username: document.getElementById("username").value.trim(),
      firstName: document.getElementById("firstName").value.trim(),
      lastName: document.getElementById("lastName").value.trim(),
      email: document.getElementById("email").value.trim(),
      age: document.getElementById("age").value,
      password: document.getElementById("password").value,
      repeatedPassword: document.getElementById("repeatedPassword").value,
    };

    // 2. VALIDACIJA
    const validationError = validateRegistrationData(formData);
    if (validationError) {
      showAlert(validationError, "danger");
      // Vrati dugme u normalu jer je doslo do greske
      submitBtn.disabled = false;
      submitBtn.innerText = originalBtnText;
      return;
    }

    // Pretvaranje age u broj
    formData.age = parseInt(formData.age);

    try {
      // 3. Slanje na server
      const response = await fetch(`${API_URL}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        // --- USPEH (GLAVNA IZMENA OVDE) ---

        // 1. Sakrij samu formu (da ne zbunjujemo korisnika)
        registerForm.style.display = "none";

        // 2. Prikaži onaj novi div sa porukom o emailu (koji smo dodali u HTML)
        const successMessageDiv = document.getElementById("successMessage");
        if (successMessageDiv) {
          successMessageDiv.style.display = "block";
        }

        // 3. Opciono: Resetuj formu
        registerForm.reset();

        // BITNO: Ovde smo UKLONILI setTimeout i window.location.href!
        // Sada korisnik ostaje na ovoj stranici i gleda poruku "Proverite email".
      } else {
        // --- GREŠKA SA SERVERA ---
        const message = await response.text();
        // Backend verovatno vraća samo tekst, ali za svaki slučaj hvatamo i JSON ako promeniš backend
        let finalMsg = message;
        try {
          const jsonErr = JSON.parse(message);
          if (jsonErr.message) finalMsg = jsonErr.message;
        } catch (e) {}

        showAlert("Registration failed: " + finalMsg, "danger");

        // Vrati dugme u normalu da moze da proba ponovo
        submitBtn.disabled = false;
        submitBtn.innerText = originalBtnText;
      }
    } catch (error) {
      // --- MREŽNA GREŠKA ---
      console.error("Error:", error);
      showAlert("Server is unreachable. Is backend running?", "danger");

      // Vrati dugme u normalu
      submitBtn.disabled = false;
      submitBtn.innerText = originalBtnText;
    }
  });
}

// --- FUNKCIJA ZA VALIDACIJU ---
function validateRegistrationData(data) {
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!usernameRegex.test(data.username)) {
    return "Username must contain only letters and numbers (No special characters).";
  }
  if (data.username.length < 3 || data.username.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }

  const nameRegex = /^[a-zA-Z\sčćđšžČĆĐŠŽ]+$/;
  if (!nameRegex.test(data.firstName)) {
    return "First name must contain only letters.";
  }
  if (data.firstName.length < 2 || data.firstName.length > 20) {
    return "First name must be between 2 and 20 characters.";
  }
  if (!nameRegex.test(data.lastName)) {
    return "Last name must contain only letters.";
  }
  if (data.lastName.length < 2 || data.lastName.length > 20) {
    return "Last name must be between 2 and 20 characters.";
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(data.email)) {
    return "Invalid email format.";
  }

  const age = parseInt(data.age);
  if (isNaN(age) || age < 7 || age > 120) {
    return "You must be between 7 and 120 years old.";
  }

  const passwordRegex =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
  if (!passwordRegex.test(data.password)) {
    return "Password too weak! Needs 8+ chars, Uppercase, Lowercase, Digit, Special char.";
  }

  if (data.password !== data.repeatedPassword) {
    return "Passwords do not match!";
  }

  return null;
}

function showAlert(message, type) {
  const alertBox = document.getElementById("alertMessage");
  if (alertBox) {
    alertBox.style.display = "block";
    alertBox.innerHTML = `
            <div class="alert alert-${type} alert-dismissible fade show" role="alert">
                ${message}
                <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
            </div>
        `;
  }
}
