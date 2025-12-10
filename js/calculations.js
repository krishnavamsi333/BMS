export function createCharts(data) {
  document.getElementById('charts').classList.remove('hidden');

  const ctx = document.createElement('canvas');
  document.getElementById('charts').innerHTML = '';
  document.getElementById('charts').appendChild(ctx);

  new Chart(ctx, {
    type: 'line',
    data: {
      labels: data.map(d => d.relTime),
      datasets: [{
        label: 'Voltage (V)',
        data: data.map(d => d.voltage),
        borderColor: '#3b82f6',
        tension: 0.2
      }]
    }
  });
}
