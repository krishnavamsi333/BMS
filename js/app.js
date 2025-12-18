// ==============================
// GLOBAL CONSTANTS
// ==============================
const CELL_COUNT = 16;
const TEMP_SENSOR_COUNT = 5;

// ==============================
// CHART COMMON OPTIONS (FIX)
// ==============================
const commonOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false
    },
    plugins: {
        legend: {
            display: true
        },
        tooltip: {
            enabled: true
        }
    },
    scales: {
        x: {
            display: true,
            title: {
                display: true,
                text: 'Time'
            }
        }
    }
};

// ==============================
// FILE VALIDATION
// ==============================
function validateFile(file) {
    if (!file) {
        throw new Error('No file selected');
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(
            `File too large: ${(file.size / 1024 / 1024).toFixed(2)}MB ` +
            `(max ${CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB)`
        );
    }

    const validExtensions = ['.yaml', '.yml', '.txt'];
    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(ext)) {
        throw new Error(`Invalid file type (${validExtensions.join(', ')})`);
    }

    return true;
}

// ==============================
// CELL / TEMP FILTERING
// ==============================
function filterCellVoltages(voltages) {
    if (!Array.isArray(voltages)) {
        return Array(CELL_COUNT).fill(null);
    }

    return voltages
        .slice(0, CELL_COUNT)
        .map(v =>
            typeof v === 'number' && v >= 2.0 && v <= 4.5 ? v : null
        );
}

function filterCellTemperatures(temps) {
    if (!Array.isArray(temps)) {
        return Array(TEMP_SENSOR_COUNT).fill(null);
    }

    return temps
        .slice(0, TEMP_SENSOR_COUNT)
        .map(t =>
            typeof t === 'number' && t >= -40 && t <= 120 ? t : null
        );
}

// ==============================
// DATA VALIDATION (PER TIMESTAMP)
// ==============================
function validateAndFilterData(data) {
    return data
        .filter(d => d && d.timestamp)
        .map(d => ({
            ...d,
            cell_voltages: filterCellVoltages(d.cell_voltages),
            cell_temperatures: filterCellTemperatures(d.cell_temperatures)
        }));
}

// ==============================
// FILE HANDLING
// ==============================
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
        document.getElementById('alertsSection').style.display = 'none';
        document.getElementById('thresholdControls').style.display = 'none';
        document.getElementById('energySummary').style.display = 'none';
        
        const tariffPanel = document.getElementById('tariffPresets');
        if (tariffPanel) tariffPanel.style.display = 'none'; // Hide initially

        const reader = new FileReader();
        const timeout = setTimeout(() => {
            reader.abort();
            showError('File processing timeout');
        }, 30000);

        reader.onprogress = e => {
            if (e.lengthComputable) {
                const pct = Math.round((e.loaded / e.total) * 100);
                updateProgress(pct, `Loading ${pct}%`);
            }
        };

        reader.onload = e => {
            clearTimeout(timeout);
            try {
                updateProgress(50, 'Parsing YAML...');
                const raw = parseYAML(e.target.result);

                if (!raw || raw.length === 0) {
                    throw new Error('No valid data in file');
                }

                updateProgress(65, 'Filtering data...');
                currentData = validateAndFilterData(raw);
                STATE.currentData = currentData;
                
                updateProgress(70, 'Calculating energy...');
                calculateEnergyConsumption(currentData);
                
                updateProgress(75, 'Calculating runtime & cost...');
                calculateRuntimeAndCost(currentData);

                updateProgress(80, 'Smoothing data...');
                const smoothed = smoothData(currentData);

                updateProgress(85, 'Checking alerts...');
                checkAlerts(smoothed);
                
                updateProgress(90, 'Rendering charts...');
                displayStats(smoothed);
                displayEnergySummary();
                displayRuntimeAndCost();
                
                createCharts(smoothed);
                createCellCharts(smoothed);
                
                // Create hourly cost chart (will show placeholder if no tariff set)
                if (typeof createHourlyCostChart === 'function') {
                    createHourlyCostChart();
                }

                if (smoothed.some(d => d.cell_voltages || d.cell_temperatures)) {
                    document.getElementById('cellChartsSection').style.display = 'block';
                }

                updateProgress(100, 'Done');

                setTimeout(() => {
                    document.getElementById('loadingSection').style.display = 'none';
                    document.getElementById('progressSection').style.display = 'none';
                    document.getElementById('chartsSection').style.display = 'block';
                    document.getElementById('statsSection').style.display = 'grid';
                    document.getElementById('thresholdControls').style.display = 'block';
                    document.getElementById('energySummary').style.display = 'block';
                    
                    // Show runtime panel
                    const runtimePanel = document.getElementById('runtimeCostSummary');
                    if (runtimePanel) {
                        runtimePanel.style.display = 'grid';
                    }
                    
                    // Show tariff panel
                    if (tariffPanel) {
                        tariffPanel.style.display = 'block';
                    }
                    
                    animateElements();
                }, 300);

            } catch (err) {
                showError('Processing error: ' + err.message);
            }
        };

        reader.onerror = () => showError('File read error');
        reader.readAsText(file);

    } catch (err) {
        showError(err.message);
    }
}

// ==============================
// UI CONTROLS
// ==============================
function setTimeMode(mode) {
    timeMode = mode;
    STATE.timeMode = mode;

    document.querySelectorAll('.control-btn')
        .forEach(b => b.classList.remove('active'));

    const abs = document.getElementById('absoluteTimeBtn');
    const rel = document.getElementById('relativeTimeBtn');

    if (mode === 'absolute') {
        abs.classList.add('active');
        abs.setAttribute('aria-pressed', 'true');
        rel.setAttribute('aria-pressed', 'false');
    } else {
        rel.classList.add('active');
        rel.setAttribute('aria-pressed', 'true');
        abs.setAttribute('aria-pressed', 'false');
    }

    if (currentData.length) {
        const smoothed = smoothingEnabled ? smoothData(currentData) : currentData;
        createCharts(smoothed);
        if (typeof createHourlyCostChart === 'function') {
            createHourlyCostChart();
        }
    }
}

function toggleSmoothing() {
    smoothingEnabled = !smoothingEnabled;
    STATE.smoothingEnabled = smoothingEnabled;
    
    const btn = document.getElementById('smoothingBtn');
    btn.textContent = `Smoothing: ${smoothingEnabled ? 'On' : 'Off'}`;
    btn.setAttribute('aria-pressed', smoothingEnabled);
    
    if (currentData.length) {
        const smoothed = smoothingEnabled ? smoothData(currentData) : currentData;
        createCharts(smoothed);
        createCellCharts(smoothed);
        if (typeof createHourlyCostChart === 'function') {
            createHourlyCostChart();
        }
    }
}

// ==============================
// THRESHOLDS
// ==============================
function updateThresholds() {
    thresholds.voltageLow = +document.getElementById('thVoltageLow').value;
    thresholds.voltageHigh = +document.getElementById('thVoltageHigh').value;
    thresholds.currentMax = +document.getElementById('thCurrentMax').value;
    thresholds.socLow = +document.getElementById('thSocLow').value;
    
    STATE.thresholds = thresholds;

    if (currentData.length) {
        const smoothed = smoothingEnabled ? smoothData(currentData) : currentData;
        checkAlerts(smoothed);
        createCharts(smoothed);
    }
}

function setupDefaultThresholds() {
    document.getElementById('thVoltageLow').value = thresholds.voltageLow;
    document.getElementById('thVoltageHigh').value = thresholds.voltageHigh;
    document.getElementById('thCurrentMax').value = thresholds.currentMax;
    document.getElementById('thSocLow').value = thresholds.socLow;
}

// ==============================
// ✅ CUSTOM TARIFF HANDLER
// ==============================
function applyCustomTariff() {
    const input = document.getElementById('customTariffInput');
    if (!input) return;
    
    const value = parseFloat(input.value);
    
    if (isNaN(value) || value < 0) {
        alert('Please enter a valid positive number for the tariff rate');
        return;
    }
    
    // Apply the tariff
    setTariff(value);
    
    // Visual feedback
    const btn = document.getElementById('applyCustomTariffBtn');
    if (btn) {
        const originalText = btn.textContent;
        btn.textContent = '✓ Applied!';
        btn.style.background = 'var(--success)';
        
        setTimeout(() => {
            btn.textContent = originalText;
            btn.style.background = '';
        }, 2000);
    }
    
    console.info(`Custom tariff applied: ${value} per kWh`);
}

// Make it globally accessible
window.applyCustomTariff = applyCustomTariff;

// ==============================
// INIT
// ==============================
function bindEvents() {
    document.getElementById('fileInput').addEventListener('change', handleFileSelect);
    document.getElementById('absoluteTimeBtn').addEventListener('click', () => setTimeMode('absolute'));
    document.getElementById('relativeTimeBtn').addEventListener('click', () => setTimeMode('relative'));
    document.getElementById('smoothingBtn').addEventListener('click', toggleSmoothing);
    document.getElementById('exportBtn').addEventListener('click', exportData);
    document.getElementById('exportFullBtn')?.addEventListener('click', exportFullData);
    document.getElementById('clearBtn').addEventListener('click', clearData);
    document.getElementById('updateThresholdsBtn').addEventListener('click', updateThresholds);
    
    // ✅ Bind custom tariff input - allow Enter key
    const customTariffInput = document.getElementById('customTariffInput');
    if (customTariffInput) {
        customTariffInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                applyCustomTariff();
            }
        });
    }

    window.addEventListener('error', e => {
        showError(`Unexpected error: ${e.error?.message || 'Unknown'}`);
    });
}

function init() {
    bindEvents();
    setupDefaultThresholds();
    console.info('BMS Visualizer initialized successfully');
}

document.addEventListener('DOMContentLoaded', init);