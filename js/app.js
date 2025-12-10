// app.js - Main app logic & initialization

// Initialize the application
function init() {
    bindEvents();
    setupDefaultThresholds();
    hideAllSections();
}

// Bind event listeners
function bindEvents() {
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('absoluteTimeBtn').addEventListener('click', () => setTimeMode('absolute'));
    document.getElementById('relativeTimeBtn').addEventListener('click', () => setTimeMode('relative'));
    document.getElementById('smoothingBtn').addEventListener('click', toggleSmoothing);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('clearBtn').addEventListener('click', clearData);
    document.getElementById('updateThresholdsBtn').addEventListener('click', updateThresholds);
    document.getElementById('exportFullBtn').addEventListener('click', exportFullData);
    
    // Global error handling
    window.addEventListener('error', function(e) {
        console.error('Global error:', e.error);
        showError(`Unexpected error: ${e.error?.message || 'Unknown error'}`);
    });
}

function hideAllSections() {
    document.getElementById('chartsSection').style.display = 'none';
    document.getElementById('statsSection').style.display = 'none';
    document.getElementById('thresholdControls').style.display = 'none';
    document.getElementById('alertsSection').style.display = 'none';
    document.getElementById('errorSection').style.display = 'none';
    document.getElementById('energySummary').style.display = 'none';
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'none';
}

function setupDefaultThresholds() {
    thresholds.voltageLow = CONFIG.THRESHOLDS.VOLTAGE.min;
    thresholds.voltageHigh = CONFIG.THRESHOLDS.VOLTAGE.max;
    thresholds.currentMax = CONFIG.THRESHOLDS.CURRENT.max;
    thresholds.socLow = CONFIG.THRESHOLDS.SOC.min;
    
    document.getElementById('thVoltageLow').value = thresholds.voltageLow;
    document.getElementById('thVoltageHigh').value = thresholds.voltageHigh;
    document.getElementById('thCurrentMax').value = thresholds.currentMax;
    document.getElementById('thSocLow').value = thresholds.socLow;
}

async function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = file.name;
        await processFile(file);
    }
}

async function processFile(file) {
    try {
        console.log('Processing file:', file.name);
        validateFile(file);
        cleanup();
        
        showLoading();
        
        console.log('Reading file...');
        const text = await readFileAsText(file);
        console.log('File read, parsing YAML...');
        
        const data = parseYAML(text);
        console.log('Parsed data points:', data.length);
        
        if (data.length === 0) {
            throw new Error('No valid data found in file. Please check the file format.');
        }

        console.log('Processing data...');
        currentData = validateAndFilterData(data);
        calculateEnergyConsumption(currentData);
        const smoothedData = smoothData(currentData);
        
        console.log('Creating visualizations...');
        displayStats(smoothedData);
        displayEnergySummary();
        checkAlerts(smoothedData);
        createCharts(smoothedData);
        
        showVisualizations();
        console.log('Visualization complete!');
    } catch (error) {
        console.error('Error in processFile:', error);
        showError('Error processing file: ' + error.message);
    } finally {
        hideLoading();
    }
}

function showLoading() {
    document.getElementById('loadingSection').style.display = 'block';
    document.getElementById('progressSection').style.display = 'block';
    hideAllSections();
}

function hideLoading() {
    document.getElementById('loadingSection').style.display = 'none';
    document.getElementById('progressSection').style.display = 'none';
}

function showVisualizations() {
    document.getElementById('chartsSection').style.display = 'block';
    document.getElementById('statsSection').style.display = 'grid';
    document.getElementById('thresholdControls').style.display = 'block';
    document.getElementById('energySummary').style.display = 'block';
    animateElements();
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

function setTimeMode(mode) {
    timeMode = mode;
    document.querySelectorAll('.control-btn').forEach(btn => btn.classList.remove('active'));
    
    if (mode === 'absolute') {
        document.getElementById('absoluteTimeBtn').classList.add('active');
    } else {
        document.getElementById('relativeTimeBtn').classList.add('active');
    }
    
    if (currentData.length > 0) {
        createCharts(currentData);
    }
}

function toggleSmoothing() {
    smoothingEnabled = !smoothingEnabled;
    document.getElementById('smoothingBtn').textContent = 'Smoothing: ' + (smoothingEnabled ? 'On' : 'Off');
    if (currentData.length > 0) {
        createCharts(currentData);
    }
}

function updateThresholds() {
    thresholds.voltageLow = parseFloat(document.getElementById('thVoltageLow').value);
    thresholds.voltageHigh = parseFloat(document.getElementById('thVoltageHigh').value);
    thresholds.currentMax = parseFloat(document.getElementById('thCurrentMax').value);
    thresholds.socLow = parseFloat(document.getElementById('thSocLow').value);
    
    if (currentData.length > 0) {
        checkAlerts(currentData);
        createCharts(currentData);
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
    hideAllSections();
}

// Make functions available globally
window.showError = showError;
window.setTimeMode = setTimeMode;
window.toggleSmoothing = toggleSmoothing;
window.updateThresholds = updateThresholds;
window.clearData = clearData;
window.exportData = exportData;
window.exportFullData = exportFullData;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', init);