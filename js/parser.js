// parser.js - Enhanced YAML Parser with Fixed Cell Data Extraction
// ==========================================

window.PARSER = window.PARSER || { 
    invertCurrent: false,
    debug: false 
};

(function() {
    'use strict';

    /**
     * Extract number from regex match
     */
    function extractNumber(block, regex) {
        const match = block.match(regex);
        return match ? Number(match[1]) : undefined;
    }

    /**
     * Parse cell voltages - FIXED to handle your log format
     * Extracts exactly 16 values from cell_voltages array
     */
    function parseCellVoltages(block) {
        const regex = /cell_voltages:\s*([\s\S]*?)(?:\ncell_temperatures:|$)/;
        const match = block.match(regex);
        
        if (!match) return [];
        
        const values = match[1]
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => Number(line.substring(1).trim()))
            .filter(v => Number.isFinite(v));
        
        // Take only first 16 values (actual cell voltages)
        const cellVoltages = values.slice(0, 16);
        
        // Validate they're in reasonable range
        return cellVoltages.filter(v => v >= 2.0 && v <= 4.5);
    }

    /**
     * Parse cell temperatures - FIXED to handle your log format
     * Extracts exactly 5 values from cell_temperatures array
     */
    function parseCellTemperatures(block) {
        const regex = /cell_temperatures:\s*([\s\S]*?)(?:\n---|$)/;
        const match = block.match(regex);
        
        if (!match) return [];
        
        const values = match[1]
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.startsWith('-'))
            .map(line => Number(line.substring(1).trim()))
            .filter(t => Number.isFinite(t));
        
        // Take only first 5 values (actual temperatures)
        const temps = values.slice(0, 5);
        
        // Validate they're in reasonable range (filter out bogus values like 3487)
        return temps.filter(t => t >= -40 && t <= 120);
    }

    /**
     * Validate cell voltage
     */
    function isValidCellVoltage(v) {
        return Number.isFinite(v) && v >= 2.0 && v <= 4.5;
    }

    /**
     * Validate cell temperature
     */
    function isValidCellTemp(t) {
        return Number.isFinite(t) && t >= -40 && t <= 120;
    }

    /**
     * Parse single YAML block into entry object
     */
    function parseBlock(block, blockIndex) {
        const entry = {};

        // Parse timestamp components
        entry.sec = extractNumber(block, /sec:\s*(\d+)/);
        entry.nanosec = extractNumber(block, /nanosec:\s*(\d+)/) || 0;

        // Validate required timestamp
        if (!Number.isFinite(entry.sec)) {
            if (window.PARSER.debug) {
                console.warn(`Block ${blockIndex}: Missing or invalid timestamp`);
            }
            return null;
        }

        // Calculate full timestamp
        entry.timestamp = entry.sec + entry.nanosec * 1e-9;

        // Parse main metrics
        entry.voltage = extractNumber(block, /voltage:\s*([-\d.]+)/);
        entry.current = extractNumber(block, /current:\s*([-\d.]+)/);
        entry.soc = extractNumber(block, /soc:\s*([-\d.]+)/);
        entry.power = extractNumber(block, /power:\s*([-\d.]+)/);
        entry.remaining_ah = extractNumber(block, /remaining_ah:\s*([-\d.]+)/);
        
        // Parse FET status (0 or 1)
        entry.charge_fet = extractNumber(block, /charge_fet:\s*(\d+)/) || 0;
        entry.discharge_fet = extractNumber(block, /discharge_fet:\s*(\d+)/) || 0;

        // Parse cell voltages using improved parser
        const cellVoltages = parseCellVoltages(block);
        if (cellVoltages.length > 0) {
            entry.cell_voltages = cellVoltages;
        }

        // Parse cell temperatures using improved parser
        const cellTemps = parseCellTemperatures(block);
        if (cellTemps.length > 0) {
            entry.cell_temperatures = cellTemps;
        }

        // Apply current inversion if enabled
        if (window.PARSER.invertCurrent && Number.isFinite(entry.current)) {
            entry.current = -entry.current;
        }

        // Calculate power if missing
        if (entry.power === undefined && 
            Number.isFinite(entry.voltage) && 
            Number.isFinite(entry.current)) {
            entry.power = entry.voltage * entry.current;
        }

        // Validate SOC range
        if (Number.isFinite(entry.soc)) {
            entry.soc = Math.max(0, Math.min(100, entry.soc));
        }

        return entry;
    }

    /**
     * Parse entire YAML text into array of entries
     */
    function parseYAML(text) {
        if (!text || typeof text !== 'string') {
            console.error('Invalid input: text must be a non-empty string');
            return [];
        }

        const entries = [];
        const blocks = text
            .split('---')
            .map(b => b.trim())
            .filter(Boolean);

        if (blocks.length === 0) {
            console.warn('No valid YAML blocks found in file');
            return [];
        }

        console.info(`Parsing ${blocks.length} YAML blocks...`);

        // Parse each block
        blocks.forEach((block, index) => {
            const entry = parseBlock(block, index);
            if (entry) {
                entries.push(entry);
            }
        });

        if (entries.length === 0) {
            console.error('No valid entries parsed from file');
            return [];
        }

        // Calculate relative time from first timestamp
        const t0 = entries[0].timestamp;
        entries.forEach(entry => {
            entry.relativeTime = entry.timestamp - t0;
        });

        // Sort by timestamp (defensive)
        entries.sort((a, b) => a.timestamp - b.timestamp);

        console.info(`Successfully parsed ${entries.length} entries`);
        console.info(`Cell data: ${entries.filter(e => e.cell_voltages).length} entries with voltages`);
        console.info(`Temp data: ${entries.filter(e => e.cell_temperatures).length} entries with temperatures`);
        
        // Log sample entry for debugging
        if (window.PARSER.debug && entries.length > 0) {
            console.debug('Sample entry:', entries[0]);
        }

        return entries;
    }

    /**
     * Validate and filter parsed data
     */
    function validateAndFilterData(data) {
        if (!Array.isArray(data)) {
            console.error('Data must be an array');
            return [];
        }

        const filtered = data.filter(entry => {
            if (!Number.isFinite(entry.timestamp)) {
                return false;
            }

            const hasValidData = 
                Number.isFinite(entry.voltage) ||
                Number.isFinite(entry.current) ||
                Number.isFinite(entry.soc) ||
                (Array.isArray(entry.cell_voltages) && entry.cell_voltages.length > 0);

            return hasValidData;
        });

        if (filtered.length < data.length) {
            console.info(`Filtered out ${data.length - filtered.length} invalid entries`);
        }

        return filtered;
    }

    /**
     * Get statistics about parsed data
     */
    function getDataStats(data) {
        if (!Array.isArray(data) || data.length === 0) {
            return null;
        }

        const stats = {
            totalEntries: data.length,
            timeRange: {
                start: data[0].timestamp,
                end: data[data.length - 1].timestamp,
                duration: data[data.length - 1].timestamp - data[0].timestamp
            },
            cellVoltageCount: data.filter(e => e.cell_voltages).length,
            cellTempCount: data.filter(e => e.cell_temperatures).length,
            fetDataCount: data.filter(e => e.charge_fet !== undefined).length,
            avgCellCount: data.filter(e => e.cell_voltages).length > 0 
                ? Math.round(data.filter(e => e.cell_voltages).reduce((sum, e) => sum + e.cell_voltages.length, 0) / data.filter(e => e.cell_voltages).length)
                : 0,
            avgTempCount: data.filter(e => e.cell_temperatures).length > 0
                ? Math.round(data.filter(e => e.cell_temperatures).reduce((sum, e) => sum + e.cell_temperatures.length, 0) / data.filter(e => e.cell_temperatures).length)
                : 0
        };

        return stats;
    }

    // Export functions
    window.parseYAML = parseYAML;
    window.validateAndFilterData = validateAndFilterData;
    window.getDataStats = getDataStats;

    console.info('Enhanced Parser loaded - Ready for BMS YAML logs with improved cell data extraction');
})();