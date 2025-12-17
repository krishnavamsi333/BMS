// config.js - Enhanced Configuration
// ==========================================

const CONFIG = {
    // File constraints
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    FILE_TIMEOUT: 30000, // 30 seconds
    
    // Data constraints
    CELL_COUNT: 16,
    TEMP_SENSOR_COUNT: 5,
    
    // Validation ranges
    VALID_RANGES: {
        CELL_VOLTAGE: { min: 2.0, max: 4.5 },
        CELL_TEMP: { min: -40, max: 120 },
        PACK_VOLTAGE: { min: 0, max: 100 },
        CURRENT: { min: -200, max: 200 },
        SOC: { min: 0, max: 100 }
    },
    
    // Chart configuration
    CHART: {
        COLORS: {
            voltage: '#1d4ed8',
            current: '#6d28d9',
            soc: '#047857',
            power: '#b45309',
            energy: '#4338ca',
            threshold: '#b91c1c',
            warning: '#c2410c',
            
            cellVoltages: [
                '#1d4ed8', '#6d28d9', '#047857', '#b45309',
                '#b91c1c', '#0e7490', '#9d174d', '#3f6212',
                '#4338ca', '#c2410c', '#115e59', '#7e22ce',
                '#166534', '#854d0e', '#075985', '#9f1239'
            ],

            temperatures: [
                '#991b1b', '#c2410c', '#b45309', '#4d7c0f', '#047857'
            ]
        },
        DEFAULTS: {
            tension: 0.35,
            pointRadius: 0,
            borderWidth: 2,
            maxTicksLimit: 15
        },
        ZOOM: {
            wheel: { enabled: true, speed: 0.1 },
            pinch: { enabled: true },
            pan: { enabled: true, modifierKey: 'ctrl' }
        }
    },
    
    // Default thresholds
    THRESHOLDS: {
        VOLTAGE: { min: 48.0, max: 60.0 },
        CURRENT: { max: 50.0 },
        SOC: { min: 20.0 },
        CELL_IMBALANCE: { max: 0.2 },
        CELL_TEMP: { max: 45.0 }
    },
    
    // Smoothing configuration
    SMOOTHING: {
        WINDOW_SIZE: 5,
        FIELDS: ['voltage', 'current', 'power', 'soc']
    },
    
    // Animation settings
    ANIMATION: {
        FADE_IN_DELAY: 100,
        STAGGER_DELAY: 100,
        SUCCESS_FEEDBACK_DURATION: 2000
    }
};

// ==========================================
// Global state management
// ==========================================

const STATE = {
    charts: {},
    currentData: [],
    timeMode: 'absolute',
    smoothingEnabled: false,
    
    // Existing energy tracking (UNCHANGED)
    energyData: {
        totalKWh: 0,
        netKWh: 0,
        chargedKWh: 0,
        dischargedKWh: 0,
        efficiency: 0
    },

    // ✅ NEW: Runtime & Cost tracking
    runtimeData: {
        seconds: 0,
        minutes: 0,
        hours: 0,

        energyWh: 0,
        energyKWh: 0,

        unitPrice: 0,      // price per kWh
        totalCost: 0,
        costPerHour: 0
    },
    
    thresholds: {
        voltageLow: CONFIG.THRESHOLDS.VOLTAGE.min,
        voltageHigh: CONFIG.THRESHOLDS.VOLTAGE.max,
        currentMax: CONFIG.THRESHOLDS.CURRENT.max,
        socLow: CONFIG.THRESHOLDS.SOC.min
    },
    
    reset() {
        this.charts = {};
        this.currentData = [];
        
        // Reset energy data
        this.energyData = {
            totalKWh: 0,
            netKWh: 0,
            chargedKWh: 0,
            dischargedKWh: 0,
            efficiency: 0
        };

        // ✅ Reset runtime & cost data
        this.runtimeData = {
            seconds: 0,
            minutes: 0,
            hours: 0,
            energyWh: 0,
            energyKWh: 0,
            unitPrice: 0,
            totalCost: 0,
            costPerHour: 0
        };
    }
};

// ==========================================
// Make globals accessible (for compatibility)
// ==========================================

let charts = STATE.charts;
let currentData = STATE.currentData;
let timeMode = STATE.timeMode;
let smoothingEnabled = STATE.smoothingEnabled;
let energyData = STATE.energyData;
let runtimeData = STATE.runtimeData;
let thresholds = STATE.thresholds;

// Version info
console.info('BMS Visualizer Config v2.1 - Runtime & Cost Enabled');
