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

    // Sakrij prethodne poruke
    alertBox.style.display = "none";
    alertBox.className = ""; // Resetuj klase
    alertBox.innerHTML = "";

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
        // --- USPEH ---
        const message = await response.text();
        showAlert(
          message + " <br><strong>Redirecting to login...</strong>",
          "success",
        );
        registerForm.reset();

        // Dugme ostaje disabled (korisnik je gotov)
        submitBtn.innerText = "Success!";

        // 4. REDIREKCIJA NAKON 2 SEKUNDE
        setTimeout(() => {
          window.location.href = "index.html";
        }, 4000);
      } else {
        // --- GREŠKA SA SERVERA ---
        const errorData = await response.json().catch(() => null);
        let errorMessage = "Registration failed.";
        if (errorData && errorData.error) {
          errorMessage = errorData.error;
        } else if (errorData) {
          errorMessage = Object.values(errorData).join(", ");
        }
        showAlert(errorMessage, "danger");

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

// --- NOVA FUNKCIJA ZA VALIDACIJU (Tacka 2.18) ---
function validateRegistrationData(data) {
  // 1. Whitelisting za Username (Samo slova i brojevi, bez specijalnih znakova)
  // Ovo direktno sprecava XSS i SQL Injection karaktere u username-u
  const usernameRegex = /^[a-zA-Z0-9]+$/;
  if (!usernameRegex.test(data.username)) {
    return "Username must contain only letters and numbers (No special characters allowed).";
  }
  // Boundary checking (3-20)
  if (data.username.length < 3 || data.username.length > 20) {
    return "Username must be between 3 and 20 characters.";
  }

  // 2. Whitelisting za Ime i Prezime (Samo slova i razmaci)
  const nameRegex = /^[a-zA-Z\sčćđšžČĆĐŠŽ]+$/;
  if (!nameRegex.test(data.firstName)) {
    return "First name must contain only letters.";
  }

  if (data.firstName.length < 2 || data.firstName.length > 20) {
    return "First name must be in between 2 and 20 characters.";
  }

  if (!nameRegex.test(data.lastName)) {
    return "Last name must contain only letters.";
  }

  if (data.lastName.length < 2 || data.lastName.length > 20) {
    return "Last name must be in between 2 and 20 characters.";
  }

  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(data.email)) {
    return "Invalid email format. Must contain '@' and domain (e.g. .com).";
  }

  // 3. Numeric & Boundary Validation za Godine
  const age = parseInt(data.age);
  if (isNaN(age) || age < 7 || age > 120) {
    return "You must be between 7 and 120 years old.";
  }

  // 4. Password Policy (Regex) - Mora da se poklapa sa Backend pravilima
  // Min 8 chars, 1 Upper, 1 Lower, 1 Digit, 1 Special
  const passwordRegex =
    /^(?=.*[0-9])(?=.*[a-z])(?=.*[A-Z])(?=.*[@#$%^&+=!]).{8,}$/;
  if (!passwordRegex.test(data.password)) {
    return "Password is too weak! Must have 8+ chars, 1 Uppercase, 1 Lowercase, 1 Digit, and 1 Special char.";
  }

  // 5. Provera jednakosti lozinki
  if (data.password !== data.repeatedPassword) {
    return "Passwords do not match!";
  }

  return null; // Nema greske
}

function showAlert(message, type) {
  const alertBox = document.getElementById("alertMessage");
  alertBox.style.display = "block";
  alertBox.innerHTML = `
        <div class="alert alert-${type} alert-dismissible fade show" role="alert">
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Close"></button>
        </div>
    `;
}
