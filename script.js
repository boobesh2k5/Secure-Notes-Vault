// Element References
const registerForm = document.getElementById("registerForm");
const loginForm = document.getElementById("loginForm");
const authSection = document.getElementById("authSection");
const dashboard = document.getElementById("dashboard");
const notesApp = document.getElementById("notesApp");
const userDisplay = document.getElementById("userDisplay");
const profileUsername = document.getElementById("profileUsername");
const tokenDisplay = document.getElementById("tokenDisplay");
const logoutBtn = document.getElementById("logoutBtn");
const openVaultBtn = document.getElementById("openVaultBtn");
const backToDashboardBtn = document.getElementById("backToDashboardBtn");
const logoutFromVaultBtn = document.getElementById("logoutFromVaultBtn");
const getStartedBtn = document.getElementById("getStartedBtn");
const learnMoreBtn = document.getElementById("learnMoreBtn");
const noteForm = document.getElementById("noteForm");
const notesList = document.getElementById("notesList");

const API_URL = "http://localhost:3000/api";

let authToken = localStorage.getItem("token"); // persist token after refresh
let currentUser = null;
let currentUserId = null;
let editingNoteId = null;

// SweetAlert2 Helpers
function showSuccess(msg) {
  Swal.fire({
    icon: "success",
    title: "Success! 🎉",
    text: msg,
    timer: 2500,
    showConfirmButton: false,
  });
}

function showError(msg) {
  Swal.fire({
    icon: "error",
    title: "Oops! ❌",
    text: msg,
    timer: 3000,
    showConfirmButton: true,
  });
}

// Scroll Events
getStartedBtn?.addEventListener("click", (e) => {
  e.preventDefault();

  const token = localStorage.getItem("token");

  if (token && currentUser && currentUserId) {
   
    dashboard.classList.remove("d-none");
    authSection.classList.add("d-none");
    notesApp.classList.add("d-none");
    dashboard.scrollIntoView({ behavior: "smooth" });
  } else {
  
    authSection.classList.remove("d-none");
    dashboard.classList.add("d-none");
    notesApp.classList.add("d-none");
    authSection.scrollIntoView({ behavior: "smooth" });
  }
});


learnMoreBtn?.addEventListener("click", () => {
  document.getElementById("featuresSection")?.scrollIntoView({ behavior: "smooth" });
});

// Registration Handler
registerForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("regUsername")?.value.trim();
  const password = document.getElementById("regPassword")?.value;

  if (!username || !password) return showError("Username and password required");

  try {
    const res = await fetch(`${API_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();
    res.ok ? (showSuccess(data.message), registerForm.reset()) : showError(data.message);
  } catch (err) {
    showError("⚠️ Network error! Please try again.");
    console.error(err);
  }
});

// Login Handler
loginForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const username = document.getElementById("loginUsername")?.value.trim();
  const password = document.getElementById("loginPassword")?.value;

  if (!username || !password) return showError("Username and password required");

  try {
    const res = await fetch(`${API_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (res.ok) {
      localStorage.setItem("token", data.token);
      authToken = data.token; // ✅ FIX: Update in-memory token
      currentUser = data.username;
      currentUserId = data.userId;

      userDisplay.textContent = data.username;
      profileUsername.textContent = data.username;
      tokenDisplay.textContent = data.token?.substring(0, 20) + "...";

      showSuccess(data.message);
      loginForm.reset();

      authSection.classList.add("d-none");
      dashboard.classList.replace("d-none", "d-block");
    } else {
      showError(data.message);
    }
  } catch (err) {
    showError("⚠️ Network error during login.");
    console.error(err);
  }
});

// Open Notes Vault
openVaultBtn?.addEventListener("click", () => {
  dashboard.classList.replace("d-block", "d-none");
  notesApp.classList.replace("d-none", "d-block");
  fetchNotes();
});

// Back to Dashboard
backToDashboardBtn?.addEventListener("click", () => {
  notesApp.classList.replace("d-block", "d-none");
  dashboard.classList.replace("d-none", "d-block");
});

// Logout
logoutBtn?.addEventListener("click", logoutUser);
logoutFromVaultBtn?.addEventListener("click", logoutUser);

function logoutUser() {
  authToken = null;
  currentUser = null;
  currentUserId = null;
  editingNoteId = null;
  localStorage.removeItem("token");

  userDisplay.textContent = "";
  profileUsername.textContent = "";
  tokenDisplay.textContent = "***secure_token_here***";
  notesList.innerHTML = "";
  noteForm?.reset();

  dashboard.classList.add("d-none");
  notesApp.classList.add("d-none");
  authSection.classList.remove("d-none");

  showSuccess("Logged out successfully! 👋");
}

// Create or Update Note
noteForm?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const title = document.getElementById("noteTitle")?.value.trim();
  const content = document.getElementById("noteContent")?.value.trim();

  if (!title || !content) {
    return showError("Please fill in both title and content");
  }

  const payload = { title, content };
  const method = editingNoteId ? "PUT" : "POST";
  const endpoint = editingNoteId ? `${API_URL}/notes/${editingNoteId}` : `${API_URL}/notes`;

  try {
    console.log("Saving note with token:", authToken); // For debugging

    const res = await fetch(endpoint, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${authToken}`,
      },
      body: JSON.stringify(payload),
    });

    const data = await res.json();
    if (res.ok) {
      showSuccess(editingNoteId ? "Note updated!" : "Note created!");
      noteForm.reset();
      editingNoteId = null;
      fetchNotes();
    } else {
      showError(data.message || "Failed to save note");
    }
  } catch (err) {
    showError("⚠️ Network error! Please try again.");
    console.error(err);
  }
});

// Fetch Notes
async function fetchNotes() {
  const token = localStorage.getItem("token");

  if (!token) {
    console.warn("⚠️ No token found");
    return;
  }

  try {
    const response = await fetch(`${API_URL}/notes`, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const err = await response.json();
      console.error("❌ Fetch notes failed:", err.message);
      return;
    }

    const data = await response.json();
    console.log("✅ Notes fetched:", data.notes);
    renderNotes(data.notes);
  } catch (err) {
    console.error("❌ Network error:", err);
  }
}

// Render Notes
function renderNotes(notes) {
  notesList.innerHTML = "";

  if (!Array.isArray(notes) || notes.length === 0) {
    notesList.innerHTML = `
      <div class="text-center py-5">
        <i class="fas fa-sticky-note fa-3x text-muted mb-3"></i>
        <h5>No notes found</h5>
        <p class="text-muted">Create your first note to get started</p>
      </div>
    `;
    return;
  }

  notes.forEach((note) => {
    const date = new Date(note.updatedAt).toLocaleString();
    const noteElement = document.createElement("div");
    noteElement.className = "card note-card mb-3";
    noteElement.innerHTML = `
      <div class="card-body">
        <div class="d-flex justify-content-between align-items-start">
          <div>
            <h5 class="note-title">${note.title}</h5>
            <p class="card-text">${note.content}</p>
            <p class="note-date">Last updated: ${date}</p>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-warning edit-note" data-id="${note._id}">
              <i class="fas fa-edit"></i>
            </button>
            <button class="btn btn-sm btn-danger delete-note" data-id="${note._id}">
              <i class="fas fa-trash"></i>
            </button>
          </div>
        </div>
      </div>
    `;
    notesList.appendChild(noteElement);
  });

  document.querySelectorAll(".edit-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      const noteId = btn.getAttribute("data-id");
      editNote(noteId);
    });
  });

  document.querySelectorAll(".delete-note").forEach((btn) => {
    btn.addEventListener("click", () => {
      const noteId = btn.getAttribute("data-id");
      deleteNote(noteId);
    });
  });
}

// Edit Note
async function editNote(noteId) {
  try {
    const res = await fetch(`${API_URL}/notes/${noteId}`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });

    const data = await res.json();
    if (res.ok && data.note) {
      document.getElementById("noteTitle").value = data.note.title;
      document.getElementById("noteContent").value = data.note.content;
      editingNoteId = noteId;
      document.getElementById("noteTitle").focus();
    } else {
      showError(data.message || "Note not found");
    }
  } catch (err) {
    showError("⚠️ Failed to fetch note.");
    console.error(err);
  }
}

// Delete Note
async function deleteNote(noteId) {
  try {
    const result = await Swal.fire({
      title: "Are you sure?",
      text: "This action cannot be undone!",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#3085d6",
      confirmButtonText: "Yes, delete it!",
    });

    if (result.isConfirmed) {
      const res = await fetch(`${API_URL}/notes/${noteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${authToken}` },
      });

      const data = await res.json();
      if (res.ok) {
        showSuccess("Note deleted successfully!");
        fetchNotes();
      } else {
        showError(data.message || "Failed to delete note");
      }
    }
  } catch (err) {
    showError("⚠️ Failed to delete note.");
    console.error(err);
  }
}
