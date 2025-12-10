// parser.js - YAML parsing with validation

// Configuration
const CONFIG = {
    MAX_FILE_SIZE: 50 * 1024 * 1024, // 50MB
    THRESHOLDS: {
        VOLTAGE: { min: 48.0, max: 60.0 },
        CURRENT: { max: 50.0 },
        SOC: { min: 20.0 }
    }
};

// Thresholds
let thresholds = {
    voltageLow: CONFIG.THRESHOLDS.VOLTAGE.min,
    voltageHigh: CONFIG.THRESHOLDS.VOLTAGE.max,
    currentMax: CONFIG.THRESHOLDS.CURRENT.max,
    socLow: CONFIG.THRESHOLDS.SOC.min
};

function validateFile(file) {
    if (!file) {
        throw new Error('No file selected');
    }
    
    if (file.size > CONFIG.MAX_FILE_SIZE) {
        throw new Error(`File too large: ${(file.size/1024/1024).toFixed(2)}MB (max ${CONFIG.MAX_FILE_SIZE/1024/1024}MB)`);
    }
    
    const validExtensions = ['.yaml', '.yml', '.txt'];
    const fileExtension = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
    
    if (!validExtensions.includes(fileExtension)) {
        throw new Error(`Invalid file type. Please select a YAML file (${validExtensions.join(', ')})`);
    }
    
    return true;
}

async function readFileAsText(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        let processingTimeout;
        
        processingTimeout = setTimeout(() => {
            reject(new Error('File processing timeout. File might be too large or corrupted.'));
            reader.abort();
        }, 30000);
        
        reader.onprogress = function(e) {
            if (e.lengthComputable) {
                const percent = Math.round((e.loaded / e.total) * 100);
                updateProgress(percent, `Loading: ${percent}%`);
            }
        };
        
        reader.onload = function(e) {
            clearTimeout(processingTimeout);
            resolve(e.target.result);
        };
        
        reader.onerror = function() {
            clearTimeout(processingTimeout);
            reject(new Error('Error reading file. The file may be corrupted or inaccessible.'));
        };
        
        reader.readAsText(file);
    });
}

function parseYAML(text) {
    try {
        const entries = [];
        const blocks = text.split('---').filter(b => b.trim());
        
        for (let block of blocks) {
            try {
                const entry = parseYAMLBlock(block);
                if (entry) {
                    entries.push(entry);
                }
            } catch (blockError) {
                console.warn('Skipping malformed block:', blockError);
            }
        }
        
        if (entries.length > 0) {
            calculateRelativeTimes(entries);
        }
        
        return entries;
    } catch (error) {
        throw new Error(`YAML parsing failed: ${error.message}`);
    }
}

function parseYAMLBlock(block) {
    const entry = {};
    const patterns = {
        voltage: /voltage:\s*([-\d.]+)/,
        current: /current:\s*([-\d.]+)/,
        soc: /soc:\s*([-\d.]+)/,
        power: /power:\s*([-\d.]+)/,
        sec: /sec:\s*(\d+)/,
        nanosec: /nanosec:\s*(\d+)/
    };
    
    Object.entries(patterns).forEach(([key, pattern]) => {
        const match = block.match(pattern);
        if (match && match[1]) {
            const value = parseFloat(match[1]);
            if (!isNaN(value)) {
                entry[key] = value;
            }
        }
    });
    
    if (entry.sec !== undefined && !isNaN(entry.sec) && 
        (entry.voltage !== undefined || entry.current !== undefined || entry.soc !== undefined)) {
        entry.timestamp = entry.sec + (entry.nanosec || 0) * 1e-9;
        return entry;
    }
    
    return null;
}

function calculateRelativeTimes(entries) {
    if (entries.length === 0) return;
    
    const firstTimestamp = entries[0].timestamp;
    entries.forEach(entry => {
        entry.relativeTime = entry.timestamp - firstTimestamp;
    });
}

function validateAndFilterData(data) {
    return data.filter(entry => {
        return (
            entry.timestamp !== undefined &&
            !isNaN(entry.timestamp) &&
            (entry.voltage === undefined || (!isNaN(entry.voltage) && entry.voltage > 0)) &&
            (entry.soc === undefined || (!isNaN(entry.soc) && entry.soc >= 0 && entry.soc <= 100))
        );
    }).map(entry => ({
        ...entry,
        power: entry.power || (entry.voltage * entry.current || 0)
    }));
}

function updateProgress(percent, text) {
    document.getElementById('progressFill').style.width = percent + '%';
    document.getElementById('progressText').textContent = text;
}