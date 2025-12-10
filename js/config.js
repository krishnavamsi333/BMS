// config.js - Global configuration and shared variables

// Global variables that need to be accessible across files
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
    voltageLow: 48.0,
    voltageHigh: 60.0,
    currentMax: 50.0,
    socLow: 20.0
};

// Configuration constants
const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024,
    THRESHOLDS: {
        VOLTAGE: { min: 48.0, max: 60.0 },
        CURRENT: { max: 50.0 },
        SOC: { min: 20.0 }
    }
};

// Chart configuration
const CHART_CONFIG = {
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
};