// ==========================================
// ADMIN PANEL SCRIPT - PART 1
// Upload + Update + File Preview
// ==========================================

// Current editing paper id
let editPaperId = null;

// File input & preview container
const fileInput = document.getElementById("paperFile");
const previewContainer = document.getElementById("previewContainer");

// ==========================================
// Upload / Update Form Submit
// ==========================================
document.getElementById("uploadForm").addEventListener("submit", async function (e) {

    e.preventDefault();

    try {

        // ----------------------------
        // UPDATE PAPER
        // ----------------------------
        if (editPaperId) {

            const response = await fetch(`https://campusarchive-backend.onrender.com/api/papers/${editPaperId}`, {

                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({

                    course: document.getElementById("course").value,
                    semester: document.getElementById("semester").value,
                    subject: document.getElementById("subject").value,
                    paperCode: document.getElementById("paperCode").value,
                    examType: document.getElementById("examType").value,
                    year: document.getElementById("year").value,
                    session: document.getElementById("session").value

                })

            });

            if (!response.ok) {
                throw new Error("Update failed");
            }

            alert("✅ Paper Updated Successfully");

            editPaperId = null;

        }

        // ----------------------------
        // NEW UPLOAD
        // ----------------------------
        else {

            const formData = new FormData();

            formData.append("course", document.getElementById("course").value);
            formData.append("semester", document.getElementById("semester").value);
            formData.append("subject", document.getElementById("subject").value);
            formData.append("paperCode", document.getElementById("paperCode").value);
            formData.append("examType", document.getElementById("examType").value);
            formData.append("year", document.getElementById("year").value);
            formData.append("session", document.getElementById("session").value);

            if (fileInput.files.length > 0) {
                formData.append("paperFile", fileInput.files[0]);
            }

            const response = await fetch("https://campusarchive-backend.onrender.com/api/papers", {

                method: "POST",

                body: formData

            });

            if (!response.ok) {
                throw new Error("Upload failed");
            }

            alert("✅ Upload Successful");

        }

        // Reset form
        document.getElementById("uploadForm").reset();

        previewContainer.innerHTML = "";

        loadAdminPapers();
        loadDashboardStats();

    }

    catch (err) {

        console.error(err);

        alert(err.message);

    }

});

// ==========================================
// File Preview
// ==========================================
fileInput.addEventListener("change", () => {

    previewContainer.innerHTML = "";

    const file = fileInput.files[0];

    if (!file) return;

    // Image Preview
    if (file.type.startsWith("image/")) {

        const img = document.createElement("img");

        img.src = URL.createObjectURL(file);

        img.style.width = "200px";
        img.style.borderRadius = "10px";
        img.style.marginTop = "10px";

        previewContainer.appendChild(img);

    }

    // PDF Preview
    else if (file.type === "application/pdf") {

        previewContainer.innerHTML = `
            <div style="
                border:1px solid #ddd;
                padding:10px;
                border-radius:8px;
            ">
                📄 ${file.name}
            </div>
        `;

    }

    // Invalid File
    else {

        alert("Only PDF or Image allowed.");

        fileInput.value = "";

    }

});
// ==========================================
// LOAD DASHBOARD STATISTICS
// ==========================================
async function loadDashboardStats() {

    try {

        const response = await fetch("https://campusarchive-backend.onrender.com/api/papers/stats");

        const stats = await response.json();

        document.getElementById("adminTotalPapers").textContent = stats.totalPapers;

        document.getElementById("adminTotalCourses").textContent = stats.totalCourses;

    }

    catch (err) {

        console.error("Dashboard Error:", err);

    }

}
// ==========================================
// LOAD ALL UPLOADED PAPERS
// ==========================================
async function loadAdminPapers() {

    try {

        // Fetch papers from backend
        const response = await fetch("https://campusarchive-backend.onrender.com/api/papers");

        const papers = await response.json();

        const paperList = document.getElementById("paperList");

        const keyword = document
            .getElementById("adminSearch")
            .value
            .trim()
            .toLowerCase();

        // Clear old list
        paperList.innerHTML = "";

        // Filter + Display
        papers
            .filter((paper) => {

                const subject = (paper.subject || "").toLowerCase();
                const course = (paper.course || "").toLowerCase();
                const paperCode = (paper.paperCode || "").toLowerCase();

                return (
                    subject.includes(keyword) ||
                    course.includes(keyword) ||
                    paperCode.includes(keyword)
                );

            })
            .forEach((paper) => {

                paperList.innerHTML += `

                <div class="paper-card">

                    <div class="paper-info">

                        <strong>${paper.subject || "No Subject"}</strong><br>

                        ${paper.course || "-"} |
                        Semester ${paper.semester || "-"} |
                        ${paper.year || "-"}

                        <br>

                        <small>
                            Uploaded :
                            ${paper.createdAt
                                ? new Date(paper.createdAt).toLocaleDateString()
                                : "-"}
                        </small>

                    </div>

                    <div class="paper-actions">

                        <button
                            class="edit-btn"
                            onclick="editPaper('${paper._id}')">

                            ✏ Edit

                        </button>

                        <button
                            class="delete-btn"
                            onclick="deletePaper('${paper._id}')">

                            🗑 Delete

                        </button>

                    </div>

                </div>

                `;

            });

    }

    catch (err) {

        console.error("Error loading papers:", err);

    }

}
// ================
// ==========================================
// Delete Paper
// ==========================================
async function deletePaper(id) {

    if (!confirm("Delete this paper?")) return;

    try {

        const response = await fetch(

            `https://campusarchive-backend.onrender.com/api/papers/${id}`,

            {

                method: "DELETE"

            }

        );

        const data = await response.json();

        alert(data.message);

        loadAdminPapers();
        loadDashboardStats();

    }

    catch (err) {

        console.error(err);

    }

}

// ==========================================
// Edit Paper
// ==========================================
async function editPaper(id) {

    try {

        const response = await fetch("https://campusarchive-backend.onrender.com/api/papers");

        const papers = await response.json();

        const paper = papers.find(p => p._id === id);

        if (!paper) {

            alert("Paper not found");

            return;

        }

        // Save current editing id
        editPaperId = id;

        // Fill form
        document.getElementById("course").value = paper.course;
        document.getElementById("semester").value = paper.semester;
        document.getElementById("subject").value = paper.subject;
        document.getElementById("paperCode").value = paper.paperCode;
        document.getElementById("examType").value = paper.examType;
        document.getElementById("year").value = paper.year;
        document.getElementById("session").value = paper.session;

        // Go to form
        window.scrollTo({

            top: 0,

            behavior: "smooth"

        });

    }

    catch (err) {

        console.error(err);

    }

}

// ==========================================
// Initial Load
// ==========================================
loadAdminPapers();
loadDashboardStats();
// ==========================================
// ADMIN LOGIN
// ==========================================

// Demo Admin Credentials
const ADMIN_USERNAME = "admin";
const ADMIN_PASSWORD = "admin123";

// Login Button
document.getElementById("loginBtn").addEventListener("click", () => {

    const username = document.getElementById("username").value.trim();

    const password = document.getElementById("password").value.trim();

    // Check Credentials
    if (
        username === ADMIN_USERNAME &&
        password === ADMIN_PASSWORD
    ) {

        // Hide Login
        document.getElementById("loginSection").style.display = "none";

        // Show Admin Panel
        document.getElementById("adminPanel").style.display = "block";
        // Save login status
        localStorage.setItem("adminLoggedIn", "true");

        alert("✅ Login Successful");

    }

    else {

        alert("❌ Invalid Username or Password");

    }

});
// ==========================================
// CHECK LOGIN STATUS ON PAGE LOAD
// ==========================================

if (localStorage.getItem("adminLoggedIn") === "true") {

    document.getElementById("loginSection").style.display = "none";

    document.getElementById("adminPanel").style.display = "block";

}

// ==========================================
// LOGOUT
// ==========================================

document.getElementById("logoutBtn").addEventListener("click", () => {

    // Remove saved login
    localStorage.removeItem("adminLoggedIn");

    // Hide admin panel
    document.getElementById("adminPanel").style.display = "none";

    // Show login page
    document.getElementById("loginSection").style.display = "block";

    // Clear login fields
    document.getElementById("username").value = "";
    document.getElementById("password").value = "";

    alert("Logged Out Successfully");

});
document
    .getElementById("adminSearch")
    .addEventListener("input", loadAdminPapers);