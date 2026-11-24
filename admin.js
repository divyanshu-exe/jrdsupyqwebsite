// ==========================================
// CAMPUSARCHIVE ADMIN PANEL SCRIPT
// ==========================================

// Configurable API URL (Local vs Production)
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://campusarchive-backend.onrender.com/api";

// Current editing paper id
let editPaperId = null;

// In-memory cache for all admin papers
let adminPapersCache = [];

// DOM Elements
const uploadForm = document.getElementById("uploadForm");
const formHeading = document.getElementById("formHeading");
const submitBtn = document.getElementById("submitBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");
const fileInput = document.getElementById("paperFile");
const fileInputLabel = document.getElementById("fileInputLabel");
const previewContainer = document.getElementById("previewContainer");
const paperList = document.getElementById("paperList");
const adminSearch = document.getElementById("adminSearch");

// ==========================================
// Reset Form to Default (Upload Mode)
// ==========================================
function resetFormState() {
    editPaperId = null;
    uploadForm.reset();
    previewContainer.innerHTML = "";
    formHeading.textContent = "Upload Question Paper";
    submitBtn.textContent = "Upload Paper";
    cancelEditBtn.style.display = "none";
    fileInput.setAttribute("required", "true");
    fileInputLabel.textContent = "Upload Paper File (PDF, JPEG, PNG - Max 15MB)";
}

cancelEditBtn.addEventListener("click", () => {
    resetFormState();
});

// ==========================================
// Upload / Update Form Submit
// ==========================================
uploadForm.addEventListener("submit", async function (e) {
    e.preventDefault();

    submitBtn.disabled = true;
    const originalText = submitBtn.textContent;
    submitBtn.textContent = "Processing...";

    try {
        const formData = new FormData();
        formData.append("course", document.getElementById("course").value);
        formData.append("semester", document.getElementById("semester").value);
        formData.append("subject", document.getElementById("subject").value);
        formData.append("paperCode", document.getElementById("paperCode").value);
        formData.append("examType", document.getElementById("examType").value);
        formData.append("year", document.getElementById("year").value);
        formData.append("session", document.getElementById("session").value);

        if (fileInput.files.length > 0) {
            formData.append("paper", fileInput.files[0]);
        }

        // ----------------------------
        // UPDATE PAPER
        // ----------------------------
        if (editPaperId) {
            const response = await fetch(`${API_BASE}/papers/${editPaperId}`, {
                method: "PUT",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || "Update failed");
            }

            alert("✅ Paper Updated Successfully");
            resetFormState();
        }
        // ----------------------------
        // NEW UPLOAD
        // ----------------------------
        else {
            if (fileInput.files.length === 0) {
                alert("Please select a paper file to upload.");
                submitBtn.disabled = false;
                submitBtn.textContent = originalText;
                return;
            }

            const response = await fetch(`${API_BASE}/papers/upload`, {
                method: "POST",
                headers: {
                    Authorization: `Bearer ${localStorage.getItem("token")}`
                },
                body: formData
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.error || data.message || "Upload failed");
            }

            alert("✅ Upload Successful");
            resetFormState();
        }

        await loadAdminPapers();
        await loadDashboardStats();
    } catch (err) {
        console.error("Upload/Update Error:", err);
        alert("❌ Error: " + err.message);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = editPaperId ? "Update Paper" : "Upload Paper";
    }
});

// ==========================================
// File Preview
// ==========================================
fileInput.addEventListener("change", () => {
    previewContainer.innerHTML = "";
    const file = fileInput.files[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
        alert("File size exceeds 15MB limit. Please choose a smaller file.");
        fileInput.value = "";
        return;
    }

    if (file.type.startsWith("image/")) {
        const img = document.createElement("img");
        img.src = URL.createObjectURL(file);
        img.style.maxWidth = "200px";
        img.style.borderRadius = "8px";
        img.style.marginTop = "10px";
        previewContainer.appendChild(img);
    } else if (file.type === "application/pdf") {
        previewContainer.innerHTML = `
            <div style="border:1px solid #ddd; padding:10px; border-radius:8px; margin-top:10px; background:#fff;">
                📄 <strong>${file.name}</strong> (${(file.size / (1024 * 1024)).toFixed(2)} MB)
            </div>
        `;
    } else {
        alert("Only PDF or Image files are allowed.");
        fileInput.value = "";
    }
});

// ==========================================
// LOAD DASHBOARD STATISTICS
// ==========================================
async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_BASE}/papers/stats`);
        if (!response.ok) return;
        const stats = await response.json();

        document.getElementById("adminTotalPapers").textContent = stats.totalPapers || 0;
        document.getElementById("adminTotalCourses").textContent = stats.totalCourses || 0;
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
    }
}

// ==========================================
// LOAD ALL UPLOADED PAPERS (From Server)
// ==========================================
async function loadAdminPapers() {
    try {
        paperList.innerHTML = `<p style="padding:15px; color:#666;">Loading papers...</p>`;
        const response = await fetch(`${API_BASE}/papers`);
        if (!response.ok) throw new Error("Failed to load papers");

        adminPapersCache = await response.json();
        renderAdminPaperList();
    } catch (err) {
        console.error("Error loading papers:", err);
        paperList.innerHTML = `<p style="padding:15px; color:red;">Failed to load papers. Please refresh.</p>`;
    }
}

// ==========================================
// RENDER PAPERS (Filtered in-memory)
// ==========================================
function renderAdminPaperList() {
    const keyword = (adminSearch.value || "").trim().toLowerCase();
    paperList.innerHTML = "";

    const filtered = adminPapersCache.filter((paper) => {
        const subject = (paper.subject || "").toLowerCase();
        const course = (paper.course || "").toLowerCase();
        const paperCode = (paper.paperCode || "").toLowerCase();

        return (
            subject.includes(keyword) ||
            course.includes(keyword) ||
            paperCode.includes(keyword)
        );
    });

    if (filtered.length === 0) {
        paperList.innerHTML = `<p style="padding:15px; color:#888;">No question papers found.</p>`;
        return;
    }

    filtered.forEach((paper) => {
        paperList.innerHTML += `
            <div class="paper-card">
                <div class="paper-info">
                    <strong>${paper.subject || "No Subject"}</strong><br>
                    <span>${paper.course || "-"} | Semester ${paper.semester || "-"} | ${paper.year || "-"} (${paper.examType || "-"})</span><br>
                    <small style="color:#777;">
                        Code: ${paper.paperCode || "-"} | Uploaded: ${paper.createdAt ? new Date(paper.createdAt).toLocaleDateString() : "-"}
                    </small>
                </div>
                <div class="paper-actions">
                    <a href="${paper.pdfUrl}" target="_blank" class="edit-btn" style="text-decoration:none; display:inline-block; text-align:center;">
                        👁 View
                    </a>
                    <button class="edit-btn" onclick="editPaper('${paper._id}')">
                        ✏ Edit
                    </button>
                    <button class="delete-btn" onclick="deletePaper('${paper._id}')">
                        🗑 Delete
                    </button>
                </div>
            </div>
        `;
    });
}

// Search input filters locally without network requests!
adminSearch.addEventListener("input", renderAdminPaperList);

// ==========================================
// Delete Paper
// ==========================================
async function deletePaper(id) {
    if (!confirm("Are you sure you want to delete this paper? This cannot be undone.")) return;

    try {
        const response = await fetch(`${API_BASE}/papers/${id}`, {
            method: "DELETE",
            headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`
            }
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error || data.message || "Failed to delete");
        }

        alert("✅ Paper deleted successfully.");
        await loadAdminPapers();
        await loadDashboardStats();
    } catch (err) {
        console.error("Delete Error:", err);
        alert("❌ Error: " + err.message);
    }
}

// ==========================================
// Edit Paper
// ==========================================
function editPaper(id) {
    const paper = adminPapersCache.find(p => p._id === id);
    if (!paper) {
        alert("Paper not found");
        return;
    }

    // Set editing ID
    editPaperId = id;

    // Populate form fields
    document.getElementById("course").value = paper.course || "";
    document.getElementById("semester").value = paper.semester || "";
    document.getElementById("subject").value = paper.subject || "";
    document.getElementById("paperCode").value = paper.paperCode || "";
    document.getElementById("examType").value = paper.examType || "";
    document.getElementById("year").value = paper.year || "";
    document.getElementById("session").value = paper.session || "";

    // File is OPTIONAL during edit
    fileInput.removeAttribute("required");
    fileInputLabel.textContent = "Replace Paper File (Optional - Leave blank to keep current file)";

    // Update UI
    formHeading.textContent = `Edit Question Paper: ${paper.subject}`;
    submitBtn.textContent = "Update Paper";
    cancelEditBtn.style.display = "inline-block";

    // Show preview of current paper
    previewContainer.innerHTML = `
        <div style="margin-top:10px; font-size:13px; color:#555;">
            Current file: <a href="${paper.pdfUrl}" target="_blank" style="color:#2563eb;">Open Current Paper</a>
        </div>
    `;

    // Scroll smoothly to form
    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });
}

// ==========================================
// ADMIN LOGIN
// ==========================================
document.getElementById("loginBtn").addEventListener("click", async () => {
    const email = document.getElementById("username").value.trim();
    const password = document.getElementById("password").value.trim();

    if (!email || !password) {
        alert("Please enter both email/username and password.");
        return;
    }

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({ email, password }),
        });

        const data = await response.json();

        if (!response.ok) {
            alert(data.message || "Invalid credentials");
            return;
        }

        // Save JWT Token
        localStorage.setItem("token", data.token);

        document.getElementById("loginSection").style.display = "none";
        document.getElementById("adminPanel").style.display = "block";

        loadAdminPapers();
        loadDashboardStats();
    } catch (err) {
        console.error("Login Error:", err);
        alert("Server Error. Check if backend is reachable.");
    }
});

// ==========================================
// CHECK LOGIN STATUS ON PAGE LOAD
// ==========================================
if (localStorage.getItem("token")) {
    document.getElementById("loginSection").style.display = "none";
    document.getElementById("adminPanel").style.display = "block";
    loadAdminPapers();
    loadDashboardStats();
}

// ==========================================
// LOGOUT
// ==========================================
document.getElementById("logoutBtn").addEventListener("click", () => {
    localStorage.removeItem("token");
    document.getElementById("adminPanel").style.display = "none";
    document.getElementById("loginSection").style.display = "block";
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";
    resetFormState();
});
