// js/parser.js

function parseYAML(text) {
    try {
        const entries = [];
        const blocks = text.split('---').filter(b => b.trim());

        for (let block of blocks) {
            try {
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
                    entries.push(entry);
                }
            } catch (blockError) {
                console.warn('Skipping malformed block:', blockError);
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
        throw new Error(`YAML parsing failed: ${error.message}`);
    }
}

function validateAndFilterData(data) {
    return data
        .filter(entry => {
            return (
                entry.timestamp !== undefined &&
                !isNaN(entry.timestamp) &&
                (entry.voltage === undefined || (!isNaN(entry.voltage) && entry.voltage > 0)) &&
                (entry.soc === undefined || (!isNaN(entry.soc) && entry.soc >= 0 && entry.soc <= 100))
            );
        })
        .map(entry => ({
            ...entry,
            power: entry.power || (entry.voltage * entry.current || 0)
        }));
}
