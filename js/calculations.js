// js/calculations.js

function calculateEnergyConsumption(data) {
    if (data.length < 2) return;

    let totalEnergyWh = 0;
    let chargedEnergyWh = 0;
    let dischargedEnergyWh = 0;

    // Initialize first point
    if (data[0]) {
        data[0].cumulativeEnergyWh = 0;
        data[0].cumulativeEnergyKWh = 0;
    }

    for (let i = 1; i < data.length; i++) {
        const prev = data[i - 1];
        const curr = data[i];
        
        // Skip if essential data is missing
        if (!prev.current || !curr.current || !prev.voltage || !curr.voltage) {
            curr.cumulativeEnergyWh = prev.cumulativeEnergyWh || 0;
            curr.cumulativeEnergyKWh = (prev.cumulativeEnergyWh || 0) / 1000;
            continue;
        }
        
        // Time difference in hours
        const timeDiffSeconds = curr.relativeTime - prev.relativeTime;
        const timeDiffHours = timeDiffSeconds / 3600;
        
        // Average values for this interval
        const avgCurrent = (prev.current + curr.current) / 2;
        const avgVoltage = (prev.voltage + curr.voltage) / 2;
        
        // Calculate energy for this interval
        // Energy (Wh) = Power (W) × Time (h) = Voltage × Current × Time
        const intervalEnergyWh = avgVoltage * avgCurrent * timeDiffHours;
        
        // Add to total (net energy change)
        totalEnergyWh += intervalEnergyWh;

        // FIXED: Classify based on correct sign convention
        // Positive current = CHARGING (energy flowing INTO battery)
        // Negative current = DISCHARGING (energy flowing OUT OF battery)
        if (avgCurrent > 0) {
            // Positive current = Charging
            chargedEnergyWh += intervalEnergyWh;
        } else if (avgCurrent < 0) {
            // Negative current = Discharging
            // intervalEnergyWh will be negative, so we use absolute value
            dischargedEnergyWh += Math.abs(intervalEnergyWh);
        }
        // If avgCurrent is exactly 0, we don't count it as either

        // Store cumulative energy
        curr.cumulativeEnergyWh = totalEnergyWh;
        curr.cumulativeEnergyKWh = totalEnergyWh / 1000;
    }

    // Store in global energyData object
    energyData = {
        totalKWh: totalEnergyWh / 1000,
        netKWh: totalEnergyWh / 1000,
        chargedKWh: chargedEnergyWh / 1000,
        dischargedKWh: dischargedEnergyWh / 1000,
        efficiency:
            chargedEnergyWh > 0
                ? (dischargedEnergyWh / chargedEnergyWh) * 100
                : (dischargedEnergyWh > 0 ? 0 : 100)
    };

    // Debug logging
    console.log('Energy Calculation Summary (FIXED SIGN CONVENTION):');
    console.log('- Total samples:', data.length);
    console.log('- Sign Convention: Positive current = CHARGING, Negative current = DISCHARGING');
    console.log('- Charged Energy:', chargedEnergyWh.toFixed(2), 'Wh');
    console.log('- Discharged Energy:', dischargedEnergyWh.toFixed(2), 'Wh');
    console.log('- Net Energy:', totalEnergyWh.toFixed(2), 'Wh');
    
    // Sample some current values for debugging
    const sampleCurrents = data.slice(0, Math.min(10, data.length)).map(d => d.current);
    console.log('- Sample currents (first 10):', sampleCurrents);
}

function displayEnergySummary() {
    const energyGrid = document.getElementById('energyGrid');
    
    // Determine if net charge or discharge
    const netLabel = energyData.netKWh >= 0 ? 'Net Charged' : 'Net Discharged';
    
    energyGrid.innerHTML = `
        <div class="energy-item">
            <div class="energy-label">Net Energy (${netLabel})</div>
            <div class="energy-value">${Math.abs(energyData.netKWh).toFixed(3)} kWh</div>
        </div>
        <div class="energy-item">
            <div class="energy-label">Energy Discharged</div>
            <div class="energy-value">${energyData.dischargedKWh.toFixed(3)} kWh</div>
        </div>
        <div class="energy-item">
            <div class="energy-label">Energy Charged</div>
            <div class="energy-value">${energyData.chargedKWh.toFixed(3)} kWh</div>
        </div>
        <div class="energy-item">
            <div class="energy-label">Round-trip Efficiency</div>
            <div class="energy-value">${energyData.efficiency.toFixed(1)}%</div>
        </div>
    `;
}

function smoothData(data, windowSize = 5) {
    if (!smoothingEnabled || windowSize < 2 || data.length < windowSize)
        return data;

    const smoothed = JSON.parse(JSON.stringify(data));
    const fields = ['voltage', 'current', 'power', 'soc'];

    fields.forEach(field => {
        for (let i = 0; i < data.length; i++) {
            let sum = 0;
            let count = 0;

            for (
                let j = Math.max(0, i - Math.floor(windowSize / 2));
                j <= Math.min(
                    data.length - 1,
                    i + Math.floor(windowSize / 2)
                );
                j++
            ) {
                if (
                    data[j][field] !== undefined &&
                    !isNaN(data[j][field])
                ) {
                    sum += data[j][field];
                    count++;
                }
            }

            if (count > 0) {
                smoothed[i][field] = sum / count;
            }
        }
    });

    return smoothed;
}

function calculateCellStats(data) {
    if (!data.length || !data[0].cell_voltages) return null;
    
    const stats = {
        minCellVoltage: Infinity,
        maxCellVoltage: -Infinity,
        avgCellVoltage: 0,
        cellImbalance: 0,
        minCellTemp: Infinity,
        maxCellTemp: -Infinity,
        avgCellTemp: 0
    };
    
    data.forEach(entry => {
        if (entry.cell_voltages) {
            const voltages = entry.cell_voltages.filter(v => v > 0 && v < 5); // Filter out 0 and invalid values
            if (voltages.length) {
                const minV = Math.min(...voltages);
                const maxV = Math.max(...voltages);
                const avgV = voltages.reduce((a, b) => a + b, 0) / voltages.length;
                
                stats.minCellVoltage = Math.min(stats.minCellVoltage, minV);
                stats.maxCellVoltage = Math.max(stats.maxCellVoltage, maxV);
                stats.avgCellVoltage = avgV; // Just track the average for the whole dataset
                stats.cellImbalance = Math.max(stats.cellImbalance, maxV - minV);
            }
        }
        
        if (entry.cell_temperatures) {
            const temps = entry.cell_temperatures.filter(t => t > -20 && t < 100); // Filter outliers
            if (temps.length) {
                const minT = Math.min(...temps);
                const maxT = Math.max(...temps);
                const avgT = temps.reduce((a, b) => a + b, 0) / temps.length;
                
                stats.minCellTemp = Math.min(stats.minCellTemp, minT);
                stats.maxCellTemp = Math.max(stats.maxCellTemp, maxT);
                stats.avgCellTemp = avgT;
            }
        }
    });
    
    // Handle Infinity values (no valid data)
    if (stats.minCellVoltage === Infinity) stats.minCellVoltage = 0;
    if (stats.maxCellVoltage === -Infinity) stats.maxCellVoltage = 0;
    if (stats.minCellTemp === Infinity) stats.minCellTemp = 0;
    if (stats.maxCellTemp === -Infinity) stats.maxCellTemp = 0;
    
    return stats;
}

function checkAlerts(data) {
    const alerts = [];

    const lowVoltagePoints = data.filter(
        d => d.voltage < thresholds.voltageLow
    );
    if (lowVoltagePoints.length > 0) {
        const minVoltage = Math.min(
            ...lowVoltagePoints.map(p => p.voltage)
        );
        alerts.push(
            `Low Voltage Alert: ${
                lowVoltagePoints.length
            } points below ${thresholds.voltageLow}V (min: ${minVoltage.toFixed(
                2
            )}V)`
        );
    }

    const highVoltagePoints = data.filter(
        d => d.voltage > thresholds.voltageHigh
    );
    if (highVoltagePoints.length > 0) {
        const maxVoltage = Math.max(
            ...highVoltagePoints.map(p => p.voltage)
        );
        alerts.push(
            `High Voltage Alert: ${
                highVoltagePoints.length
            } points above ${thresholds.voltageHigh}V (max: ${maxVoltage.toFixed(
                2
            )}V)`
        );
    }

    const highCurrentPoints = data.filter(
        d => Math.abs(d.current) > thresholds.currentMax
    );
    if (highCurrentPoints.length > 0) {
        const maxCurrent = Math.max(
            ...highCurrentPoints.map(p => Math.abs(p.current))
        );
        alerts.push(
            `High Current Alert: ${
                highCurrentPoints.length
            } points above ${thresholds.currentMax}A (max: ${maxCurrent.toFixed(
                2
            )}A)`
        );
    }

    const lowSocPoints = data.filter(d => d.soc < thresholds.socLow);
    if (lowSocPoints.length > 0) {
        const minSoc = Math.min(...lowSocPoints.map(p => p.soc));
        alerts.push(
            `Low SOC Alert: ${
                lowSocPoints.length
            } points below ${thresholds.socLow}% (min: ${minSoc.toFixed(
                1
            )}%)`
        );
    }

    // New: Cell voltage imbalance alert
    const cellStats = calculateCellStats(data);
    if (cellStats && cellStats.cellImbalance > 0.2) { // Alert if imbalance > 0.2V
        alerts.push(
            `High Cell Imbalance Alert: Maximum cell voltage difference is ${cellStats.cellImbalance.toFixed(3)}V (exceeds 0.2V threshold)`
        );
    }

    // New: Cell temperature alert
    if (cellStats && cellStats.maxCellTemp > 45) { // Alert if temperature > 45°C
        alerts.push(
            `High Cell Temperature Alert: Maximum cell temperature is ${cellStats.maxCellTemp.toFixed(1)}°C (exceeds 45°C threshold)`
        );
    }

    const alertsSection = document.getElementById('alertsSection');
    if (alerts.length > 0) {
        alertsSection.style.display = 'block';
        alertsSection.innerHTML = `
            <div class="alert-title">⚠️ System Alerts</div>
            ${alerts
                .map(alert => `<div class="alert-item">• ${alert}</div>`)
                .join('')}
        `;
        alertsSection.classList.add('pulse');
    } else {
        alertsSection.style.display = 'none';
        alertsSection.classList.remove('pulse');
    }
}

function displayStats(data) {
    const voltages = data
        .map(d => d.voltage)
        .filter(v => v !== undefined && !isNaN(v));
    const currents = data
        .map(d => d.current)
        .filter(v => v !== undefined && !isNaN(v));
    const socs = data
        .map(d => d.soc)
        .filter(v => v !== undefined && !isNaN(v));
    const powers = data
        .map(d => d.power)
        .filter(v => v !== undefined && !isNaN(v));
    const remainingAhs = data
        .map(d => d.remaining_ah)
        .filter(v => v !== undefined && !isNaN(v));

    if (voltages.length === 0) {
        showError('No valid voltage data found');
        return;
    }

    const avgVoltage =
        voltages.reduce((a, b) => a + b, 0) / voltages.length;
    const avgCurrent =
        currents.length > 0
            ? currents.reduce((a, b) => a + b, 0) / currents.length
            : 0;
    const minVoltage = Math.min(...voltages);
    const maxVoltage = Math.max(...voltages);

    const voltageStatus =
        minVoltage < thresholds.voltageLow
            ? 'danger'
            : maxVoltage > thresholds.voltageHigh
            ? 'warning'
            : 'good';

    const stats = [
        { label: 'Total Records', value: data.length },
        {
            label: 'Duration',
            value:
                (data[data.length - 1].relativeTime || 0).toFixed(1) +
                ' sec'
        },
        {
            label: 'Avg Voltage',
            value: avgVoltage.toFixed(2) + ' V',
            status: voltageStatus
        },
        {
            label: 'Voltage Range',
            value: `${minVoltage.toFixed(2)} - ${maxVoltage.toFixed(2)} V`
        },
        {
            label: 'Avg Current',
            value: avgCurrent.toFixed(2) + ' A'
        },
        {
            label: 'Max Current',
            value:
                currents.length > 0
                    ? Math.max(
                          ...currents.map(v => Math.abs(v))
                      ).toFixed(2) + ' A'
                    : 'N/A'
        },
        {
            label: 'Avg Power',
            value:
                powers.length > 0
                    ? (
                          powers.reduce((a, b) => a + b, 0) /
                          powers.length
                      ).toFixed(2) + ' W'
                    : 'N/A'
        },
        {
            label: 'Net Energy',
            value:
                energyData.netKWh.toFixed(3) + ' kWh',
            status: 'energy'
        },
        {
            label: 'Data Rate',
            value:
                data.length > 1
                    ? (
                          data.length /
                          (data[data.length - 1].relativeTime || 1)
                      ).toFixed(1) + ' Hz'
                    : 'N/A'
        }
    ];

    const statsHTML = stats
        .map(
            s => `
        <div class="stat-card">
            <div class="stat-label">${s.label}</div>
            <div class="stat-value ${s.status || ''}">${
                s.value
            }</div>
        </div>
    `
        )
        .join('');

    document.getElementById('statsSection').innerHTML = statsHTML;
    
    // Calculate and display cell statistics if cell data exists
    const cellStats = calculateCellStats(data);
    if (cellStats && cellStats.minCellVoltage > 0) {
        const cellStatsHTML = `
            <div class="stat-card">
                <div class="stat-label">Min Cell Voltage</div>
                <div class="stat-value">${cellStats.minCellVoltage.toFixed(3)} V</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Cell Voltage</div>
                <div class="stat-value">${cellStats.maxCellVoltage.toFixed(3)} V</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Cell Voltage</div>
                <div class="stat-value">${cellStats.avgCellVoltage.toFixed(3)} V</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Cell Imbalance</div>
                <div class="stat-value">${cellStats.cellImbalance.toFixed(3)} V</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Min Cell Temp</div>
                <div class="stat-value">${cellStats.minCellTemp.toFixed(1)}°C</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Cell Temp</div>
                <div class="stat-value">${cellStats.maxCellTemp.toFixed(1)}°C</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Cell Temp</div>
                <div class="stat-value">${cellStats.avgCellTemp.toFixed(1)}°C</div>
            </div>
        `;
        
        // Append to existing stats
        document.getElementById('statsSection').innerHTML += cellStatsHTML;
    }
    
    // Add remaining capacity stats if available
    if (remainingAhs.length > 0) {
        const minRemainingAh = Math.min(...remainingAhs);
        const maxRemainingAh = Math.max(...remainingAhs);
        const avgRemainingAh = remainingAhs.reduce((a, b) => a + b, 0) / remainingAhs.length;
        const capacityChange = maxRemainingAh - minRemainingAh;
        
        const capacityStatsHTML = `
            <div class="stat-card">
                <div class="stat-label">Min Capacity</div>
                <div class="stat-value">${minRemainingAh.toFixed(2)} Ah</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Max Capacity</div>
                <div class="stat-value">${maxRemainingAh.toFixed(2)} Ah</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Avg Capacity</div>
                <div class="stat-value">${avgRemainingAh.toFixed(2)} Ah</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Capacity Change</div>
                <div class="stat-value">${capacityChange.toFixed(2)} Ah</div>
            </div>
        `;
        
        document.getElementById('statsSection').innerHTML += capacityStatsHTML;
    }
}
