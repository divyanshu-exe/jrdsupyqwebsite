// ==========================================
// CAMPUSARCHIVE - STUDENT PORTAL SCRIPT
// ==========================================

// Configurable API URL (Local vs Production)
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://campusarchive-backend.onrender.com/api";

const grid = document.getElementById("pyqGrid");
const searchInput = document.getElementById("searchInput");
const branchFilter = document.getElementById("branchFilter");
const semesterFilter = document.getElementById("semesterFilter");
const yearFilter = document.getElementById("yearFilter");
const totalPapersEl = document.getElementById("totalPapers");
const totalCoursesEl = document.getElementById("totalCourses");

let activeAbortController = null;
let wakeTimer = null;

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Show Loading State in Grid
function showLoading() {
    grid.innerHTML = `
        <div class="loading-box">
            <div class="spinner"></div>
            <p>Loading Question Papers...</p>
            <p id="wakeHint" class="server-wake-hint" style="display:none;">
                ⏳ Connecting to server (may take ~30s on first load)...
            </p>
        </div>
    `;

    clearTimeout(wakeTimer);
    wakeTimer = setTimeout(() => {
        const hint = document.getElementById("wakeHint");
        if (hint) hint.style.display = "block";
    }, 2500);
}

// Show Error State in Grid
function showError(message) {
    clearTimeout(wakeTimer);
    grid.innerHTML = `
        <div class="no-paper">
            <h2>⚠️ Connection Issue</h2>
            <p>${message || "Unable to reach the server. Please check your internet connection."}</p>
            <button class="retry-btn" onclick="loadPapers()">🔄 Try Again</button>
        </div>
    `;
}

// Load papers from backend
async function loadPapers() {
    // Abort any ongoing request to avoid race conditions
    if (activeAbortController) {
        activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    showLoading();

    try {
        const search = (searchInput.value || "").trim();
        const course = branchFilter.value || "";
        const semester = semesterFilter.value || "";
        const year = yearFilter.value || "";

        const queryParams = new URLSearchParams();
        if (search) queryParams.append("search", search);
        if (course) queryParams.append("course", course);
        if (semester) queryParams.append("semester", semester);
        if (year) queryParams.append("year", year);

        const url = `${API_BASE}/papers?${queryParams.toString()}`;
        const response = await fetch(url, { signal: activeAbortController.signal });

        if (!response.ok) {
            throw new Error(`Server returned status ${response.status}`);
        }

        const papers = await response.json();
        clearTimeout(wakeTimer);
        displayPapers(papers);
    } catch (error) {
        if (error.name === "AbortError") {
            // Request was cancelled for a newer request; do nothing
            return;
        }
        console.error("Error loading papers:", error);
        showError("Could not load papers. The server might be waking up or offline.");
    }
}

// Load Dashboard Aggregate Statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/papers/stats`);
        if (!response.ok) return;

        const stats = await response.json();
        if (totalPapersEl) totalPapersEl.textContent = stats.totalPapers || 0;
        if (totalCoursesEl) totalCoursesEl.textContent = stats.totalCourses || 0;
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// Display Cards
function displayPapers(papers) {
    grid.innerHTML = "";

    // No Papers Found State
    if (!papers || papers.length === 0) {
        grid.innerHTML = `
            <div class="no-paper">
                <h2>📄 No Question Papers Found</h2>
                <p>Try changing Course, Semester or Search Keyword.</p>
            </div>
        `;
        return;
    }

    papers.forEach(paper => {
        // Safe download url transformation for Cloudinary attachments
        let downloadUrl = paper.pdfUrl || "#";
        if (downloadUrl.includes("/upload/")) {
            downloadUrl = downloadUrl.replace("/upload/", "/upload/fl_attachment/");
        }

        const card = document.createElement("div");
        card.className = "card";

        card.innerHTML = `
            <div>
                <span class="card-tag">${escapeHtml(paper.examType || "Exam")}</span>

                <h3 class="card-title">
                    ${escapeHtml(paper.subject || "Subject")}
                </h3>

                <div class="card-meta">
                    <span><strong>${escapeHtml(paper.paperCode || "-")}</strong></span>
                    <span>•</span>
                    <span>${escapeHtml(paper.course || "-")}</span>
                </div>
            </div>

            <div>
                <div class="card-meta" style="margin-bottom:1rem;">
                    <span>Year : ${escapeHtml(paper.year || "-")}</span>
                    <span>•</span>
                    <span>Semester ${escapeHtml(paper.semester || "-")}</span>
                </div>

                <a href="${paper.pdfUrl}" target="_blank" rel="noopener noreferrer" class="view-btn">
                    👁 View Paper
                </a>

                <a href="${downloadUrl}" target="_blank" rel="noopener noreferrer" download class="download-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24"
                        fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download Paper
                </a>
            </div>
        `;

        grid.appendChild(card);
    });
}

// Helper to escape HTML characters in dynamic strings
function escapeHtml(text) {
    if (!text) return "";
    return String(text)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Event Listeners with Debounce for search
const debouncedLoadPapers = debounce(() => {
    loadPapers();
}, 300);

searchInput.addEventListener("input", debouncedLoadPapers);
branchFilter.addEventListener("change", loadPapers);
semesterFilter.addEventListener("change", loadPapers);
yearFilter.addEventListener("change", loadPapers);

// Initial Load
loadPapers();
loadStats();

// Mobile Navigation Menu Toggle
const menuToggle = document.getElementById("menuToggle");
const navLinks = document.querySelector(".nav-links");

if (menuToggle && navLinks) {
    menuToggle.addEventListener("click", () => {
        navLinks.classList.toggle("active");
    });

    document.querySelectorAll(".nav-links a").forEach(link => {
        link.addEventListener("click", () => {
            navLinks.classList.remove("active");
        });
    });
}
