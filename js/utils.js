// js/utils.js

function updateProgress(percent, text) {
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressText');
    if (fill) fill.style.width = percent + '%';
    if (label) label.textContent = text;
}

function animateElements() {
    setTimeout(() => {
        document.querySelectorAll('.stat-card').forEach(card =>
            card.classList.add('animate')
        );
        document.querySelectorAll('.chart-container').forEach(container =>
            container.classList.add('animate')
        );
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
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
        }
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

    // ✅ Reset runtime & cost data
    if (typeof STATE !== 'undefined' && STATE.runtimeData) {
        STATE.runtimeData.seconds = 0;
        STATE.runtimeData.minutes = 0;
        STATE.runtimeData.hours = 0;
        STATE.runtimeData.unitPrice = 0;
    }
}

function clearData() {
    cleanup();

    const idsToHide = [
        'chartsSection',
        'cellChartsSection',
        'statsSection',
        'thresholdControls',
        'alertsSection',
        'errorSection',
        'energySummary',
        'costCalculator',
        'progressSection',
        'loadingSection'
    ];

    idsToHide.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.style.display = 'none';
    });

    const fileInput = document.getElementById('fileInput');
    const fileName = document.getElementById('fileName');

    if (fileInput) fileInput.value = '';
    if (fileName) fileName.textContent = 'No file selected';
}

function downloadCSV(csv, filename) {
    try {
        const blob = new Blob(['\uFEFF' + csv], {
            type: 'text/csv;charset=utf-8;'
        });
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
    if (!Array.isArray(currentData) || currentData.length === 0) {
        alert('No data to export. Please load a file first.');
        return;
    }

    try {
        const fields = [
            'timestamp',
            'relativeTime',
            'voltage',
            'current',
            'soc',
            'power',
            'cumulativeEnergyKWh'
        ];

        const rows = currentData.map(entry => {
            const row = {};
            fields.forEach(f => {
                row[f] = entry[f] ?? '';
            });
            return row;
        });

        const csv = Papa.unparse(rows, {
            header: true,
            skipEmptyLines: true
        });

        downloadCSV(
            csv,
            `bms_data_${new Date().toISOString().slice(0, 10)}.csv`
        );

        const btn = document.getElementById('exportBtn');
        if (btn) {
            const old = btn.textContent;
            btn.textContent = '✅ Exported';
            btn.style.background = 'var(--success)';
            btn.style.color = '#fff';

            setTimeout(() => {
                btn.textContent = old;
                btn.style.background = '';
                btn.style.color = '';
            }, 2000);
        }
    } catch (err) {
        console.error('Export error:', err);
        alert('Export failed: ' + err.message);
    }
}

function exportFullData() {
    exportData();
}