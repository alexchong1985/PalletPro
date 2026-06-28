document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    initVisualization();

    const calcBtn = document.getElementById('calculate-btn');
    calcBtn.addEventListener('click', () => {
        const pallet = {
            l: parseFloat(document.getElementById('p-length').value),
            w: parseFloat(document.getElementById('p-width').value),
            h: parseFloat(document.getElementById('p-height').value),
            maxWeight: parseFloat(document.getElementById('p-max-weight').value) || Infinity
        };

        const box = {
            l: parseFloat(document.getElementById('b-length').value),
            w: parseFloat(document.getElementById('b-width').value),
            h: parseFloat(document.getElementById('b-height').value),
            weight: parseFloat(document.getElementById('b-weight').value) || 0
        };

        if (isNaN(pallet.l) || isNaN(pallet.w) || isNaN(pallet.h) ||
            isNaN(box.l) || isNaN(box.w) || isNaN(box.h)) {
            alert('Please enter valid numbers for all dimensions.');
            return;
        }

        const result = calculatePacking(pallet, box);
        if (!result || result.count === 0) {
            alert('No boxes could fit with these dimensions and constraints.');
            return;
        }
        displayResults(result);
    });

    // Run initial calculation
    calcBtn.click();
});

function displayResults(result) {
    const resultsSection = document.getElementById('results');
    resultsSection.classList.remove('hidden');

    const totalWeight = result.count * (result.box.weight || 0);
    const weightUtil = result.pallet.maxWeight && result.pallet.maxWeight !== Infinity 
        ? (totalWeight / result.pallet.maxWeight) * 100 
        : 0;

    document.getElementById('stat-total').textContent = result.count;
    document.getElementById('stat-utilization').textContent = (result.utilization * 100).toFixed(1) + '%';
    document.getElementById('stat-layout').textContent = `${result.layers.length} x ${result.countPerLayer}`;
    document.getElementById('stat-weight').textContent = totalWeight.toLocaleString() + ' kg';
    document.getElementById('stat-weight-util').textContent = weightUtil.toFixed(1) + '%';

    drawResult(result);
}
