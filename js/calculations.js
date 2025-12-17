// calculations.js - Enhanced Calculations
// ==========================================

/**
 * Calculate energy consumption using trapezoidal integration
 */
function calculateEnergyConsumption(data) {
    if (!Array.isArray(data) || data.length < 2) {
        console.warn('Insufficient data for energy calculation');
        return;
    }

    let totalEnergyWh = 0;
    let chargedEnergyWh = 0;
    let dischargedEnergyWh = 0;

    // Initialize first entry
    data[0].cumulativeEnergyWh = 0;
    data[0].cumulativeEnergyKWh = 0;

    // Integrate over time using trapezoidal rule
    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];

        // Validate required data
        if (!Number.isFinite(prev.current) || 
            !Number.isFinite(curr.current) ||
            !Number.isFinite(prev.voltage) || 
            !Number.isFinite(curr.voltage) ||
            !Number.isFinite(prev.relativeTime) || 
            !Number.isFinite(curr.relativeTime)) {
            
            curr.cumulativeEnergyWh = prev.cumulativeEnergyWh || 0;
            curr.cumulativeEnergyKWh = curr.cumulativeEnergyWh / 1000;
            continue;
        }

        // Calculate time difference in hours
        const dt = curr.relativeTime - prev.relativeTime;
        
        if (dt <= 0 || !isFinite(dt)) {
            curr.cumulativeEnergyWh = prev.cumulativeEnergyWh || 0;
            curr.cumulativeEnergyKWh = curr.cumulativeEnergyWh / 1000;
            continue;
        }

        // Trapezoidal integration: E = (V_avg * I_avg * dt)
        const avgCurrent = (prev.current + curr.current) / 2;
        const avgVoltage = (prev.voltage + curr.voltage) / 2;
        const dtHours = dt / 3600; // Convert seconds to hours
        const intervalWh = avgVoltage * avgCurrent * dtHours;

        // Accumulate total energy
        totalEnergyWh += intervalWh;

        // Track charging vs discharging
        if (avgCurrent > 0) {
            chargedEnergyWh += intervalWh;
        } else if (avgCurrent < 0) {
            dischargedEnergyWh += Math.abs(intervalWh);
        }

        // Store cumulative values
        curr.cumulativeEnergyWh = totalEnergyWh;
        curr.cumulativeEnergyKWh = totalEnergyWh / 1000;
    }

    // Update global energy data
    STATE.energyData.netKWh = totalEnergyWh / 1000;
    STATE.energyData.chargedKWh = chargedEnergyWh / 1000;
    STATE.energyData.dischargedKWh = dischargedEnergyWh / 1000;
    STATE.energyData.efficiency = chargedEnergyWh > 0
        ? (dischargedEnergyWh / chargedEnergyWh) * 100
        : 100;

    // Update reference
    energyData = STATE.energyData;

    console.info('Energy calculation complete:', {
        net: STATE.energyData.netKWh.toFixed(3),
        charged: STATE.energyData.chargedKWh.toFixed(3),
        discharged: STATE.energyData.dischargedKWh.toFixed(3),
        efficiency: STATE.energyData.efficiency.toFixed(1) + '%'
    });
}

/**
 * Display energy summary in UI
 */
function displayEnergySummary() {
    const grid = document.getElementById('energyGrid');
    if (!grid) return;

    const { netKWh, chargedKWh, dischargedKWh, efficiency } = STATE.energyData;
    const label = netKWh >= 0 ? 'Net Charged' : 'Net Discharged';

    grid.innerHTML = `
        <div class="energy-item">
            <div class="energy-label">${label}</div>
            <div class="energy-value">${Math.abs(netKWh).toFixed(3)} kWh</div>
        </div>
        <div class="energy-item">
            <div class="energy-label">Energy Charged</div>
            <div class="energy-value">${chargedKWh.toFixed(3)} kWh</div>
        </div>
        <div class="energy-item">
            <div class="energy-label">Energy Discharged</div>
            <div class="energy-value">${dischargedKWh.toFixed(3)} kWh</div>
        </div>
        <div class="energy-item">
            <div class="energy-label">Round-Trip Efficiency</div>
            <div class="energy-value">${efficiency.toFixed(1)}%</div>
        </div>
    `;
}

/**
 * Apply moving average smoothing to data
 */
function smoothData(data, windowSize = CONFIG.SMOOTHING.WINDOW_SIZE) {
    if (!smoothingEnabled || windowSize < 2 || data.length < windowSize) {
        return data;
    }

    const smoothed = JSON.parse(JSON.stringify(data));
    const fields = CONFIG.SMOOTHING.FIELDS;

    fields.forEach(field => {
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;

            // Calculate window bounds
            const start = Math.max(0, i - Math.floor(windowSize / 2));
            const end = Math.min(data.length - 1, i + Math.floor(windowSize / 2));

            // Sum values in window
            for (let j = start; j <= end; j++) {
                if (Number.isFinite(data[j][field])) {
                    sum += data[j][field];
                    count++;
                }
            }

            // Apply average
            if (count > 0) {
                smoothed[i][field] = sum / count;
            }
        }
    });

    console.info(`Applied smoothing (window: ${windowSize})`);
    return smoothed;
}

/**
 * Calculate comprehensive cell statistics
 */
function calculateCellStats(data) {
    if (!data.length || !Array.isArray(data[0].cell_voltages)) {
        return null;
    }

    let vSum = 0, vCount = 0;
    let tSum = 0, tCount = 0;

    const stats = {
        minCellVoltage: Infinity,
        maxCellVoltage: -Infinity,
        avgCellVoltage: 0,
        cellImbalance: 0,
        minCellTemp: Infinity,
        maxCellTemp: -Infinity,
        avgCellTemp: 0,
        cellCount: 0,
        tempCount: 0
    };

    // Analyze each data point
    data.forEach(entry => {
        // Process cell voltages
        if (Array.isArray(entry.cell_voltages)) {
            const validVoltages = entry.cell_voltages.filter(isValidCellVoltage);
            
            if (validVoltages.length > 0) {
                const min = Math.min(...validVoltages);
                const max = Math.max(...validVoltages);
                
                stats.minCellVoltage = Math.min(stats.minCellVoltage, min);
                stats.maxCellVoltage = Math.max(stats.maxCellVoltage, max);
                stats.cellImbalance = Math.max(stats.cellImbalance, max - min);
                stats.cellCount = Math.max(stats.cellCount, validVoltages.length);
                
                vSum += validVoltages.reduce((a, b) => a + b, 0) / validVoltages.length;
                vCount++;
            }
        }

        // Process cell temperatures
        if (Array.isArray(entry.cell_temperatures)) {
            const validTemps = entry.cell_temperatures.filter(isValidCellTemp);
            
            if (validTemps.length > 0) {
                stats.minCellTemp = Math.min(stats.minCellTemp, Math.min(...validTemps));
                stats.maxCellTemp = Math.max(stats.maxCellTemp, Math.max(...validTemps));
                stats.tempCount = Math.max(stats.tempCount, validTemps.length);
                
                tSum += validTemps.reduce((a, b) => a + b, 0) / validTemps.length;
                tCount++;
            }
        }
    });

    // Calculate averages
    stats.avgCellVoltage = vCount ? vSum / vCount : 0;
    stats.avgCellTemp = tCount ? tSum / tCount : 0;

    // Handle infinity values
    if (stats.minCellVoltage === Infinity) stats.minCellVoltage = 0;
    if (stats.maxCellVoltage === -Infinity) stats.maxCellVoltage = 0;
    if (stats.minCellTemp === Infinity) stats.minCellTemp = 0;
    if (stats.maxCellTemp === -Infinity) stats.maxCellTemp = 0;

    return stats;
}

/**
 * Validate cell voltage
 */
function isValidCellVoltage(v) {
    return Number.isFinite(v) && 
           v >= CONFIG.VALID_RANGES.CELL_VOLTAGE.min && 
           v <= CONFIG.VALID_RANGES.CELL_VOLTAGE.max;
}

/**
 * Validate cell temperature
 */
function isValidCellTemp(t) {
    return Number.isFinite(t) && 
           t >= CONFIG.VALID_RANGES.CELL_TEMP.min && 
           t <= CONFIG.VALID_RANGES.CELL_TEMP.max;
}

/**
 * Check for alert conditions
 */
function checkAlerts(data) {
    const alerts = [];
    const { voltageLow, voltageHigh, currentMax, socLow } = STATE.thresholds;

    // Check voltage thresholds
    if (data.some(d => Number.isFinite(d.voltage) && d.voltage < voltageLow)) {
        alerts.push(`⚠️ Low Voltage Alert: Below ${voltageLow}V`);
    }

    if (data.some(d => Number.isFinite(d.voltage) && d.voltage > voltageHigh)) {
        alerts.push(`⚠️ High Voltage Alert: Above ${voltageHigh}V`);
    }

    // Check current threshold
    if (data.some(d => Number.isFinite(d.current) && Math.abs(d.current) > currentMax)) {
        alerts.push(`⚠️ High Current Alert: Exceeds ${currentMax}A`);
    }

    // Check SOC threshold
    if (data.some(d => Number.isFinite(d.soc) && d.soc < socLow)) {
        alerts.push(`⚠️ Low SOC Alert: Below ${socLow}%`);
    }

    // Check cell-level conditions
    const cellStats = calculateCellStats(data);
    if (cellStats) {
        if (cellStats.cellImbalance > CONFIG.THRESHOLDS.CELL_IMBALANCE.max) {
            alerts.push(
                `⚠️ Cell Imbalance: ${cellStats.cellImbalance.toFixed(3)}V ` +
                `(Max: ${CONFIG.THRESHOLDS.CELL_IMBALANCE.max}V)`
            );
        }

        if (cellStats.maxCellTemp > CONFIG.THRESHOLDS.CELL_TEMP.max) {
            alerts.push(
                `🌡️ High Cell Temperature: ${cellStats.maxCellTemp.toFixed(1)}°C ` +
                `(Max: ${CONFIG.THRESHOLDS.CELL_TEMP.max}°C)`
            );
        }
    }

    // Update UI
    const alertSection = document.getElementById('alertsSection');
    if (!alertSection) return;

    if (alerts.length > 0) {
        alertSection.style.display = 'block';
        alertSection.innerHTML = `
            <div class="alert-title">⚠️ System Alerts (${alerts.length})</div>
            ${alerts.map(a => `<div class="alert-item">${a}</div>`).join('')}
        `;
        alertSection.classList.add('pulse');
    } else {
        alertSection.style.display = 'none';
        alertSection.classList.remove('pulse');
    }
}

/**
 * Display summary statistics
 */
function displayStats(data) {
    if (!Array.isArray(data) || !data.length) return;

    // Extract valid values
    const voltages = data.map(d => d.voltage).filter(Number.isFinite);
    const currents = data.map(d => d.current).filter(Number.isFinite);
    const socs = data.map(d => d.soc).filter(Number.isFinite);
    const powers = data.map(d => d.power).filter(Number.isFinite);

    if (!voltages.length) {
        console.warn('No valid voltage data for statistics');
        return;
    }

    // Calculate statistics
    const avgV = voltages.reduce((a, b) => a + b, 0) / voltages.length;
    const minV = Math.min(...voltages);
    const maxV = Math.max(...voltages);
    
    const avgI = currents.length 
        ? currents.reduce((a, b) => a + b, 0) / currents.length 
        : 0;
    const maxI = currents.length ? Math.max(...currents.map(Math.abs)) : 0;
    
    const avgSOC = socs.length 
        ? socs.reduce((a, b) => a + b, 0) / socs.length 
        : 0;
    
    const avgP = powers.length 
        ? powers.reduce((a, b) => a + b, 0) / powers.length 
        : 0;
    const maxP = powers.length ? Math.max(...powers.map(Math.abs)) : 0;

    // Calculate duration
    const duration = data[data.length - 1].relativeTime;
    const durationStr = duration < 3600 
        ? `${(duration / 60).toFixed(1)} min`
        : `${(duration / 3600).toFixed(2)} hrs`;

    // Render stats
    const statsSection = document.getElementById('statsSection');
    if (!statsSection) return;

    statsSection.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Records</div>
            <div class="stat-value">${data.length.toLocaleString()}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Duration</div>
            <div class="stat-value">${durationStr}</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Voltage</div>
            <div class="stat-value">${avgV.toFixed(2)} V</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Voltage Range</div>
            <div class="stat-value">${minV.toFixed(2)} – ${maxV.toFixed(2)} V</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Current</div>
            <div class="stat-value">${avgI.toFixed(2)} A</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Max Current</div>
            <div class="stat-value">${maxI.toFixed(2)} A</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg SOC</div>
            <div class="stat-value">${avgSOC.toFixed(1)}%</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Avg Power</div>
            <div class="stat-value">${avgP.toFixed(1)} W</div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Net Energy</div>
            <div class="stat-value energy">${STATE.energyData.netKWh.toFixed(3)} kWh</div>
        </div>
    `;
}
/* ============================================================
 * Runtime + Cost (ADD ONLY)
 * ============================================================
 */

function calculateRuntimeAndCost(data) {
    if (!Array.isArray(data) || data.length < 2) return;

    let totalSeconds = 0;
    let energyWh = 0;

    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];

        if (!Number.isFinite(prev.relativeTime) ||
            !Number.isFinite(curr.relativeTime)) continue;

        const dt = curr.relativeTime - prev.relativeTime;
        if (dt <= 0) continue;

        totalSeconds += dt;

        let power = curr.power;
        if (!Number.isFinite(power) &&
            Number.isFinite(curr.voltage) &&
            Number.isFinite(curr.current)) {
            power = curr.voltage * curr.current;
        }

        if (Number.isFinite(power)) {
            energyWh += power * dt / 3600;
        }
    }

    STATE.runtimeData.seconds = totalSeconds;
    STATE.runtimeData.minutes = totalSeconds / 60;
    STATE.runtimeData.hours = totalSeconds / 3600;

    STATE.runtimeData.energyWh = energyWh;
    STATE.runtimeData.energyKWh = energyWh / 1000;
    STATE.runtimeData.hourlyBreakdown = calculateHourlyCostBreakdown(data);


    calculateCost();
}

function calculateCost() {
    const rd = STATE.runtimeData;
    rd.totalCost = Math.abs(rd.energyKWh) * rd.unitPrice;
    rd.costPerHour = rd.hours > 0 ? rd.totalCost / rd.hours : 0;
}

function updateUnitPrice(price) {
    const v = Number(price);
    if (!Number.isFinite(v) || v < 0) return;

    STATE.runtimeData.unitPrice = v;
    calculateCost();
    displayRuntimeAndCost();
}

function displayRuntimeAndCost() {
    const panel = document.getElementById('runtimeCostSummary');
    if (!panel) return;

    const r = STATE.runtimeData;
    panel.style.display = 'block';
    panel.innerHTML = `
        <div class="stat-card">
            <div class="stat-label">Runtime</div>
            <div class="stat-value">
                ${r.seconds.toFixed(0)} s<br>
                ${r.minutes.toFixed(2)} min<br>
                ${r.hours.toFixed(3)} h
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Energy</div>
            <div class="stat-value">
                ${r.energyWh.toFixed(2)} Wh<br>
                ${r.energyKWh.toFixed(4)} kWh
            </div>
        </div>
        <div class="stat-card">
            <div class="stat-label">Cost</div>
            <div class="stat-value">
                ${r.totalCost.toFixed(2)}<br>
                ${r.costPerHour.toFixed(2)} / hour
            </div>
        </div>
    `;
}
// Ensure functions are globally accessible
window.displayStats = displayStats;
window.calculateEnergyConsumption = calculateEnergyConsumption;
window.displayEnergySummary = displayEnergySummary;
window.smoothData = smoothData;
window.checkAlerts = checkAlerts;


console.info('Calculations module loaded');

/* ============================================================
 * Per-Hour Cost Breakdown (ADD ONLY)
 * ============================================================
 */

function calculateHourlyCostBreakdown(data) {
    if (!Array.isArray(data) || data.length < 2) return [];

    const hourly = {}; // hourIndex -> energyWh

    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];

        if (!Number.isFinite(prev.relativeTime) ||
            !Number.isFinite(curr.relativeTime)) continue;

        const dt = curr.relativeTime - prev.relativeTime;
        if (dt <= 0) continue;

        let power = curr.power;
        if (!Number.isFinite(power) &&
            Number.isFinite(curr.voltage) &&
            Number.isFinite(curr.current)) {
            power = curr.voltage * curr.current;
        }

        if (!Number.isFinite(power)) continue;

        const hourIndex = Math.floor(prev.relativeTime / 3600);
        const energyWh = power * dt / 3600;

        hourly[hourIndex] = (hourly[hourIndex] || 0) + energyWh;
    }

    // Convert to cost using unit price
    const unitPrice = STATE.runtimeData.unitPrice || 0;

    return Object.entries(hourly).map(([hour, wh]) => ({
        hour: Number(hour),
        energyWh: wh,
        energyKWh: wh / 1000,
        cost: Math.abs(wh / 1000) * unitPrice
    }));
}
window.calculateHourlyCostBreakdown = calculateHourlyCostBreakdown;
/* ============================================================
 * Tariff Presets (ADD ONLY)
 * ============================================================
 */

function setTariff(price) {
    updateUnitPrice(price);

    if (typeof createHourlyCostChart === 'function') {
        createHourlyCostChart();
    }


    const tariffPanel = document.getElementById('tariffPresets');
    if (tariffPanel) tariffPanel.style.display = 'block';
}
window.setTariff = setTariff;

