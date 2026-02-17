// js/dashboard.js

document.addEventListener("DOMContentLoaded", () => {
  // 1. Zastita (Pozivamo funkciju samo da odradi check, ne ocekujemo return)
  checkAuthStatus();
  loadAllArtistsView();

  // Rucno uzimamo token da bismo znali da li da nastavimo
  const token = localStorage.getItem("spotify_token");
  if (!token) return; // Ako nema tokena, prekidamo (checkAuthStatus ce vec prebaciti na login)

  // 2. Prikaz imena korisnika
  const user = localStorage.getItem("spotify_user");
  const welcomeElement = document.getElementById("welcomeUser");
  if (user && welcomeElement) {
    welcomeElement.innerText = "Hi, " + user;
  }

  // 3. ADMIN PROVERA (Cita role iz LocalStorage-a)
  checkAdminAccess();

  // 4. Inicijalizacija dugmeta za promenu sifre
  setupChangePasswordListener();

  // 5. Logout dugme
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", logout);
  }
});

// --- SEKCIJA 1: ADMIN LOGIKA ---

function checkAdminAccess() {
  // Uzimamo onaj JSON string koji si video u inspect element (npr. '["ROLE_USER", "ROLE_ADMIN"]')
  const rolesString = localStorage.getItem("user_roles");
  let roles = [];

  try {
    if (rolesString) {
      roles = JSON.parse(rolesString); // Pretvaramo string u pravi JavaScript niz
    }
  } catch (e) {
    console.error("Greska pri citanju rola:", e);
  }

  console.log("Ulogovani korisnik ima role:", roles);

  // Proveravamo da li taj niz sadrzi 'ROLE_ADMIN'
  // .includes radi tacno to - trazi string u nizu
  if (roles && roles.includes("ROLE_ADMIN")) {
    console.log("✅ Admin detektovan! Prikazujem panel.");

    const adminSection = document.getElementById("admin-section");
    if (adminSection) {
      adminSection.style.display = "block"; // Otkrivamo skrivenu sekciju
      loadArtists(); // Ucitavamo umetnike u dropdown
      setupAlbumUploadListener(); // Aktiviramo formu za upload albuma

      loadAlbumsForSongSelect(); //Ucitavamo albume za pesme
      setupSongUploadListener(); // Aktiviramo formu za upload pesama
    }
  } else {
    console.log("ℹ️ Korisnik nije admin ili nema rolu.");
  }
}

async function loadArtists() {
  // fetchWithAuth automatski dodaje token u header
  // endpoint je '/artists' (utils.js ce dodati BASE_URL)
  const response = await fetchWithAuth("/artists");

  if (response && response.ok) {
    const artists = await response.json();
    const select = document.getElementById("artist-select");

    if (select) {
      select.innerHTML = '<option value="">-- Select Artist --</option>'; // Reset

      artists.forEach((artist) => {
        const option = document.createElement("option");
        option.value = artist.id; // ID saljemo bazi
        option.textContent = artist.name; // Ime prikazujemo korisniku
        select.appendChild(option);
      });
    }
  } else {
    console.error("Neuspesno ucitavanje umetnika.");
  }
}

// -------- Upload albuma -------------

function setupAlbumUploadListener() {
  const form = document.getElementById("create-album-form");
  const message = document.getElementById("upload-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 0. RESET PORUKA
    if (message) {
      message.textContent = "";
      message.style.color = "inherit";
    }

    // 1. PREUZIMANJE VREDNOSTI
    const titleInput = document.getElementById("album-title");
    const yearInput = document.getElementById("release-year");
    const artistInput = document.getElementById("artist-select");
    const fileInput = document.getElementById("album-cover");

    const title = titleInput.value.trim();
    const year = parseInt(yearInput.value);
    const artistId = artistInput.value;
    const file = fileInput.files[0];

    // --- 2. FRONTEND VALIDACIJA (Mora da se poklapa sa Backend DTO) ---

    // A) Whitelisting & Special Characters (Regex)
    // Dozvoljavamo samo slova, brojeve i razmake (Isto kao Java @Pattern)
    const allowedPattern = /^[a-zA-Z0-9 ]+$/;

    if (!allowedPattern.test(title)) {
      showError(
        message,
        "❌ Invalid Title: Only letters, numbers and spaces allowed.",
      );
      return; // Prekini slanje
    }

    // B) Boundary Checking (String Length)
    // Isto kao Java @Size(min=2, max=50)
    if (title.length < 2 || title.length > 50) {
      showError(message, "❌ Title must be between 2 and 50 characters.");
      return;
    }

    // C) Numeric Validation & Boundary Checking (Year)
    // Isto kao Java @Min(1900) i @Max(2026)
    if (isNaN(year) || year < 1900 || year > 2026) {
      showError(message, "❌ Year must be between 1900 and 2026.");
      return;
    }

    // D) Required Checks
    if (!artistId) {
      showError(message, "❌ Please select an artist.");
      return;
    }

    if (!file) {
      showError(message, "❌ Cover image is required.");
      return;
    }

    // E) File Size Check (UX dodatak)
    // Npr. zabrani fajlove vece od 5MB da ne gušimo mrezu
    const maxSizeInBytes = 10 * 1024 * 1024; // 5MB
    if (file.size > maxSizeInBytes) {
      showError(message, "❌ Image is too large! Max size is 5MB.");
      return;
    }

    // --- 3. SLANJE NA BACKEND (Ako je sve proslo) ---

    if (message) {
      message.textContent = "Uploading... ⏳";
      message.style.color = "yellow";
    }

    // 1. Izracunaj Hash fajla (INTEGRITET)
    const fileHash = await calculateFileHash(file);
    console.log("Frontend Hash:", fileHash);

    const formData = new FormData();
    formData.append("title", title);
    formData.append("releaseYear", year);
    formData.append("artistId", artistId);
    formData.append("coverImage", file);
    // formData.append("fileHash", fileHash);
    formData.append("fileHash", fileHash);

    const token = localStorage.getItem("spotify_token");

    try {
      const url = BASE_URL + "/albums/create";

      const response = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: "Bearer " + token,
        },
        body: formData,
      });

      if (response.ok) {
        const responseData = await response.text();
        if (message) {
          message.textContent = "✅ " + responseData;
          message.style.color = "#1db954";
        }
        form.reset(); // Ocisti formu nakon uspeha
      } else {
        // Ako Backend ipak vrati gresku (npr. validacija ipak pukne tamo)
        // Ovo hvata onaj JSON mapu gresaka koju smo napravili u GlobalExceptionHandler
        let errorText = await response.text();
        try {
          // Pokusaj da parsiras JSON greske (ono sto vraca handleBindException)
          const errorObj = JSON.parse(errorText);
          // Ako je mapa (field: error), pretvori u citljiv string
          if (typeof errorObj === "object") {
            errorText = Object.values(errorObj).join(", ");
          }
        } catch (e) {
          // Nije JSON, ostavi text
        }

        showError(message, "❌ Error: " + errorText);
      }
    } catch (error) {
      console.error(error);
      showError(message, "❌ Network Error: Server unreachable.");
    }
  });
}

// Pomocna funkcija za prikaz greske
function showError(element, msg) {
  if (element) {
    element.textContent = msg;
    element.style.color = "red";
  }
}

//-------------- Citanje albuma za pesme --------------------

async function loadAlbumsForSongSelect() {
  // Pretpostavka: Imamo endpoint GET /api/albums koji vraca sve albume
  // Ako nemas, moramo ga dodati u AlbumController
  const response = await fetchWithAuth("/albums");

  if (response && response.ok) {
    const albums = await response.json();
    const select = document.getElementById("song-album-select");

    if (select) {
      select.innerHTML = '<option value="">-- Select Album --</option>';
      albums.forEach((album) => {
        const option = document.createElement("option");
        option.value = album.id;
        option.textContent = album.title;
        select.appendChild(option);
      });
    }
  }
}

// ----------- Upload pesama ---------------

function setupSongUploadListener() {
  const form = document.getElementById("create-song-form");
  const message = document.getElementById("song-message");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const title = document.getElementById("song-title").value;
    const duration = document.getElementById("song-duration").value;
    const albumId = document.getElementById("song-album-select").value;

    // FRONTEND VALIDACIJA (Whitelisting - isto kao za Album)
    const allowedPattern = /^[a-zA-Z0-9 ]+$/;
    if (!allowedPattern.test(title)) {
      message.textContent = "❌ Invalid Title characters.";
      message.style.color = "red";
      return;
    }

    // --- 1. VALIDACIJA FORMATA VREMENA (Regex) ---
    // Dozvoljava: "3:05", "10:00", "0:45"
    const timePattern = /^[0-9]+:[0-5][0-9]$/;
    if (!timePattern.test(duration)) {
      message.textContent = "❌ Invalid duration format. Use mm:ss (e.g. 3:05)";
      message.style.color = "red";
      return;
    }

    // --- 2. KONVERZIJA (String "3:05" -> Integer 185) ---
    const parts = duration.split(":");
    const minutes = parseInt(parts[0]);
    const seconds = parseInt(parts[1]);
    const totalSeconds = minutes * 60 + seconds;

    if (totalSeconds > 1200) {
      message.textContent = "❌ Song is too long (max 20 mins).";
      message.style.color = "red";
      return;
    }

    try {
      // Koristimo fetchWithAuth jer saljemo JSON (ne fajl)
      const response = await fetchWithAuth("/songs/create", {
        method: "POST",
        body: JSON.stringify({
          title: title,
          duration: totalSeconds,
          albumId: parseInt(albumId),
        }),
      });

      if (response && response.ok) {
        message.textContent = "✅ Song added successfully!";
        message.style.color = "#1db954";
        form.reset();
      } else {
        // ... handle errors ...
        message.textContent = "❌ Error adding song.";
        message.style.color = "red";
      }
    } catch (error) {
      console.error(error);
    }
  });
}

// --- PROMENA SIFRE ---

function setupChangePasswordListener() {
  const changePassBtn = document.getElementById("changePassBtn");

  if (changePassBtn) {
    changePassBtn.addEventListener("click", async () => {
      const username = localStorage.getItem("spotify_user");

      if (!username) {
        alert("Error: User not found. Please login again.");
        logout(); // iz utils.js
        return;
      }

      changePassBtn.disabled = true;
      changePassBtn.innerText = "Sending...";

      try {
        // Koristimo API_URL iz utils.js (za auth rute)
        const authUrl =
          typeof API_URL !== "undefined"
            ? API_URL
            : "https://localhost:8443/api/auth";

        const response = await fetch(`${authUrl}/password-change/initiate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ username: username }),
        });

        if (response.ok) {
          alert("Email sent! Check your inbox to finish password change.");
        } else {
          const msg = await response.text();
          let cleanMsg = msg;
          try {
            cleanMsg = JSON.parse(msg).error || msg;
          } catch (e) {}
          alert("Error: " + cleanMsg);
        }
      } catch (error) {
        console.error(error);
        alert("Server unreachable.");
      } finally {
        changePassBtn.disabled = false;
        changePassBtn.innerText = "Change Password";
      }
    });
  }
}

// Pomocna funkcija za racunanje SHA-256 hasha fajla
async function calculateFileHash(file) {
  const arrayBuffer = await file.arrayBuffer();
  const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return hashHex;
}

// --- LOGIKA ZA PREGLED SADRZAJA (Artists -> Albums -> Songs) ---

// Pokreni ovo cim se stranica ucita (dodaj poziv u DOMContentLoaded na vrhu fajla)
// loadAllArtistsView();

async function loadAllArtistsView() {
  updateViewHeader("Artists 🎤", false);
  const container = document.getElementById("data-container");
  container.innerHTML = '<p style="color: #b3b3b3;">Loading artists...</p>';

  const response = await fetchWithAuth("/artists"); // Pretpostavljam da ovo imamo
  if (response && response.ok) {
    const artists = await response.json();
    renderArtists(artists);
  } else {
    container.innerHTML = '<p style="color: red;">Failed to load artists.</p>';
  }
}

function renderArtists(artists) {
  const container = document.getElementById("data-container");
  container.innerHTML = ""; // Ocisti loading

  if (artists.length === 0) {
    container.innerHTML = '<p style="color: #b3b3b3;">No artists found.</p>';
    return;
  }

  artists.forEach((artist) => {
    // Kartica za Umetnika
    const card = document.createElement("div");
    card.style =
      "background: #181818; padding: 20px; border-radius: 8px; width: 200px; cursor: pointer; transition: background 0.3s;";
    card.innerHTML = `
            <h3 style="color: white; margin-bottom: 5px;">${artist.name}</h3>
            <p style="color: #b3b3b3; font-size: 14px;">Artist</p>
        `;

    // Hover efekat
    card.onmouseover = () => (card.style.background = "#282828");
    card.onmouseout = () => (card.style.background = "#181818");

    // KLIK NA UMETNIKA -> Ucitaj njegove albume
    card.onclick = () => loadAlbumsView(artist.id, artist.name);

    container.appendChild(card);
  });
}

async function loadAlbumsView(artistId, artistName) {
  updateViewHeader(`Albums by ${artistName} 💿`, true, () =>
    loadAllArtistsView(),
  );
  const container = document.getElementById("data-container");
  container.innerHTML = '<p style="color: #b3b3b3;">Loading albums...</p>';

  // GET /api/albums/artist/{id} (Proveri da li imas ovaj endpoint u AlbumController)
  const response = await fetchWithAuth(`/albums/artist/${artistId}`);

  if (response && response.ok) {
    const albums = await response.json();
    renderAlbums(albums);
  } else {
    container.innerHTML = '<p style="color: red;">Failed to load albums.</p>';
  }
}

function renderAlbums(albums) {
  const container = document.getElementById("data-container");
  container.innerHTML = "";

  if (albums.length === 0) {
    container.innerHTML =
      '<p style="color: #b3b3b3;">No albums found for this artist.</p>';
    return;
  }

  albums.forEach((album) => {
    // Kartica za Album
    const card = document.createElement("div");
    card.style =
      "background: #181818; padding: 20px; border-radius: 8px; width: 200px; cursor: pointer; transition: background 0.3s;";

    // Slika albuma (ako postoji putanja u bazi)
    // Pretpostavka: album.coverImage je ime fajla u uploads folderu
    // Za pravi prikaz slike trebao bi nam endpoint za serviranje slika, ali za sad samo tekst
    // const imgUrl = album.coverImage ? `uploads/${album.coverImage}` : 'default.png';

    card.innerHTML = `
            <div style="width: 100%; height: 150px; background-color: #333; margin-bottom: 15px; border-radius: 4px; display:flex; align-items:center; justify-content:center; overflow:hidden;">
               <span style="font-size: 40px;">🎵</span>
            </div>
            <h4 style="color: white; margin: 0;">${album.title}</h4>
            <p style="color: #b3b3b3; font-size: 14px;">${album.releaseYear}</p>
        `;

    card.onmouseover = () => (card.style.background = "#282828");
    card.onmouseout = () => (card.style.background = "#181818");

    // KLIK NA ALBUM -> Ucitaj pesme
    card.onclick = () => loadSongsView(album.id, album.title);

    container.appendChild(card);
  });
}

async function loadSongsView(albumId, albumTitle) {
  // Ovde back dugme vraca na Umetnike (moze se unaprediti da pamti istoriju)
  updateViewHeader(`Songs in "${albumTitle}" 🎶`, true, () =>
    loadAllArtistsView(),
  );
  const container = document.getElementById("data-container");
  container.innerHTML = '<p style="color: #b3b3b3;">Loading songs...</p>';

  // GET /api/songs/album/{id} (Ovo smo upravo dodali na backend)
  const response = await fetchWithAuth(`/songs/album/${albumId}`);

  if (response && response.ok) {
    const songs = await response.json();
    renderSongs(songs);
  } else {
    container.innerHTML = '<p style="color: red;">Failed to load songs.</p>';
  }
}

function renderSongs(songs) {
  const container = document.getElementById("data-container");
  container.innerHTML = "";
  // Za pesme je bolja lista nego kartice
  container.style.flexDirection = "column";

  if (songs.length === 0) {
    container.innerHTML =
      '<p style="color: #b3b3b3;">No songs in this album yet.</p>';
    return;
  }

  const list = document.createElement("div");
  list.style = "width: 100%; max-width: 800px;";

  songs.forEach((song, index) => {
    const item = document.createElement("div");
    item.style =
      "display: flex; justify-content: space-between; padding: 12px; border-bottom: 1px solid #282828; color: #b3b3b3;";

    // Formatiranje vremena (ako je string "mm:ss" super, ako je int moramo konvertovati)
    // Posto smo rekli da backend vraca String "3:05", samo ga ispisemo.

    item.innerHTML = `
            <div style="display: flex; gap: 15px;">
                <span style="color: #1db954; font-weight: bold;">${index + 1}</span>
                <span style="color: white;">${song.title}</span>
            </div>
            <span>${song.duration}</span>
        `;

    list.appendChild(item);
  });

  container.appendChild(list);
}

// Pomocna funkcija za zaglavlje i Back dugme
function updateViewHeader(title, showBackBtn, backAction) {
  document.getElementById("section-title").innerText = title;
  const backBtn = document.getElementById("back-btn");
  const container = document.getElementById("data-container");

  // Reset stila kontejnera (jer pesme menjaju u column)
  container.style.flexDirection = "row";

  if (showBackBtn) {
    backBtn.style.display = "block";
    backBtn.onclick = backAction;
  } else {
    backBtn.style.display = "none";
  }
}
