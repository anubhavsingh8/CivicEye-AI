const API_URL = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", () => {

    loadReports();

    document
        .getElementById("refreshBtn")
        .addEventListener("click", loadReports);

});


/* ================= LOAD REPORTS ================= */

async function loadReports() {

    const loading = document.getElementById("loading");
    const errorBox = document.getElementById("errorBox");

    loading.classList.remove("hidden");
    errorBox.classList.add("hidden");

    try {

        const response = await fetch(`${API_URL}/reports`);

        if (!response.ok) {
            throw new Error("Server error");
        }

        const reports = await response.json();

        displayReports(reports);

        document.getElementById("lastUpdated").textContent =
            new Date().toLocaleTimeString();

    } catch (error) {

        console.error(error);

        errorBox.classList.remove("hidden");

    } finally {

        loading.classList.add("hidden");
    }
}


/* ================= DISPLAY REPORTS ================= */

function displayReports(reports) {

    const tableBody = document.getElementById("reportsBody");
    const emptyState = document.getElementById("emptyState");
    const table = document.getElementById("reportsTable");

    tableBody.innerHTML = "";

    if (!reports || reports.length === 0) {

        table.classList.add("hidden");
        emptyState.classList.remove("hidden");

        updateStatistics([]);
        updateAnalytics([]);

        return;
    }

    table.classList.remove("hidden");
    emptyState.classList.add("hidden");


    /* Newest reports first */

    const sortedReports = [...reports].reverse();


    sortedReports.forEach(report => {

        const row = document.createElement("tr");

        const priority = report.priority || "Unknown";
        const status = report.status || "Submitted";

        const priorityClass =
            getPriorityClass(priority);


        let locationHTML = "Location unavailable";

        if (
            report.latitude !== null &&
            report.latitude !== undefined &&
            report.longitude !== null &&
            report.longitude !== undefined
        ) {

            const lat = Number(report.latitude).toFixed(5);
            const lng = Number(report.longitude).toFixed(5);

            const mapURL =
                `https://www.google.com/maps?q=${report.latitude},${report.longitude}`;

            locationHTML = `
                <div class="location">
                    ${lat}, ${lng}
                    <a href="${mapURL}" target="_blank">
                        View
                    </a>
                </div>
            `;
        }


        row.innerHTML = `

            <td>
                <span class="report-id">
                    ${escapeHTML(report.report_id || "N/A")}
                </span>
            </td>

            <td>
                ${formatIssue(report.issue)}
            </td>

            <td>
                <span class="priority-badge ${priorityClass}">
                    ${escapeHTML(priority)}
                </span>
            </td>

            <td>
                ${locationHTML}
            </td>

            <td>

                <select
                    class="status-select"
                    onchange="updateStatus(
                        '${escapeJS(report.report_id)}',
                        this.value
                    )"
                >

                    <option value="Submitted"
                        ${status === "Submitted" ? "selected" : ""}>
                        Submitted
                    </option>

                    <option value="In Progress"
                        ${status === "In Progress" ? "selected" : ""}>
                        In Progress
                    </option>

                    <option value="Resolved"
                        ${status === "Resolved" ? "selected" : ""}>
                        Resolved
                    </option>

                </select>

            </td>

            <td>
                ${escapeHTML(report.date || "-")}
            </td>
        `;

        tableBody.appendChild(row);

    });


    updateStatistics(reports);
    updateAnalytics(reports);
}


/* ================= STATISTICS ================= */

function updateStatistics(reports) {

    const total = reports.length;

    const high = reports.filter(
        r => r.priority === "High"
    ).length;

    const medium = reports.filter(
        r => r.priority === "Medium"
    ).length;

    const low = reports.filter(
        r => r.priority === "Low"
    ).length;


    document.getElementById("totalReports").textContent = total;
    document.getElementById("highPriority").textContent = high;
    document.getElementById("mediumPriority").textContent = medium;
    document.getElementById("lowPriority").textContent = low;
}


/* ================= ANALYTICS ================= */

function updateAnalytics(reports) {

    const total = reports.length;


    /* Status */

    const submitted = reports.filter(
        r => r.status === "Submitted"
    ).length;

    const progress = reports.filter(
        r => r.status === "In Progress"
    ).length;

    const resolved = reports.filter(
        r => r.status === "Resolved"
    ).length;


    document.getElementById("submittedCount").textContent =
        submitted;

    document.getElementById("progressCount").textContent =
        progress;

    document.getElementById("resolvedCount").textContent =
        resolved;


    const submittedPercent =
        total ? (submitted / total) * 100 : 0;

    const progressPercent =
        total ? (progress / total) * 100 : 0;

    const resolvedPercent =
        total ? (resolved / total) * 100 : 0;


    document.getElementById("submittedBar").style.width =
        `${submittedPercent}%`;

    document.getElementById("progressBar").style.width =
        `${progressPercent}%`;

    document.getElementById("resolvedBar").style.width =
        `${resolvedPercent}%`;


    /* Issues */

    const pothole = reports.filter(
        r =>
            r.issue &&
            (
                r.issue.toLowerCase().includes("pothole") ||
                r.issue.toLowerCase().includes("damaged road")
            )
    ).length;


    const garbage = reports.filter(
        r =>
            r.issue &&
            r.issue.toLowerCase().includes("garbage")
    ).length;


    const streetlight = reports.filter(
        r =>
            r.issue &&
            r.issue.toLowerCase().includes("streetlight")
    ).length;


    const water = reports.filter(
        r =>
            r.issue &&
            r.issue.toLowerCase().includes("water leakage")
    ).length;


    document.getElementById("potholeCount").textContent =
        pothole;

    document.getElementById("garbageCount").textContent =
        garbage;

    document.getElementById("streetlightCount").textContent =
        streetlight;

    document.getElementById("waterCount").textContent =
        water;


    const maxIssue =
        Math.max(
            pothole,
            garbage,
            streetlight,
            water,
            1
        );


    document.getElementById("potholeBar").style.width =
        `${(pothole / maxIssue) * 100}%`;

    document.getElementById("garbageBar").style.width =
        `${(garbage / maxIssue) * 100}%`;

    document.getElementById("streetlightBar").style.width =
        `${(streetlight / maxIssue) * 100}%`;

    document.getElementById("waterBar").style.width =
        `${(water / maxIssue) * 100}%`;
}


/* ================= UPDATE STATUS ================= */

async function updateStatus(reportId, newStatus) {

    try {

        const response = await fetch(
            `${API_URL}/update-status`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    report_id: reportId,
                    status: newStatus
                })
            }
        );


        const result = await response.json();


        if (!response.ok || !result.success) {

            alert(
                result.error ||
                "Unable to update status"
            );

            loadReports();

            return;
        }


        await loadReports();


    } catch (error) {

        console.error(error);

        alert(
            "Server connection failed."
        );

        loadReports();
    }
}


/* ================= ISSUE FORMAT ================= */

function formatIssue(issue) {

    if (!issue) {
        return "Unknown";
    }

    const text = issue.toLowerCase();

    if (
        text.includes("pothole") ||
        text.includes("damaged road")
    ) {
        return "Pothole / Damaged Road";
    }

    if (text.includes("garbage")) {
        return "Garbage / Waste";
    }

    if (text.includes("streetlight")) {
        return "Damaged Streetlight";
    }

    if (text.includes("water leakage")) {
        return "Water Leakage";
    }

    if (text.includes("normal road")) {
        return "No Civic Issue";
    }

    return issue;
}


/* ================= PRIORITY ================= */

function getPriorityClass(priority) {

    if (!priority) {
        return "";
    }

    switch (priority.toLowerCase()) {

        case "high":
            return "priority-high";

        case "medium":
            return "priority-medium";

        case "low":
            return "priority-low";

        default:
            return "";
    }
}


/* ================= SECURITY HELPERS ================= */

function escapeHTML(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}


function escapeJS(value) {

    if (value === null || value === undefined) {
        return "";
    }

    return String(value)
        .replace(/\\/g, "\\\\")
        .replace(/'/g, "\\'")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\r/g, "\\r");
}


/* ================= AUTO REFRESH ================= */

/*
    Dashboard automatically checks
    for new reports every 10 seconds.
*/

setInterval(() => {

    loadReports();

}, 10000);