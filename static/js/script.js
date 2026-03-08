let activeCharts = {};

document.addEventListener('DOMContentLoaded', () => {
    initDashboard();
    initPredictionHandler();
});

// --- NAVIGATION SYSTEM ---
function showSection(sectionId, element) {
    document.querySelectorAll('.nav-links li').forEach(el => el.classList.remove('active'));
    element.classList.add('active');
    document.querySelectorAll('.content-section').forEach(sec => sec.classList.add('hidden'));
    document.getElementById(sectionId).classList.remove('hidden');
    const label = element.querySelector('span').innerText;
    document.getElementById('breadcrumb-text').innerText = `Home > ${label}`;
    lucide.createIcons();

    if (sectionId === 'analysis') loadAnalytics();
    if (sectionId === 'performance') loadPerformance();
}

// --- DASHBOARD LOGIC ---
async function initDashboard() {
    try {
        const res = await fetch('/api/stats');
        const data = await res.json();
        document.getElementById('stat-total').innerText = data.total_patients.toLocaleString();
        document.getElementById('stat-age').innerText = `${data.avg_age.toFixed(1)}y`;
        document.getElementById('stat-bmi').innerText = data.avg_bmi.toFixed(1);
    } catch (e) { console.error("Dashboard Error:", e); }
}

// --- ANALYTICS SYSTEM ---
async function loadAnalytics() {
    const res = await fetch('/api/stats');
    const data = await res.json();

    renderChart('ageDistChart', 'bar', {
        labels: data.age_bins.labels,
        datasets: [{ label: 'Patients', data: data.age_bins.data, backgroundColor: '#6366f1', borderRadius: 8 }]
    });

    renderChart('genderPieChart', 'doughnut', {
        labels: ['Female', 'Male'],
        datasets: [{ data: [data.gender_dist['1'], data.gender_dist['2']], backgroundColor: ['#8b5cf6', '#22d3ee'], borderWidth: 0 }]
    });

    renderChart('cholChart', 'bar', {
        labels: ['Normal', 'High', 'V.High'],
        datasets: [{ label: 'Count', data: data.chol_dist, backgroundColor: ['#10b981', '#f59e0b', '#ef4444'], borderRadius: 8 }]
    });
}

// --- MODEL PERFORMANCE ---
async function loadPerformance() {
    const res = await fetch('/api/performance');
    const data = await res.json();

    document.getElementById('perf-acc').innerText = (data.accuracy * 100).toFixed(1) + '%';
    document.getElementById('perf-prec').innerText = (data.precision * 100).toFixed(1) + '%';
    document.getElementById('perf-rec').innerText = (data.recall * 100).toFixed(1) + '%';

    // Model Comparison Chart
    renderChart('comparisonChart', 'bar', {
        labels: data.comparison.labels,
        datasets: [{
            label: 'Accuracy Score',
            data: data.comparison.values,
            backgroundColor: data.comparison.labels.map(l => l === 'Random Forest' ? '#6366f1' : 'rgba(255,255,255,0.05)'),
            borderColor: data.comparison.labels.map(l => l === 'Random Forest' ? '#8b5cf6' : 'rgba(255,255,255,0.1)'),
            borderWidth: 1,
            borderRadius: 12
        }]
    }, {
        indexAxis: 'y',
        scales: {
            x: { min: 0.6, max: 0.8, grid: { color: 'rgba(255,255,255,0.03)' }, ticks: { color: '#94a3b8' } },
            y: { grid: { display: false }, ticks: { color: '#f8fafc' } }
        }
    });

    // Feature Contribution
    renderChart('featureChart', 'doughnut', {
        labels: data.feature_importance.map(i => i.feature),
        datasets: [{
            data: data.feature_importance.map(i => i.value),
            backgroundColor: ['#6366f1', '#8b5cf6', '#a855f7', '#d946ef', '#ec4899'],
            borderWidth: 0
        }]
    });
}

// --- PREDICTION SYSTEM ---
function initPredictionHandler() {
    const form = document.getElementById('predictionForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const btn = document.getElementById('predictBtn');
        btn.innerText = "Analyzing Intelligence...";
        btn.disabled = true;

        const fd = new FormData(form);
        const payload = {
            age: fd.get('age'), gender: fd.get('gender'), height: fd.get('height'), weight: fd.get('weight'),
            ap_hi: fd.get('ap_hi'), ap_lo: fd.get('ap_lo'), cholesterol: fd.get('cholesterol'), gluc: fd.get('gluc'),
            smoke: fd.get('smoke') ? 1 : 0, alco: fd.get('alco') ? 1 : 0, active: fd.get('active') ? 1 : 0
        };

        try {
            const res = await fetch('/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            showPredictionResult(result);
        } catch (err) {
            alert("Calculation error. Check server logs.");
        } finally {
            btn.innerText = "Run Predictive Engine";
            btn.disabled = false;
        }
    });
}

function showPredictionResult(data) {
    document.getElementById('resultArea').classList.remove('hidden');
    const prob = Math.round(data.probability * 100);
    document.getElementById('probValue').innerText = prob;

    const title = document.getElementById('predictionTitle');
    const desc = document.getElementById('predictionDesc');

    if (data.prediction === 1) {
        title.innerText = "High Risk Detected";
        title.style.color = "#ef4444";
        desc.innerText = "Patient shows significant biological markers associated with cardiovascular conditions.";
    } else {
        title.innerText = "Low Risk Profile";
        title.style.color = "#10b981";
        desc.innerText = "Biological indicators are within the safety threshold calibrated by our model.";
    }

    renderGauge(data.probability);
    const container = document.querySelector('.main-content');
    container.scroll({ top: container.scrollHeight, behavior: 'smooth' });
}

function renderChart(id, type, data, extraOptions = {}) {
    if (activeCharts[id]) activeCharts[id].destroy();
    const ctx = document.getElementById(id).getContext('2d');
    activeCharts[id] = new Chart(ctx, {
        type: type,
        data: data,
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: type === 'doughnut', position: 'right', labels: { color: '#94a3b8', font: { size: 10 } } } },
            scales: type === 'bar' ? {
                y: { ticks: { color: '#94a3b8' }, grid: { display: false } },
                x: { ticks: { color: '#94a3b8' }, grid: { color: 'rgba(255,255,255,0.05)' } }
            } : {},
            ...extraOptions
        }
    });
}

function renderGauge(probability) {
    renderChart('gaugeChart', 'doughnut', {
        datasets: [{
            data: [probability, 1 - probability],
            backgroundColor: [probability > 0.5 ? '#ef4444' : '#10b981', 'rgba(255,255,255,0.05)'],
            circumference: 180, rotation: 270, borderWidth: 0, borderRadius: 10, cutout: '80%'
        }]
    }, { plugins: { legend: { display: false } } });
}

function resetApp() {
    document.getElementById('predictionForm').reset();
    document.getElementById('resultArea').classList.add('hidden');
}
