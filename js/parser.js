// js/parser.js
// Robust YAML-like parser for your BMS log blocks.
// - Exports parseYAML(text) and validateAndFilterData(data).
// - Adds 'direction' based on current sign: negative => "discharging", positive => "charging".
// - Computes power if missing, normalizes current in A and mA, computes timestamps and relativeTime.
// - Safe: skips malformed blocks and logs warnings.

(function (root, factory) {
    if (typeof module === 'object' && module.exports) {
        module.exports = factory();
    } else {
        root.BMSParser = factory();
    }
})(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    // Regex to match floating numbers (including exponent), possibly negative
    const floatRx = '([-+]?(?:\\d+\\.\\d+|\\d+|\\.\\d+)(?:[eE][-+]?\\d+)?)';

    // Common keys we expect; we try to match variants (e.g., "current", "current_a", "current_mA")
    const patterns = {
        voltage: new RegExp('^\\s*voltage\\s*:\\s*' + floatRx + '\\s*$', 'mi'),
        current: new RegExp('^\\s*current\\s*:\\s*' + floatRx + '\\s*$', 'mi'),
        current_mA: new RegExp('^\\s*current_mA\\s*:\\s*' + floatRx + '\\s*$', 'mi'),
        soc: new RegExp('^\\s*soc\\s*:\\s*' + floatRx + '\\s*$', 'mi'),
        power: new RegExp('^\\s*power\\s*:\\s*' + floatRx + '\\s*$', 'mi'),
        sec: new RegExp('^\\s*sec\\s*:\\s*(\\d+)\\s*$', 'mi'),
        nanosec: new RegExp('^\\s*nanosec\\s*:\\s*(\\d+)\\s*$', 'mi')
    };

    function parseNumber(str) {
        if (str === undefined || str === null) return undefined;
        const n = Number(str);
        return Number.isFinite(n) ? n : undefined;
    }

    function parseBlock(block) {
        // Return null if block does not contain enough info
        const entry = {};

        // Try sec & nanosec first (timestamps are critical)
        const secMatch = block.match(patterns.sec);
        if (secMatch) entry.sec = parseInt(secMatch[1], 10);

        const nsecMatch = block.match(patterns.nanosec);
        if (nsecMatch) entry.nanosec = parseInt(nsecMatch[1], 10);

        // Values: voltage, current (A), current_mA, soc, power
        const vMatch = block.match(patterns.voltage);
        if (vMatch) entry.voltage = parseNumber(vMatch[1]);

        const cMatch = block.match(patterns.current);
        if (cMatch) entry.current = parseNumber(cMatch[1]);

        const cmMatch = block.match(patterns.current_mA);
        if (cmMatch && entry.current === undefined) {
            // convert mA -> A
            const val = parseNumber(cmMatch[1]);
            if (val !== undefined) entry.current = val / 1000;
            entry._original_current_mA = val;
        }

        const socMatch = block.match(patterns.soc);
        if (socMatch) entry.soc = parseNumber(socMatch[1]);

        const pMatch = block.match(patterns.power);
        if (pMatch) entry.power = parseNumber(pMatch[1]);

        // Require at least sec and one reading (voltage/current/soc)
        if (entry.sec === undefined || (entry.voltage === undefined && entry.current === undefined && entry.soc === undefined)) {
            return null;
        }

        // Compute timestamp
        entry.timestamp = entry.sec + (entry.nanosec || 0) * 1e-9;

        // Normalizations & derived fields
        if (entry.current !== undefined) {
            entry.current_A = entry.current;
            entry.current_mA = entry.current * 1000;
            // Direction field: negative => discharging, positive => charging
            if (entry.current_A < 0) {
                entry.direction = 'discharging';
            } else if (entry.current_A > 0) {
                entry.direction = 'charging';
            } else {
                entry.direction = 'idle';
            }
        }

        // If power missing and voltage & current present -> compute power (W)
        if (entry.power === undefined && entry.voltage !== undefined && entry.current !== undefined) {
            entry.power = entry.voltage * entry.current;
        }

        return entry;
    }

    function parseYAML(text) {
        if (typeof text !== 'string') {
            throw new Error('parseYAML expects a string');
        }

        const entries = [];
        // Split on YAML document marker '---'. Keep only non-empty blocks.
        const blocks = text.split(/^-{3,}\s*$/m).map(b => b.trim()).filter(b => b.length > 0);

        if (blocks.length === 0) return [];

        for (let i = 0; i < blocks.length; i++) {
            const block = blocks[i];
            try {
                const parsed = parseBlock(block);
                if (parsed) {
                    entries.push(parsed);
                } else {
                    // skip but log
                    // console.warn(`parser: skipped block ${i} (missing sec or values)`);
                }
            } catch (err) {
                // skip malformed block
                // console.warn('parser: error parsing block', err);
            }
        }

        // Compute relativeTime
        if (entries.length > 0) {
            const t0 = entries[0].timestamp;
            for (const e of entries) {
                e.relativeTime = e.timestamp - t0;
            }
        }

        return entries;
    }

    function validateAndFilterData(data) {
        if (!Array.isArray(data)) {
            throw new Error('validateAndFilterData expects an array');
        }

        const filtered = data.filter(entry => {
            // timestamp must exist and be finite
            if (entry.timestamp === undefined || !isFinite(entry.timestamp)) return false;

            // voltage if present must be > 0 (or you can allow 0 if needed)
            if (entry.voltage !== undefined && (!isFinite(entry.voltage) || entry.voltage <= 0)) return false;

            // soc if present must be between 0 and 100
            if (entry.soc !== undefined && (!isFinite(entry.soc) || entry.soc < 0 || entry.soc > 100)) return false;

            return true;
        }).map(entry => {
            const out = Object.assign({}, entry);
            // Ensure power exists
            if (out.power === undefined) {
                if (out.voltage !== undefined && out.current !== undefined) {
                    out.power = out.voltage * out.current;
                } else {
                    out.power = 0;
                }
            }
            // Ensure numeric conversions exist
            if (out.current !== undefined) {
                out.current_A = out.current_A !== undefined ? out.current_A : out.current;
                out.current_mA = out.current_mA !== undefined ? out.current_mA : out.current * 1000;
            }
            return out;
        });

        return filtered;
    }

    // Small convenience function to parse a file content (string) and return validated entries.
    function parseAndValidate(text) {
        const parsed = parseYAML(text);
        return validateAndFilterData(parsed);
    }

    // Export API
    return {
        parseYAML,
        validateAndFilterData,
        parseAndValidate
    };
});
