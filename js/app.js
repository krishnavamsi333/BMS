function init() {
    bindEvents();
    setupDefaultThresholds();
}

function bindEvents() {
    document
        .getElementById('fileInput')
        .addEventListener('change', handleFileSelect);
    document
        .getElementById('absoluteTimeBtn')
        .addEventListener('click', () => setTimeMode('absolute'));
    document
        .getElementById('relativeTimeBtn')
        .addEventListener('click', () => setTimeMode('relative'));
    document
        .getElementById('smoothingBtn')
        .addEventListener('click', toggleSmoothing);
    document
        .getElementById('exportBtn')
        .addEventListener('click', exportData);
    document
        .getElementById('clearBtn')
        .addEventListener('click', clearData);
    document
        .getElementById('updateThresholdsBtn')
        .addEventListener('click', updateThresholds);
    document
        .getElementById('exportFullBtn')
        .addEventListener('click', exportFullData);

    window.addEventListener('error', function (e) {
        showError(
            `Unexpected error: ${
                e.error?.message || 'Unknown error'
            }`
        );
    });
}

function setupDefaultThresholds() {
    document.getElementById('thVoltageLow').value =
        thresholds.voltageLow;
    document.getElementById('thVoltageHigh').value =
        thresholds.voltageHigh;
    document.getElementById('thCurrentMax').value =
        thresholds.currentMax;
    document.getElementById('thSocLow').value = thresholds.socLow;
}

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        document.getElementById('fileName').textContent = file.name;
        processFile(file);
    }
}

function validateFile(file) {
    if (!file) {
        throw new Error('No file selected');
    }

    if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(
            `File too large: ${(file.size / 1024 / 1024).toFixed(
                2
            )}MB (max ${
                CONFIG.MAX_FILE_SIZE / 1024 / 1024
            }MB)`
        );
    }

    const validExtensions = ['.yaml', '.yml', '.txt'];
    const fileExtension = file.name
        .toLowerCase()
        .substring(file.name.lastIndexOf('.'));

    if (!validExtensions.includes(fileExtension)) {
        throw new Error(
            `Invalid file type. Please select a YAML file (${validExtensions.join(
                ', '
            )})`
        );
    }

    return true;
}

function processFile(file) {
    try {
        validateFile(file);
        cleanup();

        document.getElementById('loadingSection').style.display =
            'block';
        document.getElementById('progressSection').style.display =
            'block';
        document.getElementById('chartsSection').style.display =
            'none';
        document.getElementById('statsSection').style.display =
            'none';
        document.getElementById('errorSection').style.display =
            'none';
        document.getElementById('alertsSection').style.display =
            'none';
        document.getElementById('thresholdControls').style.display =
            'none';
        document.getElementById('energySummary').style.display =
            'none';

        const reader = new FileReader();
        let processingTimeout;

        processingTimeout = setTimeout(() => {
            showError(
                'File processing timeout. File might be too large or corrupted.'
            );
            reader.abort();
        }, 30000);

        reader.onprogress = function (e) {
            if (e.lengthComputable) {
                const percent = Math.round(
                    (e.loaded / e.total) * 100
                );
                updateProgress(percent, `Loading: ${percent}%`);
            }
        };

        reader.onload = function (e) {
            clearTimeout(processingTimeout);

            try {
                updateProgress(50, 'Parsing YAML data...');
                const text = e.target.result;
                const data = parseYAML(text);

                if (data.length === 0) {
                    throw new Error(
                        'No valid data found in file. Please check the file format.'
                    );
                }

                updateProgress(75, 'Processing data...');
                currentData = validateAndFilterData(data);
                calculateEnergyConsumption(currentData);
                const smoothedData = smoothData(currentData);

                updateProgress(90, 'Creating visualizations...');
                displayStats(smoothedData);
                displayEnergySummary();
                checkAlerts(smoothedData);
                createCharts(smoothedData);

                updateProgress(100, 'Complete!');

                setTimeout(() => {
                    document.getElementById(
                        'loadingSection'
                    ).style.display = 'none';
                    document.getElementById(
                        'progressSection'
                    ).style.display = 'none';
                    document.getElementById(
                        'chartsSection'
                    ).style.display = 'block';
                    document.getElementById(
                        'statsSection'
                    ).style.display = 'grid';
                    document.getElementById(
                        'thresholdControls'
                    ).style.display = 'block';
                    document.getElementById(
                        'energySummary'
                    ).style.display = 'block';
                    animateElements();
                }, 500);
            } catch (error) {
                clearTimeout(processingTimeout);
                showError('Error processing file: ' + error.message);
            }
        };

        reader.onerror = function () {
            clearTimeout(processingTimeout);
            showError(
                'Error reading file. The file may be corrupted or inaccessible.'
            );
        };

        reader.readAsText(file);
    } catch (error) {
        showError(error.message);
    }
}

document.addEventListener('DOMContentLoaded', init);
