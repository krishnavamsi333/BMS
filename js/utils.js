// js/utils.js

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
    Object.values(charts).forEach(chart => {
        if (chart) chart.destroy();
    });
    charts = {};
    currentData = [];
    energyData = {
        totalKWh: 0,
        netKWh: 0,
        chargedKWh: 0,
        dischargedKWh: 0,
        efficiency: 0
    };
}

function clearData() {
    cleanup();
    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');
    const chartsSection = document.getElementById('chartsSection');
    const statsSection = document.getElementById('statsSection');
    const thresholdControls = document.getElementById('thresholdControls');
    const alertsSection = document.getElementById('alertsSection');
    const errorSection = document.getElementById('errorSection');
    const energySummary = document.getElementById('energySummary');

    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = 'No file selected';
    if (chartsSection) chartsSection.style.display = 'none';
    if (statsSection) statsSection.style.display = 'none';
    if (thresholdControls) thresholdControls.style.display = 'none';
    if (alertsSection) alertsSection.style.display = 'none';
    if (errorSection) errorSection.style.display = 'none';
    if (energySummary) energySummary.style.display = 'none';
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

function exportData() {
    if (currentData.length === 0) {
        alert('No data to export. Please load a file first.');
        return;
    }

    try {
        const includeFields = ['timestamp', 'relativeTime', 'voltage', 'current', 'soc', 'power', 'cumulativeEnergyKWh'];
        const exportDataArray = currentData.map(entry => {
            const row = {};
            includeFields.forEach(field => {
                row[field] = entry[field] !== undefined && entry[field] !== null ? entry[field] : '';
            });
            return row;
        });

        const csv = Papa.unparse(exportDataArray, {
            header: true,
            skipEmptyLines: true
        });

        downloadCSV(csv, `bms_data_${new Date().toISOString().slice(0, 10)}.csv`);

        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) {
            const originalText = exportBtn.textContent;
            exportBtn.textContent = '✅ Export Successful!';
            exportBtn.style.background = 'var(--success)';
            exportBtn.style.color = 'white';
            setTimeout(() => {
                exportBtn.textContent = originalText;
                exportBtn.style.background = '';
                exportBtn.style.color = '';
            }, 2000);
        }

    } catch (error) {
        console.error('Export error:', error);
        alert('Export failed: ' + error.message);
    }
}

function exportFullData() {
    exportData();
}
