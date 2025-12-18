// charts.js - Fixed Zoom & Hourly Cost Chart
// ==========================================

if (window.Chart && window.ChartZoom) {
    Chart.register(ChartZoom);
}

// Cell voltage colors - distinct colors for 16 cells
const CELL_COLORS = [
    '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b',
    '#ef4444', '#06b6d4', '#ec4899', '#84cc16',
    '#6366f1', '#f97316', '#14b8a6', '#a855f7',
    '#22c55e', '#eab308', '#0ea5e9', '#f43f5e'
];

// Temperature colors - 5 sensors
const TEMP_COLORS = [
    '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#10b981'
];

function resetZoom(chartName) {
    if (charts[chartName]) {
        charts[chartName].resetZoom();
        console.info(`Reset zoom for ${chartName}`);
    } else {
        console.warn(`Chart ${chartName} not found`);
    }
}

function downloadChart(chartName) {
    if (!charts[chartName]) {
        console.warn(`Chart ${chartName} not found`);
        return;
    }
    const a = document.createElement('a');
    a.download = `bms_${chartName}.png`;
    a.href = charts[chartName].toBase64Image();
    a.click();
}

function getTimeValues(data) {
    return timeMode === 'relative'
        ? data.map(d => d.relativeTime ?? 0)
        : data.map(d => d.timestamp ?? 0);
}

function getTimeLabel() {
    return timeMode === 'relative'
        ? 'Time (seconds since start)'
        : 'Timestamp (sec)';
}

function commonLineOptions(timeLabel, yLabel, customOptions = {}) {
    return {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'index',
            intersect: false
        },
        elements: {
            line: {
                tension: smoothingEnabled ? 0.35 : 0
            },
            point: {
                radius: 0
            }
        },
        plugins: {
            legend: { 
                display: true,
                labels: {
                    color: 'rgba(0, 0, 0, 0.9)',
                    padding: 10,
                    font: { size: 12 }
                }
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(15, 23, 42, 0.95)',
                titleColor: '#fff',
                bodyColor: '#fff',
                borderColor: 'rgba(59, 130, 246, 0.5)',
                borderWidth: 1
            },
            zoom: {
                pan: {
                    enabled: true,
                    modifierKey: 'ctrl',
                    mode: 'x'
                },
                zoom: {
                    wheel: { enabled: true },
                    pinch: { enabled: true },
                    mode: 'x'
                }
            }
        },
        scales: {
            x: {
                title: { display: true, text: timeLabel, color: '#000000ff' },
                ticks: { maxTicksLimit: 15, color: 'rgba(0, 0, 0, 1)' },
                grid: { color: 'rgba(0, 0, 0, 0.32)' }
            },
            y: {
                title: { display: true, text: yLabel, color: '#050505ff' },
                beginAtZero: false,
                ticks: { color: 'rgba(0, 0, 0, 1)' },
                grid: { color: 'rgba(0, 0, 0, 0.32)' }
            }
        },
        ...customOptions
    };
}

// ==========================================
// MAIN SYSTEM CHARTS
// ==========================================
function createCharts(data) {
    if (!Array.isArray(data) || !data.length) return;

    // Destroy existing charts
    Object.keys(charts).forEach(key => {
        if (charts[key] && typeof charts[key].destroy === 'function') {
            charts[key].destroy();
        }
    });
    charts = {};

    const timeValues = getTimeValues(data);
    const timeLabel = getTimeLabel();

    // Voltage Chart
    charts.voltage = new Chart(
        document.getElementById('voltageChart'),
        {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [
                    {
                        label: 'Voltage (V)',
                        data: data.map(d => d.voltage ?? null),
                        borderColor: CONFIG.CHART.COLORS.voltage,
                        backgroundColor: 'rgba(59,130,246,0.15)',
                        fill: true
                    },
                    {
                        label: 'Low Threshold',
                        data: data.map(() => thresholds.voltageLow),
                        borderDash: [5, 5],
                        borderColor: CONFIG.CHART.COLORS.threshold,
                        pointRadius: 0
                    },
                    {
                        label: 'High Threshold',
                        data: data.map(() => thresholds.voltageHigh),
                        borderDash: [5, 5],
                        borderColor: CONFIG.CHART.COLORS.warning,
                        pointRadius: 0
                    }
                ]
            },
            options: commonLineOptions(timeLabel, 'Voltage (V)')
        }
    );

    // Current Chart
    charts.current = new Chart(
        document.getElementById('currentChart'),
        {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [{
                    label: 'Current (A)',
                    data: data.map(d => d.current ?? null),
                    borderColor: CONFIG.CHART.COLORS.current,
                    backgroundColor: 'rgba(139,92,246,0.15)',
                    fill: true
                }]
            },
            options: commonLineOptions(timeLabel, 'Current (A)')
        }
    );

    // SOC Chart
    charts.soc = new Chart(
        document.getElementById('socChart'),
        {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [{
                    label: 'SOC (%)',
                    data: data.map(d => d.soc ?? null),
                    borderColor: CONFIG.CHART.COLORS.soc,
                    backgroundColor: 'rgba(16,185,129,0.15)',
                    fill: true
                }]
            },
            options: commonLineOptions(timeLabel, 'SOC (%)', {
                scales: {
                    x: { 
                        title: { display: true, text: timeLabel, color: '#000000ff' },
                        ticks: { color: 'rgba(0, 0, 0, 1)' },
                        grid: { color: 'rgba(0, 0, 0, 0.32)' }
                    },
                    y: { 
                        min: 0, 
                        max: 100,
                        ticks: { color: 'rgba(0, 0, 0, 1)' },
                        grid: { color: 'rgba(0, 0, 0, 0.32)' }
                    }
                }
            })
        }
    );

    // Power Chart
    charts.power = new Chart(
        document.getElementById('powerChart'),
        {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [{
                    label: 'Power (W)',
                    data: data.map(d => d.power ?? null),
                    borderColor: CONFIG.CHART.COLORS.power,
                    backgroundColor: 'rgba(245,158,11,0.15)',
                    fill: true
                }]
            },
            options: commonLineOptions(timeLabel, 'Power (W)')
        }
    );

    // Energy Chart
    charts.energy = new Chart(
        document.getElementById('energyChart'),
        {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [{
                    label: 'Cumulative Energy (kWh)',
                    data: data.map(d => d.cumulativeEnergyKWh ?? null),
                    borderColor: CONFIG.CHART.COLORS.energy,
                    backgroundColor: 'rgba(139,92,246,0.15)',
                    fill: true
                }]
            },
            options: commonLineOptions(timeLabel, 'Energy (kWh)')
        }
    );

    // Remaining Capacity Chart (Ah)
    if (data.some(d => typeof d.remaining_ah === 'number')) {
        charts.remainingAh = new Chart(
            document.getElementById('remainingAhChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [{
                        label: 'Remaining Capacity (Ah)',
                        data: data.map(d => d.remaining_ah ?? null),
                        borderColor: '#8b5cf6',
                        backgroundColor: 'rgba(139, 92, 246, 0.15)',
                        fill: true
                    }]
                },
                options: commonLineOptions(timeLabel, 'Capacity (Ah)')
            }
        );
    }

    console.info('Main charts created successfully');
}

// ==========================================
// CELL-LEVEL CHARTS - FIXED ZOOM
// ==========================================
function createCellCharts(data) {
    if (!Array.isArray(data) || !data.length) return;

    const timeValues = getTimeValues(data);
    const timeLabel = getTimeLabel();
    const last = data[data.length - 1];

    // ---------- CELL VOLTAGE BAR (Latest Snapshot) ----------
    if (Array.isArray(last.cell_voltages) && last.cell_voltages.length > 0) {
        const cellCount = last.cell_voltages.length;
        
        if (charts.cellVoltage) charts.cellVoltage.destroy();
        charts.cellVoltage = new Chart(
            document.getElementById('cellVoltageChart'),
            {
                type: 'bar',
                data: {
                    labels: last.cell_voltages.map((_, i) => `Cell ${i + 1}`),
                    datasets: [{
                        label: 'Cell Voltage (V)',
                        data: last.cell_voltages,
                        backgroundColor: CELL_COLORS.slice(0, cellCount),
                        borderColor: CELL_COLORS.slice(0, cellCount),
                        borderWidth: 1
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            backgroundColor: 'rgba(15, 23, 42, 0.95)',
                            callbacks: {
                                label: (ctx) => `${ctx.parsed.y.toFixed(4)} V`
                            }
                        }
                    },
                    scales: {
                        x: {
                            ticks: { color: 'rgba(0, 0, 0, 0.7)' },
                            grid: { display: false }
                        },
                        y: {
                            title: { display: true, text: 'Voltage (V)', color: '#000' },
                            ticks: { color: 'rgba(0, 0, 0, 0.7)' },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        }
                    }
                }
            }
        );

        document.getElementById('cellCount').textContent = `${cellCount} cells detected`;
    }

    // ---------- PER-CELL VOLTAGE TRENDS - FIXED ZOOM ----------
    if (data.some(d => Array.isArray(d.cell_voltages))) {
        const maxCells = Math.max(...data.filter(d => d.cell_voltages).map(d => d.cell_voltages.length));
        const datasets = [];
        
        for (let i = 0; i < maxCells; i++) {
            datasets.push({
                label: `Cell ${i + 1}`,
                data: data.map(d => d.cell_voltages?.[i] ?? null),
                borderColor: CELL_COLORS[i],
                backgroundColor: CELL_COLORS[i] + '20',
                pointRadius: 0,
                borderWidth: 2
            });
        }

        if (charts.cellVoltageTrend) charts.cellVoltageTrend.destroy();
        charts.cellVoltageTrend = new Chart(
            document.getElementById('cellVoltageTrendChart'),
            {
                type: 'line',
                data: { labels: timeValues, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    elements: {
                        line: { tension: smoothingEnabled ? 0.35 : 0 },
                        point: { radius: 0 }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: 'rgba(0, 0, 0, 0.9)',
                                padding: 8,
                                font: { size: 10 },
                                boxWidth: 15
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(15, 23, 42, 0.95)'
                        },
                        zoom: {
                            pan: {
                                enabled: true,
                                modifierKey: 'ctrl',
                                mode: 'x'
                            },
                            zoom: {
                                wheel: { enabled: true },
                                pinch: { enabled: true },
                                mode: 'x'
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: timeLabel, color: '#000' },
                            ticks: { maxTicksLimit: 15, color: 'rgba(0, 0, 0, 0.9)' },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        },
                        y: {
                            title: { display: true, text: 'Voltage (V)', color: '#000' },
                            ticks: { color: 'rgba(0, 0, 0, 0.9)' },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        }
                    }
                }
            }
        );
    }

    // ---------- CELL TEMPERATURE TRENDS - FIXED ZOOM ----------
    if (data.some(d => Array.isArray(d.cell_temperatures))) {
        const maxTemps = Math.max(...data.filter(d => d.cell_temperatures).map(d => d.cell_temperatures.length));
        const datasets = [];
        
        for (let i = 0; i < maxTemps; i++) {
            datasets.push({
                label: `Temp Sensor ${i + 1}`,
                data: data.map(d => d.cell_temperatures?.[i] ?? null),
                borderColor: TEMP_COLORS[i],
                backgroundColor: TEMP_COLORS[i] + '20',
                pointRadius: 0,
                borderWidth: 2
            });
        }

        if (charts.cellTempTrend) charts.cellTempTrend.destroy();
        charts.cellTempTrend = new Chart(
            document.getElementById('cellTempTrendChart'),
            {
                type: 'line',
                data: { labels: timeValues, datasets },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    interaction: {
                        mode: 'index',
                        intersect: false
                    },
                    elements: {
                        line: { tension: smoothingEnabled ? 0.35 : 0 },
                        point: { radius: 0 }
                    },
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: 'rgba(0, 0, 0, 1)',
                                padding: 10,
                                font: { size: 11 }
                            }
                        },
                        tooltip: {
                            mode: 'index',
                            intersect: false,
                            backgroundColor: 'rgba(15, 23, 42, 0.95)'
                        },
                        zoom: {
                            pan: {
                                enabled: true,
                                modifierKey: 'ctrl',
                                mode: 'x'
                            },
                            zoom: {
                                wheel: { enabled: true },
                                pinch: { enabled: true },
                                mode: 'x'
                            }
                        }
                    },
                    scales: {
                        x: {
                            title: { display: true, text: timeLabel, color: '#000' },
                            ticks: { maxTicksLimit: 15, color: 'rgba(0, 0, 0, 1)' },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        },
                        y: {
                            title: { display: true, text: 'Temperature (°C)', color: '#000' },
                            ticks: { color: 'rgba(0, 0, 0, 1)' },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        }
                    }
                }
            }
        );
    }

    // ---------- CELL IMBALANCE ----------
    if (data.some(d => Array.isArray(d.cell_voltages))) {
        createCellImbalanceChart(data, timeValues, timeLabel);
    }

    // ---------- FET STATUS ----------
    if (data.some(d => d.charge_fet !== undefined)) {
        if (charts.fetStatus) charts.fetStatus.destroy();
        charts.fetStatus = new Chart(
            document.getElementById('fetStatusChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [
                        {
                            label: 'Charge FET',
                            data: data.map(d => d.charge_fet ?? null),
                            stepped: true,
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.2)',
                            fill: true
                        },
                        {
                            label: 'Discharge FET',
                            data: data.map(d => d.discharge_fet ?? null),
                            stepped: true,
                            borderColor: '#3b82f6',
                            backgroundColor: 'rgba(59, 130, 246, 0.2)',
                            fill: true
                        }
                    ]
                },
                options: commonLineOptions(timeLabel, 'FET State', {
                    scales: {
                        x: { 
                            title: { display: true, text: timeLabel, color: '#000000ff' },
                            ticks: { color: 'rgba(0, 0, 0, 1)' },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        },
                        y: {
                            min: -0.1,
                            max: 1.1,
                            ticks: {
                                stepSize: 1,
                                callback: v => (v === 1 ? 'ON' : 'OFF'),
                                color: 'rgba(0, 0, 0, 1)'
                            },
                            grid: { color: 'rgba(0, 0, 0, 0.32)' }
                        }
                    }
                })
            }
        );
    }

    console.info('Cell charts created successfully with zoom enabled');
}

// ---------- CELL IMBALANCE VISUALIZATION ----------
function createCellImbalanceChart(data, timeValues, timeLabel) {
    const imbalanceData = data.map(d => {
        if (!d.cell_voltages || d.cell_voltages.length === 0) return null;
        const valid = d.cell_voltages.filter(v => v !== null);
        if (valid.length === 0) return null;
        return Math.max(...valid) - Math.min(...valid);
    });

    if (charts.cellImbalance) charts.cellImbalance.destroy();
    charts.cellImbalance = new Chart(
        document.getElementById('cellImbalanceChart'),
        {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [{
                    label: 'Cell Imbalance (V)',
                    data: imbalanceData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.15)',
                    fill: true,
                    borderWidth: 2
                }]
            },
            options: commonLineOptions(timeLabel, 'Imbalance (V)')
        }
    );
}

/* ============================================================
 * Hourly Cost Chart - FIXED
 * ============================================================
 */

function createHourlyCostChart() {
    const ctx = document.getElementById('hourlyCostChart');
    if (!ctx) {
        console.warn('Hourly cost chart canvas not found');
        return;
    }

    // Check if we have breakdown data
    if (!STATE.runtimeData?.hourlyBreakdown?.length) {
        console.warn('No hourly breakdown data available');
        
        // Show placeholder message
        if (charts.hourlyCost) charts.hourlyCost.destroy();
        
        charts.hourlyCost = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: ['No Data'],
                datasets: [{
                    label: 'Cost per Hour',
                    data: [0],
                    backgroundColor: 'rgba(59, 130, 246, 0.5)'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { display: false },
                    tooltip: { enabled: false }
                }
            }
        });
        return;
    }

    const data = STATE.runtimeData.hourlyBreakdown;
    const labels = data.map(d => `Hour ${d.hour}`);
    const costs = data.map(d => d.cost);
    const energies = data.map(d => d.energyKWh);

    if (charts.hourlyCost) {
        charts.hourlyCost.destroy();
    }

    charts.hourlyCost = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: `Cost (@ ${STATE.runtimeData.unitPrice}/kWh)`,
                data: costs,
                backgroundColor: 'rgba(245, 158, 11, 0.7)',
                borderColor: 'rgba(245, 158, 11, 1)',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { 
                    display: true,
                    labels: { color: 'rgba(0, 0, 0, 0.9)' }
                },
                tooltip: {
                    backgroundColor: 'rgba(15, 23, 42, 0.95)',
                    callbacks: {
                        afterLabel: (ctx) => {
                            const energy = energies[ctx.dataIndex];
                            return `Energy: ${energy.toFixed(4)} kWh`;
                        }
                    }
                },
                zoom: {
                    pan: {
                        enabled: true,
                        modifierKey: 'ctrl',
                        mode: 'x'
                    },
                    zoom: {
                        wheel: { enabled: true },
                        pinch: { enabled: true },
                        mode: 'x'
                    }
                }
            },
            scales: {
                x: {
                    title: { display: true, text: 'Hour', color: '#000' },
                    ticks: { color: 'rgba(0, 0, 0, 0.9)' },
                    grid: { display: false }
                },
                y: {
                    title: { display: true, text: `Cost (${STATE.runtimeData.unitPrice}/kWh)`, color: '#000' },
                    beginAtZero: true,
                    ticks: { color: 'rgba(0, 0, 0, 0.9)' },
                    grid: { color: 'rgba(0, 0, 0, 0.32)' }
                }
            }
        }
    });

    console.info(`Hourly cost chart created with ${data.length} hours`);
}

window.createHourlyCostChart = createHourlyCostChart;
window.resetZoom = resetZoom;
window.downloadChart = downloadChart;

console.info('Charts module loaded with zoom support');