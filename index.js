// ==========================================
// CAMPUSARCHIVE - STUDENT PORTAL SCRIPT
// ==========================================

// Configurable API URL (Local vs Production)
const API_BASE = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1"
    ? "http://localhost:5000/api"
    : "https://campusarchive-backend.onrender.com/api";

const PAPERS_CACHE_KEY = "ca_papers_cache_v1";
const STATS_CACHE_KEY = "ca_stats_cache_v1";

const grid = document.getElementById("pyqGrid");
const searchInput = document.getElementById("searchInput");
const branchFilter = document.getElementById("branchFilter");
const semesterFilter = document.getElementById("semesterFilter");
const yearFilter = document.getElementById("yearFilter");
const totalPapersEl = document.getElementById("totalPapers");
const totalCoursesEl = document.getElementById("totalCourses");

let activeAbortController = null;
let wakeTimer = null;
let lastRenderedSignature = null;
let cachedAllPapers = readCache(PAPERS_CACHE_KEY);

// Safe localStorage Helpers
function readCache(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

function writeCache(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
        // Ignore storage quota or private mode errors
    }
}

// Debounce helper
function debounce(func, wait) {
    let timeout;
    return function (...args) {
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(this, args), wait);
    };
}

// Filter cached papers locally for instant (0ms) UI response
function filterLocalPapers(papers, { search, course, semester, year }) {
    const q = (search || "").toLowerCase();
    return papers.filter((paper) => {
        if (course && paper.course !== course) return false;
        if (semester && String(paper.semester) !== String(semester)) return false;
        if (year && String(paper.year) !== String(year)) return false;
        if (q) {
            const subject = (paper.subject || "").toLowerCase();
            const code = (paper.paperCode || "").toLowerCase();
            if (!subject.includes(q) && !code.includes(q)) return false;
        }
        return true;
    });
}

// Show Loading State in Grid
function showLoading() {
    lastRenderedSignature = null;
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
    lastRenderedSignature = null;
    grid.innerHTML = `
        <div class="no-paper">
            <h2>⚠️ Connection Issue</h2>
            <p>${message || "Unable to reach the server. Please check your internet connection."}</p>
            <button class="retry-btn" onclick="loadPapers()">🔄 Try Again</button>
        </div>
    `;
}

// Render papers immediately from cache if available, then revalidate with backend
async function loadPapers() {
    if (activeAbortController) {
        activeAbortController.abort();
    }
    activeAbortController = new AbortController();

    const search = (searchInput.value || "").trim();
    const course = branchFilter.value || "";
    const semester = semesterFilter.value || "";
    const year = yearFilter.value || "";
    const hasFilters = Boolean(search || course || semester || year);
    const hasLocalCache = Array.isArray(cachedAllPapers);

    if (hasLocalCache) {
        const instantList = hasFilters
            ? filterLocalPapers(cachedAllPapers, { search, course, semester, year })
            : cachedAllPapers;
        displayPapers(instantList);
    } else {
        showLoading();
    }

    try {
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

        if (!hasFilters) {
            cachedAllPapers = papers;
            writeCache(PAPERS_CACHE_KEY, papers);
        }

        displayPapers(papers);
    } catch (error) {
        if (error.name === "AbortError") {
            return;
        }
        console.error("Error loading papers:", error);
        clearTimeout(wakeTimer);

        if (!hasLocalCache) {
            showError("Could not load papers. The server might be waking up or offline.");
        }
    }
}

// Load Dashboard Aggregate Statistics (Cache first, then fresh)
async function loadStats() {
    const cachedStats = readCache(STATS_CACHE_KEY);
    if (cachedStats) {
        if (totalPapersEl) totalPapersEl.textContent = cachedStats.totalPapers || 0;
        if (totalCoursesEl) totalCoursesEl.textContent = cachedStats.totalCourses || 0;
    }

    try {
        const response = await fetch(`${API_BASE}/papers/stats`);
        if (!response.ok) return;

        const stats = await response.json();
        writeCache(STATS_CACHE_KEY, stats);
        if (totalPapersEl) totalPapersEl.textContent = stats.totalPapers || 0;
        if (totalCoursesEl) totalCoursesEl.textContent = stats.totalCourses || 0;
    } catch (error) {
        console.error("Error loading stats:", error);
    }
}

// Display Cards (Diff-checked to prevent unnecessary re-renders)
function displayPapers(papers) {
    const safePapers = Array.isArray(papers) ? papers : [];
    const signature = JSON.stringify(
        safePapers.map((p) => [p._id, p.subject, p.paperCode, p.course, p.semester, p.year, p.examType, p.pdfUrl])
    );

    if (signature === lastRenderedSignature) {
        return;
    }
    lastRenderedSignature = signature;

    grid.innerHTML = "";

    // No Papers Found State
    if (safePapers.length === 0) {
        grid.innerHTML = `
            <div class="no-paper">
                <h2>📄 No Question Papers Found</h2>
                <p>Try changing Course, Semester or Search Keyword.</p>
            </div>
        `;
        return;
    }

    const fragment = document.createDocumentFragment();

    safePapers.forEach(paper => {
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

        fragment.appendChild(card);
    });

    grid.appendChild(fragment);
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

// Event Listeners: instant local filter + debounced server sync
const debouncedLoadPapers = debounce(() => {
    loadPapers();
}, 300);

searchInput.addEventListener("input", () => {
    if (Array.isArray(cachedAllPapers)) {
        const instantList = filterLocalPapers(cachedAllPapers, {
            search: (searchInput.value || "").trim(),
            course: branchFilter.value || "",
            semester: semesterFilter.value || "",
            year: yearFilter.value || "",
        });
        displayPapers(instantList);
    }
    debouncedLoadPapers();
});

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
