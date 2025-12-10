function showError(message) {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'none';
    const errorSection = document.getElementById('errorSection');
    errorSection.style.display = 'block';
    errorSection.textContent = message;
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
    document.getElementById('fileInput').value = '';
    document.getElementById('fileName').textContent = 'No file selected';
    document.getElementById('chartsSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('thresholdControls').style.display = 'none';
    document.getElementById('alertsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('energySummary').style.display = 'none';
}

function resetZoom(chartName) {
    if (charts[chartName]) {
        charts[chartName].resetZoom();
    }
}

function downloadChart(chartName) {
    if (charts[chartName]) {
        const link = document.createElement('a');
        link.download = `bms_${chartName}_chart.png`;
        link.href = charts[chartName].toBase64Image();
        link.click();
    }
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
    if (currentData.length === 0) {
        alert('No data to export. Please load a file first.');
        return;
    }

    const includeFields = [
        'timestamp',
        'relativeTime',
        'voltage',
        'current',
        'soc',
        'power',
        'cumulativeEnergyKWh'
    ];
    const exportDataArray = currentData.map(entry => {
        const row = {};
        includeFields.forEach(field => {
            row[field] =
                entry[field] !== undefined && entry[field] !== null
                    ? entry[field]
                    : '';
        });
        return row;
    });

    const csv = Papa.unparse(exportDataArray, {
        header: true,
        skipEmptyLines: true
    });

    downloadCSV(
        csv,
        `bms_data_${new Date().toISOString().slice(0, 10)}.csv`
    );

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
}

function exportFullData() {
    exportData();
}

function setTimeMode(mode) {
    timeMode = mode;
    document
        .querySelectorAll('.control-btn')
        .forEach(btn => btn.classList.remove('active'));

    if (mode === 'absolute') {
        document.getElementById('absoluteTimeBtn').classList.add('active');
    } else {
        document.getElementById('relativeTimeBtn').classList.add('active');
    }

    if (currentData.length > 0) {
        const dataToUse = smoothingEnabled
            ? smoothData(currentData)
            : currentData;
        createCharts(dataToUse);
    }
}

function toggleSmoothing() {
    smoothingEnabled = !smoothingEnabled;
    document.getElementById('smoothingBtn').textContent =
        'Smoothing: ' + (smoothingEnabled ? 'On' : 'Off');
    if (currentData.length > 0) {
        const dataToUse = smoothingEnabled
            ? smoothData(currentData)
            : currentData;
        createCharts(dataToUse);
    }
}

function updateThresholds() {
    thresholds.voltageLow = parseFloat(
        document.getElementById('thVoltageLow').value
    );
    thresholds.voltageHigh = parseFloat(
        document.getElementById('thVoltageHigh').value
    );
    thresholds.currentMax = parseFloat(
        document.getElementById('thCurrentMax').value
    );
    thresholds.socLow = parseFloat(
        document.getElementById('thSocLow').value
    );

    if (currentData.length > 0) {
        const dataToUse = smoothingEnabled
            ? smoothData(currentData)
            : currentData;
        checkAlerts(dataToUse);
        createCharts(dataToUse);
    }
}
