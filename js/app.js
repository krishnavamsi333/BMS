import { parseYAML } from './parser.js';
import { createCharts } from './charts.js';
import { computeStats } from './calculations.js';

const fileInput = document.getElementById('fileInput');
const fileName = document.getElementById('fileName');

fileInput.addEventListener('change', handleFile);

function handleFile(e) {
  const file = e.target.files[0];
  if (!file) return;

  fileName.textContent = file.name;

  const reader = new FileReader();
  reader.onload = () => {
    const data = parseYAML(reader.result);
    const stats = computeStats(data);
    createCharts(data);
  };
  reader.readAsText(file);
}
