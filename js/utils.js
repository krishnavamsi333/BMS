// js/utils.js

// Configuration object (shared by all files)
const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50 MB
    CHART: {
        COLORS: {
            voltage: '#3b82f6',
            current: '#8b5cf6',
            soc: '#10b981',
            power: '#f59e0b',
            energy: '#8b5cf6',
            threshold: '#ef4444',
            warning: '#f59e0b'
        },
        ANIMATION: {
            duration: 1000,
            easing: 'easeOutQuart'
        }
    },
    THRESHOLDS: {
        VOLTAGE: { min: 48.0, max: 60.0 },
        CURRENT: { max: 50.0 },
        SOC: { min: 20.0 }
    }
};

// Global state (shared)
let charts = {};
let currentData = [];
let timeMode = 'absolute';
let smoothingEnabled = false;
let energyData = {
    totalKWh: 0,
    netKWh: 0,
    chargedKWh: 0,
    dischargedKWh: 0,
    efficiency: 0
};
let thresholds = {
    voltageLow: CONFIG.THRESHOLDS.VOLTAGE.min,
    voltageHigh: CONFIG.THRESHOLDS.VOLTAGE.max,
    currentMax: CONFIG.THRESHOLDS.CURRENT.max,
    socLow: CONFIG.THRESHOLDS.SOC.min
};

// ---------- Helpers ----------

// js/utils.js

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
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
        throw new Error(
            `Invalid file type. Please select a YAML file (${validExtensions.join(', ')})`
        );
    }

    return true;
}


function updateProgress(percent, text) {
    const fill = document.getElementById('progressFill');
    const label = document.getElementById('progressText');
    if (!fill || !label) return;

    fill.style.width = percent + '%';
    label.textContent = text;
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

function showError(message) {
    const loading = document.getElementById('loadingSection');
    const progress = document.getElementById('progressSection');
    const errorBox = document.getElementById('errorSection');

    if (loading) loading.style.display = 'none';
    if (progress) progress.style.display = 'none';
    if (errorBox) {
        errorBox.style.display = 'block';
        errorBox.textContent = message;
    }

    console.error('BMS Visualizer Error:', message);
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
