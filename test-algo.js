const algorithm = require('./algorithm.js');

// Mock global functions if they are not exported
// Wait, the algorithm.js defines functions in the global scope in a browser.
// In Node, I need to wrap it or modify it to export.

const fs = require('fs');
const code = fs.readFileSync('./algorithm.js', 'utf8');

// Simple wrapper to extract functions
const evalCode = (code) => {
    const sandbox = {};
    const fnNames = ['calculatePacking', 'calculateForOrientation', 'optimalLayerPack', 'pinwheelPack', 'createLayersResult'];
    
    // Convert declarations to expressions in the sandbox
    const wrappedCode = code + '\n' + fnNames.map(name => `exports.${name} = ${name};`).join('\n');
    const module = { exports: {} };
    (function(exports, module) {
        eval(code);
        fnNames.forEach(name => {
            try {
                exports[name] = eval(name);
            } catch(e) {}
        });
    })(module.exports, module);
    return module.exports;
};

const algo = evalCode(code);

const pallet = { l: 1200, w: 1000, h: 1200, maxWeight: 1000 };
const box = { l: 400, w: 300, h: 200, weight: 10 };

const result = algo.calculatePacking(pallet, box);
console.log('Result count:', result.count);
console.log('Layers:', result.layers.length);
console.log('Boxes per layer:', result.countPerLayer);
console.log('Utilization:', result.utilization);
