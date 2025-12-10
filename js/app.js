// js/app.js

function init() {
    bindEvents();
    setupDefaultThresholds();

    window.addEventListener('error', function (e) {
        showError(`Unexpected error: ${e.error?.message || 'Unknown error'}`);
    });
}

function bindEvents() {
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('absoluteTimeBtn').addEventListener('click', () =>
        setTimeMode('absolute')
    );
    document.getElementById('relativeTimeBtn').addEventListener('click', () =>
        setTimeMode('relative')
    );
    document.getElementById('smoothingBtn').addEventListener('click', toggleSmoothing);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('clearBtn').addEventListener('click', clearData);
    document
        .getElementById('updateThresholdsBtn')
        .addEventListener('click', updateThresholds);
    document.getElementById('exportFullBtn').addEventListener('click', exportFullData);
}

function setupDefaultThresholds() {
    document.getElementById('thVoltageLow').value = thresholds.voltageLow;
    document.getElementById('thVoltageHigh').value = thresholds.voltageHigh;
    document.getElementById('thCurrentMax').value = thresholds.currentMax;
    document.getElementById('thSocLow').value = thresholds.socLow;
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = file.name;
        processFile(file);
    }
}

function processFile(file) {
    try {
        validateFile(file);
        cleanup();

        document.getElementById('loadingSection').style.display = 'block';
        document.getElementById('progressSection').style.display = 'block';
        document.getElementById('chartsSection').style.display = 'none';
        document.getElementById('statsSection').style.display = 'none';
        document.getElementById('errorSection').style.display = 'none';
        document.getElementById('alertsSection').style.display = 'none';
        document.getElementById('thresholdControls').style.display = 'none';
        document.getElementById('energySummary').style.display = 'none';

        const reader = new FileReader();
        let processingTimeout;

        processingTimeout = setTimeout(() => {
            showError('File processing timeout. File might be too large or corrupted.');
            reader.abort();
        }, 30000);

        reader.onprogress = function (e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(percent, `Loading: ${percent}%`);
            }
        };

        reader.onload = function (e) {
            clearTimeout(processingTimeout);

            try {
                updateProgress(50, 'Parsing YAML data...');
                const text = e.target.result;
                const data = parseYAML(text);

                if (data.length === 0) {
                    throw new Error('No valid data found in file. Please check the file format.');
                }

                updateProgress(75, 'Processing data...');
                currentData = validateAndFilterData(data);
                calculateEnergyConsumption(currentData);
                const smoothedData = smoothData(currentData);

                updateProgress(90, 'Creating visualizations...');
                displayStats(smoothedData);
                displayEnergySummary();
                checkAlerts(smoothedData);
                createCharts(smoothedData);

                updateProgress(100, 'Complete!');

                setTimeout(() => {
                    document.getElementById('loadingSection').style.display = 'none';
                    document.getElementById('progressSection').style.display = 'none';
                    document.getElementById('chartsSection').style.display = 'block';
                    document.getElementById('statsSection').style.display = 'grid';
                    document.getElementById('thresholdControls').style.display = 'block';
                    document.getElementById('energySummary').style.display = 'block';
                    animateElements();
                }, 500);
            } catch (error) {
                clearTimeout(processingTimeout);
                showError('Error processing file: ' + error.message);
            }
        };

        reader.onerror = function () {
            clearTimeout(processingTimeout);
            showError('Error reading file. The file may be corrupted or inaccessible.');
        };

        reader.readAsText(file);
    } catch (error) {
        showError(error.message);
    }
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

function setTimeMode(mode) {
    timeMode = mode;
    document.getElementById('absoluteTimeBtn').classList.toggle('active', mode === 'absolute');
    document.getElementById('relativeTimeBtn').classList.toggle('active', mode === 'relative');

    if (currentData.length > 0) {
        const data = smoothData(currentData);
        createCharts(data);
    }
}

function toggleSmoothing() {
    smoothingEnabled = !smoothingEnabled;
    document.getElementById('smoothingBtn').textContent =
        'Smoothing: ' + (smoothingEnabled ? 'On' : 'Off');
    if (currentData.length > 0) {
        const data = smoothData(currentData);
        createCharts(data);
    }
}

function updateThresholds() {
    thresholds.voltageLow = parseFloat(document.getElementById('thVoltageLow').value);
    thresholds.voltageHigh = parseFloat(document.getElementById('thVoltageHigh').value);
    thresholds.currentMax = parseFloat(document.getElementById('thCurrentMax').value);
    thresholds.socLow = parseFloat(document.getElementById('thSocLow').value);

    if (currentData.length > 0) {
        const data = smoothData(currentData);
        checkAlerts(data);
        createCharts(data);
    }
}

function exportData() {
    if (currentData.length === 0) {
        alert('No data to export. Please load a file first.');
        return;
    }

    try {
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
                    entry[field] !== undefined && entry[field] !== null ? entry[field] : '';
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

document.addEventListener('DOMContentLoaded', init);
