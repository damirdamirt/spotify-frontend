// js/verify.js

const API_URL = "http://localhost:8080/api/auth";

document.addEventListener("DOMContentLoaded", async () => {
  // 1. Uzmi token iz URL-a
  const urlParams = new URLSearchParams(window.location.search);
  const token = urlParams.get("token");

  const loader = document.getElementById("loader");
  const successMessage = document.getElementById("successMessage");
  const errorMessage = document.getElementById("errorMessage");
  const errorText = document.getElementById("errorText");

  if (!token) {
    loader.style.display = "none";
    errorMessage.style.display = "block";
    errorText.innerText = "Token is missing in the link.";
    return;
  }

  try {
    // 2. Pozovi Backend da verifikuje token
    const response = await fetch(`${API_URL}/verify?token=${token}`, {
      method: "GET",
    });

    loader.style.display = "none";

    if (response.ok) {
      // USPEH!
      successMessage.style.display = "block";
    } else {
      // GREŠKA SA SERVERA
      const message = await response.text(); // Backend vraća tekst greške (ako ima)
      errorMessage.style.display = "block";
      if (message) errorText.innerText = message;
    }
  } catch (error) {
    // MREŽNA GREŠKA
    loader.style.display = "none";
    errorMessage.style.display = "block";
    errorText.innerText = "Server is unreachable.";
    console.error("Verification error:", error);
  }
});
