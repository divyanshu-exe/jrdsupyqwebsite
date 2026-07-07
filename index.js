const grid = document.getElementById("pyqGrid");
const searchInput = document.getElementById("searchInput");
const branchFilter = document.getElementById("branchFilter");
const semesterFilter = document.getElementById("semesterFilter");
const yearFilter = document.getElementById("yearFilter");

// Load papers from backend
async function loadPapers() {
    try {
        const search = searchInput.value;
        const course = branchFilter.value;
        const semester = semesterFilter.value;
        const year = yearFilter.value;

        const url = `http://localhost:5000/api/papers?search=${encodeURIComponent(search)}&course=${encodeURIComponent(course)}&semester=${encodeURIComponent(semester)}&year=${encodeURIComponent(year)}`;

        const response = await fetch(url);
        const papers = await response.json();

        displayPapers(papers);

    } catch (error) {
        console.error("Error loading papers:", error);
    }
}

async function loadStats() {

    try {

        const response = await fetch("http://localhost:5000/api/stats");

        const stats = await response.json();

        document.getElementById("totalPapers").textContent = stats.totalPapers;

        document.getElementById("totalCourses").textContent = stats.totalCourses;

    } catch (error) {

        console.error("Error loading stats:", error);

    }

}

// Display cards
function displayPapers(papers) {

    grid.innerHTML = "";
    // ==========================================
// No Papers Found
// ==========================================
if (papers.length === 0) {

    grid.innerHTML = `

        <div class="no-paper">

            <h2>📄 No Question Papers Found</h2>

            <p>

                Try changing Course, Semester or Search Keyword.

            </p>

        </div>

    `;

    return;

}

    if (papers.length === 0) {
        grid.innerHTML = `
            <p style="grid-column:1/-1;text-align:center;padding:2rem;">
                No Question Papers Found.
            </p>
        `;
        return;
    }

    papers.forEach(paper => {

        const card = document.createElement("div");

        card.className = "card";

        card.innerHTML = `
            <div>

                <span class="card-tag">${paper.examType}</span>

                <h3 class="card-title">
                    ${paper.subject}
                </h3>

                <div class="card-meta">
                    <span><strong>${paper.paperCode}</strong></span>
                    <span>•</span>
                    <span>${paper.course}</span>
                </div>

            </div>

            <div>

                <div class="card-meta" style="margin-bottom:1rem;">

                    <span>Year : ${paper.year}</span>

                    <span>•</span>

                    <span>Semester ${paper.semester}</span>

                </div>
                <a href="http://localhost:5000${paper.pdfUrl}"
   target="_blank"
   class="view-btn">

    👁 View Paper

</a>

                <a
                    href="http://localhost:5000${paper.pdfUrl}"
                    target="_blank"
                    class="download-btn"
                >

                <svg width="18" height="18" viewBox="0 0 24 24"
                fill="none" stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                stroke-linejoin="round">

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

// Reload papers when filters change
function filterPapers() {
    loadPapers();
}

searchInput.addEventListener("input", filterPapers);
branchFilter.addEventListener("change", filterPapers);
semesterFilter.addEventListener("change", filterPapers);
yearFilter.addEventListener("change", filterPapers);

// First Load
loadPapers();
loadStats();