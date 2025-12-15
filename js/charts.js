// js/charts.js

function resetZoom(chartName) {
    if (charts[chartName]) {
        charts[chartName].resetZoom();
    }
}

function downloadChart(chartName) {
    if (charts[chartName]) {
        const link = document.createElement('a');
        link.download = `bms_${chartName}_chart.png`;
        link.href = charts[chartName].toBase64Image();
        link.click();
    }
}

function createCharts(data) {
    // Destroy old charts
    Object.values(charts).forEach(chart => chart.destroy());
    charts = {};

    const timeValues =
        timeMode === 'relative'
            ? data.map(d => d.relativeTime || 0)
            : data.map(d => d.timestamp || d.sec || 0);

    const timeLabel =
        timeMode === 'relative'
            ? 'Time (seconds since start)'
            : 'ROS2 Timestamp (seconds)';

    const commonOptions = {
        responsive: true,
        maintainAspectRatio: false,
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        elements: {
            line: {
                tension: smoothingEnabled ? 0.4 : 0
            },
            point: {
                radius: 0,
                hoverRadius: 3
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeOutQuart'
        },
        plugins: {
            legend: { display: false },
            tooltip: {
                mode: 'index',
                intersect: false,
                callbacks: {
                    title: function (context) {
                        const value = context[0].parsed.x;
                        return timeMode === 'relative'
                            ? `Time: ${value.toFixed(1)}s`
                            : `Timestamp: ${value}`;
                    }
                }
            },
            zoom: {
                pan: {
                    enabled: true,
                    mode: 'x'
                },
                zoom: {
                    wheel: { enabled: true, speed: 0.1 },
                    pinch: { enabled: true },
                    mode: 'x'
                },
                limits: {
                    x: { min: 'original', max: 'original' }
                }
            }
        },
        scales: {
            x: {
                title: {
                    display: true,
                    text: timeLabel
                },
                ticks: {
                    maxTicksLimit: 15,
                    autoSkip: true
                }
            },
            y: {
                beginAtZero: false,
                title: {
                    display: true,
                    text: 'Value'
                }
            }
        }
    };

    // Voltage chart
    if (data.some(d => d.voltage !== undefined)) {
        charts.voltage = new Chart(
            document.getElementById('voltageChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [
                        {
                            label: 'Voltage (V)',
                            data: data.map(d => d.voltage),
                            borderColor: CONFIG.CHART.COLORS.voltage,
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Low Threshold',
                            data: data.map(() => thresholds.voltageLow),
                            borderColor: CONFIG.CHART.COLORS.threshold,
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: 'High Threshold',
                            data: data.map(() => thresholds.voltageHigh),
                            borderColor: CONFIG.CHART.COLORS.warning,
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: commonOptions
            }
        );
    }

    // Current chart
    if (data.some(d => d.current !== undefined)) {
        charts.current = new Chart(
            document.getElementById('currentChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [
                        {
                            label: 'Current (A)',
                            data: data.map(d => d.current),
                            borderColor: CONFIG.CHART.COLORS.current,
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Max Threshold',
                            data: data.map(() => thresholds.currentMax),
                            borderColor: CONFIG.CHART.COLORS.threshold,
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        },
                        {
                            label: 'Min Threshold',
                            data: data.map(() => -thresholds.currentMax),
                            borderColor: CONFIG.CHART.COLORS.threshold,
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: commonOptions
            }
        );
    }

    // SOC chart
    if (data.some(d => d.soc !== undefined)) {
        charts.soc = new Chart(
            document.getElementById('socChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [
                        {
                            label: 'SOC (%)',
                            data: data.map(d => d.soc),
                            borderColor: CONFIG.CHART.COLORS.soc,
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            borderWidth: 2,
                            fill: true
                        },
                        {
                            label: 'Low SOC Threshold',
                            data: data.map(() => thresholds.socLow),
                            borderColor: CONFIG.CHART.COLORS.threshold,
                            borderWidth: 1,
                            borderDash: [5, 5],
                            pointRadius: 0,
                            fill: false
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            min: 0,
                            max: 100
                        }
                    }
                }
            }
        );
    }

    

    // Power chart
    if (data.some(d => d.power !== undefined)) {
        charts.power = new Chart(
            document.getElementById('powerChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [
                        {
                            label: 'Power (W)',
                            data: data.map(d => d.power),
                            borderColor: CONFIG.CHART.COLORS.power,
                            backgroundColor: 'rgba(245, 158, 11, 0.1)',
                            borderWidth: 2,
                            fill: true
                        }
                    ]
                },
                options: commonOptions
            }
        );
    }


    
    // Energy chart
    if (data.some(d => d.cumulativeEnergyKWh !== undefined)) {
        charts.energy = new Chart(
            document.getElementById('energyChart'),
            {
                type: 'line',
                data: {
                    labels: timeValues,
                    datasets: [
                        {
                            label: 'Cumulative Energy (kWh)',
                            data: data.map(d => d.cumulativeEnergyKWh || 0),
                            borderColor: CONFIG.CHART.COLORS.energy,
                            backgroundColor: 'rgba(139, 92, 246, 0.1)',
                            borderWidth: 2,
                            fill: true
                        }
                    ]
                },
                options: {
                    ...commonOptions,
                    scales: {
                        ...commonOptions.scales,
                        y: {
                            ...commonOptions.scales.y,
                            title: {
                                display: true,
                                text: 'Energy (kWh)'
                            }
                        }
                    }
                }
            }
        );
    }
}
function createCellCharts(data) {
    // Only create if we have cell data
    const hasCellData = data.some(d => d.cell_voltages || d.cell_temperatures);
    if (!hasCellData) return;
    
    const timeValues = timeMode === 'relative' 
        ? data.map(d => d.relativeTime || 0)
        : data.map(d => d.timestamp || d.sec || 0);
    
    // 1. Cell Voltage Distribution Chart (for last data point)
    const lastEntry = data[data.length - 1];
    if (lastEntry.cell_voltages) {
        const validVoltages = lastEntry.cell_voltages.filter(v => v > 0);
        charts.cellVoltage = new Chart(document.getElementById('cellVoltageChart'), {
            type: 'bar',
            data: {
                labels: validVoltages.map((_, i) => `Cell ${i + 1}`),
                datasets: [{
                    label: 'Cell Voltage (V)',
                    data: validVoltages,
                    backgroundColor: validVoltages.map(v => 
                        v < 3.2 ? 'rgba(239, 68, 68, 0.7)' : 
                        v > 3.5 ? 'rgba(245, 158, 11, 0.7)' : 
                        'rgba(16, 185, 129, 0.7)'
                    ),
                    borderColor: 'rgba(59, 130, 246, 0.8)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false },
                    tooltip: { callbacks: { label: ctx => `${ctx.raw.toFixed(3)} V` } }
                },
                scales: {
                    y: { 
                        title: { display: true, text: 'Voltage (V)' },
                        beginAtZero: false 
                    }
                }
            }
        });
    }
    
    // 2. Remaining Capacity Chart
    if (data.some(d => d.remaining_ah !== undefined)) {
        charts.remainingAh = new Chart(document.getElementById('remainingAhChart'), {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [{
                    label: 'Remaining Capacity (Ah)',
                    data: data.map(d => d.remaining_ah),
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
                    borderWidth: 2,
                    fill: true
                }]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: { 
                        ...commonOptions.scales.y,
                        title: { display: true, text: 'Capacity (Ah)' }
                    }
                }
            }
        });
    }
    
    // 3. FET Status Chart
    if (data.some(d => d.charge_fet !== undefined)) {
        charts.fetStatus = new Chart(document.getElementById('fetStatusChart'), {
            type: 'line',
            data: {
                labels: timeValues,
                datasets: [
                    {
                        label: 'Charge FET',
                        data: data.map(d => d.charge_fet),
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0
                    },
                    {
                        label: 'Discharge FET',
                        data: data.map(d => d.discharge_fet),
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderWidth: 2,
                        fill: false,
                        tension: 0
                    }
                ]
            },
            options: {
                ...commonOptions,
                scales: {
                    ...commonOptions.scales,
                    y: {
                        ...commonOptions.scales.y,
                        min: -0.1,
                        max: 1.1,
                        ticks: { 
                            stepSize: 1,
                            callback: value => value === 1 ? 'ON' : value === 0 ? 'OFF' : ''
                        }
                    }
                }
            }
        });
    }
}
