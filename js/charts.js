// charts.js - Enhanced with Better Cell Visualizations
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
    charts[chartName]?.resetZoom();
}

function downloadChart(chartName) {
    if (!charts[chartName]) return;
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
                    padding: 50,
                    font: { size: 16 }
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

    Object.values(charts).forEach(c => c.destroy());
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
}

// ==========================================
// CELL-LEVEL CHARTS - ENHANCED
// ==========================================
function createCellCharts(data) {
    if (!Array.isArray(data) || !data.length) return;

    const timeValues = getTimeValues(data);
    const timeLabel = getTimeLabel();
    const last = data[data.length - 1];

    // ---------- CELL VOLTAGE BAR (Latest Snapshot) ----------
    if (Array.isArray(last.cell_voltages) && last.cell_voltages.length > 0) {
        const cellCount = last.cell_voltages.length;
        
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

        // Update cell count display
        document.getElementById('cellCount').textContent = `${cellCount} cells detected`;
    }

    // ---------- PER-CELL VOLTAGE TRENDS (All 16 cells over time) ----------
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

        charts.cellVoltageTrend = new Chart(
            document.getElementById('cellVoltageTrendChart'),
            {
                type: 'line',
                data: { labels: timeValues, datasets },
                options: commonLineOptions(timeLabel, 'Cell Voltage (V)', {
                    plugins: {
                        legend: {
                            display: true,
                            position: 'right',
                            labels: {
                                color: 'rgba(255, 255, 255, 0.9)',
                                padding: 8,
                                font: { size: 10 },
                                boxWidth: 15
                            }
                        }
                    }
                })
            }
        );
    }

    // ---------- CELL TEMPERATURE TRENDS (All 5 sensors) ----------
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

        charts.cellTempTrend = new Chart(
            document.getElementById('cellTempTrendChart'),
            {
                type: 'line',
                data: { labels: timeValues, datasets },
                options: commonLineOptions(timeLabel, 'Temperature (°C)', {
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: {
                                color: 'rgba(0, 0, 0, 1)',
                                padding: 10,
                                font: { size: 11 }
                            }
                        }
                    }
                })
            }
        );
    }

    // ---------- CELL IMBALANCE HEATMAP ----------
    if (data.some(d => Array.isArray(d.cell_voltages))) {
        createCellImbalanceChart(data, timeValues, timeLabel);
    }

    // ---------- FET STATUS ----------
    if (data.some(d => d.charge_fet !== undefined)) {
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
}

// ---------- CELL IMBALANCE VISUALIZATION ----------
function createCellImbalanceChart(data, timeValues, timeLabel) {
    const imbalanceData = data.map(d => {
        if (!d.cell_voltages || d.cell_voltages.length === 0) return null;
        const valid = d.cell_voltages.filter(v => v !== null);
        if (valid.length === 0) return null;
        return Math.max(...valid) - Math.min(...valid);
    });

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
 * Hourly Cost Chart (ADD ONLY)
 * ============================================================
 */

function createHourlyCostChart() {
    const ctx = document.getElementById('hourlyCostChart');
    if (!ctx || !STATE.runtimeData?.hourlyBreakdown?.length) return;

    const data = STATE.runtimeData.hourlyBreakdown;

    const labels = data.map(d => `Hour ${d.hour}`);
    const costs = data.map(d => d.cost);

    if (charts.hourlyCost) {
        charts.hourlyCost.destroy();
    }

    charts.hourlyCost = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Cost per Hour',
                data: costs
            }]
        },
        options: {
            ...commonOptions,
            scales: {
                x: {
                    title: { display: true, text: 'Hour' }
                },
                y: {
                    title: { display: true, text: 'Cost' },
                    beginAtZero: true
                }
            }
        }
    });
}
window.createHourlyCostChart = createHourlyCostChart;
