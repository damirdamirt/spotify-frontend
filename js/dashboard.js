// js/dashboard.js

// 1. Zastita (Odmah na pocetku)
checkAuthStatus();

// 2. Prikaz imena
const user = localStorage.getItem("spotify_user");
const welcomeElement = document.getElementById("welcomeUser");
if (user && welcomeElement) {
  welcomeElement.innerText = "Hi, " + user;
}

// 3. Testiranje Backend Veze
async function testSecureData() {
  const responseDiv = document.getElementById("backendResponse");

  // Resetuj boju na sivo dok ucitava
  responseDiv.className = "alert alert-secondary";
  responseDiv.innerText = "Loading secure data...";

  try {
    // Pozivamo nasu funkciju
    const response = await fetchWithAuth("/demo");

    if (response) {
      const text = await response.text();

      if (response.ok) {
        // STATUS 200 - SVE OK
        responseDiv.className = "alert alert-success";
        responseDiv.innerHTML = `<strong>Success!</strong> Backend says: "${text}"`;
      } else if (response.status === 429) {
        // STATUS 429 - PREVISE ZAHTEVA (DoS Zastita)
        responseDiv.className = "alert alert-warning"; // Zuta boja upozorenja
        responseDiv.innerHTML = `
                    <strong>Too Many Requests!</strong><br>
                    Backend server: "${text}"
                `;
      } else {
        // NEKA DRUGA GRESKA
        responseDiv.className = "alert alert-danger";
        responseDiv.innerText = "Error: " + text;
      }
    } else {
      // Ako je fetch vratio null (mrezna greska ili logout)
      responseDiv.className = "alert alert-danger";
      responseDiv.innerText = "Failed to connect.";
    }
  } catch (error) {
    console.error(error);
    responseDiv.className = "alert alert-danger";
    responseDiv.innerText = "Critical error.";
  }
}

// Pokreni test odmah pri ucitavanju
document.addEventListener("DOMContentLoaded", () => {
  testSecureData();
});
