// js/parser.js
// Put this file at BMS/js/parser.js (replace the old one).
// Exposes parseYAML and validateAndFilterData on window so index.html and other scripts can call them.

// Small config object you can change at runtime:
// - invertCurrent: set to true if the YAML uses the opposite sign convention and you want to flip it.
window.PARSER = window.PARSER || { invertCurrent: false };

(function () {
  'use strict';

  function safeParseFloat(s) {
    const v = parseFloat(s);
    return Number.isFinite(v) ? v : undefined;
  }

  // parseYAML: returns array of entries { sec, nanosec, timestamp, relativeTime, voltage, current, soc, power }
  function parseYAML(text) {
    try {
      const entries = [];
      // Split on document separator '---' as used in many ROS YAML logs
      const blocks = text.split('---').filter(b => b.trim().length > 0);

      for (let block of blocks) {
        try {
          const entry = {};
          // Basic regexes: allow optional + or - and decimals
          const patterns = {
            voltage: /voltage:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/,
            current: /current:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/,
            soc: /soc:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/,
            power: /power:\s*([+-]?\d+\.?\d*(?:[eE][+-]?\d+)?)/,
            sec: /sec:\s*(\d+)/,
            nanosec: /nanosec:\s*(\d+)/
          };

          Object.entries(patterns).forEach(([key, pattern]) => {
            const m = block.match(pattern);
            if (m && m[1] !== undefined) {
              if (key === 'sec' || key === 'nanosec') {
                entry[key] = parseInt(m[1], 10);
              } else {
                entry[key] = safeParseFloat(m[1]);
              }
            }
          });

          // if sec exists and at least one metric is present, accept
          if (entry.sec !== undefined && (entry.voltage !== undefined || entry.current !== undefined || entry.soc !== undefined || entry.power !== undefined)) {
            entry.nanosec = entry.nanosec || 0;
            entry.timestamp = entry.sec + entry.nanosec * 1e-9;
            // Optionally invert current sign if user wants the opposite convention
            if (entry.current !== undefined && window.PARSER.invertCurrent) {
              entry.current = -entry.current;
            }
            entries.push(entry);
          }
        } catch (blockError) {
          console.warn('Skipping malformed block in YAML parser:', blockError);
        }
      }

      if (entries.length > 0) {
        const firstTimestamp = entries[0].timestamp;
        entries.forEach(entry => {
          entry.relativeTime = entry.timestamp - firstTimestamp;
        });
      }

      return entries;
    } catch (error) {
      console.error('YAML parsing failed:', error);
      return [];
    }
  }

  // Validate/filter data and compute power if missing.
  function validateAndFilterData(data) {
    if (!Array.isArray(data)) return [];

    const filtered = data
      .filter(entry => {
        // timestamp must be valid
        if (entry.timestamp === undefined || Number.isNaN(entry.timestamp)) return false;

        // Voltage must be positive if present
        if (entry.voltage !== undefined && (Number.isNaN(entry.voltage) || entry.voltage <= 0)) return false;

        // SOC if present must be within 0-100
        if (entry.soc !== undefined && (Number.isNaN(entry.soc) || entry.soc < 0 || entry.soc > 100)) return false;

        // Current allowed to be positive or negative (we don't filter it here)
        return true;
      })
      .map((entry, idx, arr) => {
        const e = Object.assign({}, entry);
        // Calculate power if not present: p = v * i
        if (e.power === undefined) {
          if (typeof e.voltage === 'number' && typeof e.current === 'number') {
            e.power = e.voltage * e.current;
          } else {
            e.power = undefined;
          }
        }
        return e;
      });

    // Optionally compute cumulative energy (Wh) by trapezoidal integration over power/time and attach to each entry
    // Energy will be in watt-seconds (J) unless converted; here we'll compute Wh for convenience.
    let cumulativeWh = 0;
    for (let i = 1; i < filtered.length; ++i) {
      const prev = filtered[i - 1];
      const cur = filtered[i];
      if (prev.power !== undefined && cur.power !== undefined) {
        const dt = cur.timestamp - prev.timestamp; // seconds
        // trapezoid: average power * dt seconds -> energy in watt-seconds
        const wattSeconds = ((prev.power + cur.power) / 2) * dt;
        const wh = wattSeconds / 3600.0;
        cumulativeWh += wh;
      }
      filtered[i].cumulativeWh = cumulativeWh;
    }
    if (filtered.length > 0 && filtered[0].cumulativeWh === undefined) filtered[0].cumulativeWh = 0;

    return filtered;
  }

  // Expose to global scope so other files / index.html can call them directly
  window.parseYAML = parseYAML;
  window.validateAndFilterData = validateAndFilterData;

  // Helpful quick test function (call from console)
  window._parserSelfTest = function (raw) {
    try {
      const parsed = parseYAML(raw);
      const validated = validateAndFilterData(parsed);
      console.log('Parsed entries:', parsed.length, validated.length);
      return validated;
    } catch (e) {
      console.error('Parser self-test error:', e);
      return null;
    }
  };

  // Basic info on load
  console.info('parser.js loaded. Use window.parseYAML(text) and window.validateAndFilterData(array).');
})();
