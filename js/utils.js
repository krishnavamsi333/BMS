// Shared helpers and small utilities

function updateProgress(percent, text) {
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressText');
    if (!fill || !label) return;
    fill.style.width = percent + '%';
    label.textContent = text;
}

function animateElements() {
    setTimeout(() => {
        document.querySelectorAll('.stat-card').forEach(card => {
            card.classList.add('animate');
        });
        document.querySelectorAll('.chart-container').forEach(container => {
            container.classList.add('animate');
        });
    }, 100);
}

function showError(message) {
    const loading = document.getElementById('loadingSection');
    const progress = document.getElementById('progressSection');
    const errorSection = document.getElementById('errorSection');

    if (loading) loading.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (errorSection) {
        errorSection.style.display = 'block';
        errorSection.textContent = message;
    }
    console.error('BMS Visualizer Error:', message);
}

function cleanup() {
    if (window.charts) {
        Object.values(window.charts).forEach(chart => {
            if (chart) chart.destroy();
        });
    }
    window.charts = {};
    window.currentData = [];
    window.energyData = {
        totalKWh: 0,
        netKWh: 0,
        chargedKWh: 0,
        dischargedKWh: 0,
        efficiency: 0
    };
}

function downloadCSV(csv, filename) {
    try {
        const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        link.style.display = 'none';

        document.body.appendChild(link);
        link.click();

        setTimeout(() => {
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        }, 100);
    } catch (error) {
        console.error('Download error:', error);
        alert('Download failed: ' + error.message);
    }
}
