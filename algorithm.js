function calculatePacking(pallet, box, lockHeight) {
    const orientations = [
        { l: box.l, w: box.w, h: box.h, weight: box.weight },
        { l: box.l, w: box.h, h: box.w, weight: box.weight },
        { l: box.w, w: box.l, h: box.h, weight: box.weight },
        { l: box.w, w: box.h, h: box.l, weight: box.weight },
        { l: box.h, w: box.l, h: box.w, weight: box.weight },
        { l: box.h, w: box.w, h: box.l, weight: box.weight }
    ];

    let bestResult = null;

    orientations.forEach(ori => {
        if (ori.h > pallet.h) return;
        // When height is locked, only allow orientations where height equals original box height
        if (lockHeight && ori.h !== box.h) return;
        
        const result = calculateForOrientation(pallet, ori);
        if (!bestResult || result.count > bestResult.count) {
            bestResult = result;
        } else if (result.count === bestResult.count && result.utilization > bestResult.utilization) {
            bestResult = result;
        }
    });

    return bestResult;
}

function calculateForOrientation(pallet, boxOri) {
    const patterns = [
        optimalLayerPack(pallet.l, pallet.w, pallet.h, boxOri.l, boxOri.w, boxOri.h),
        mixedPack(pallet.l, pallet.w, pallet.h, boxOri.l, boxOri.w, boxOri.h),
        pinwheelPack(pallet.l, pallet.w, pallet.h, boxOri.l, boxOri.w, boxOri.h),
        pinwheelPack(pallet.l, pallet.w, pallet.h, boxOri.w, boxOri.l, boxOri.h)
    ];

    let bestPattern = patterns[0];
    patterns.forEach(p => {
        if (!p) return;
        if (p.count > bestPattern.count) {
            bestPattern = p;
        } else if (p.count === bestPattern.count && p.utilization > bestPattern.utilization) {
            bestPattern = p;
        }
    });

    // Apply weight constraint
    let finalLayers = [];
    let currentWeight = 0;
    const boxWeight = boxOri.weight || 0;
    const maxWeight = pallet.maxWeight || Infinity;

    for (let layer of bestPattern.layers) {
        const layerWeight = layer.length * boxWeight;
        if (currentWeight + layerWeight <= maxWeight) {
            finalLayers.push(layer);
            currentWeight += layerWeight;
        } else {
            break;
        }
    }

    return {
        count: finalLayers.length * bestPattern.countPerLayer,
        countPerLayer: bestPattern.countPerLayer,
        layers: finalLayers,
        box: boxOri,
        pallet: pallet,
        utilization: (finalLayers.length * bestPattern.countPerLayer * (boxOri.l * boxOri.w * boxOri.h)) / (pallet.l * pallet.w * pallet.h)
    };
}

function mixedPack(PL, PW, PH, bl, bw, bh) {
    let bestBoxes = [];
    const nz = Math.floor(PH / bh);
    
    // Try horizontal splits (row-based mixing)
    for (let n1 = 0; n1 * bw <= PW; n1++) {
        const remainingWidth = PW - (n1 * bw);
        const n2 = Math.floor(remainingWidth / bl);
        const boxes = [];
        const nx1 = Math.floor(PL / bl);
        for (let i = 0; i < nx1; i++) {
            for (let j = 0; j < n1; j++) {
                boxes.push({ x: i * bl, y: j * bw, l: bl, w: bw });
            }
        }
        const nx2 = Math.floor(PL / bw);
        for (let i = 0; i < nx2; i++) {
            for (let j = 0; j < n2; j++) {
                boxes.push({ x: i * bw, y: (n1 * bw) + (j * bl), l: bw, w: bl });
            }
        }
        if (boxes.length > bestBoxes.length) bestBoxes = boxes;
    }
    
    // Try vertical splits (column-based mixing)
    for (let n1 = 0; n1 * bl <= PL; n1++) {
        const remainingLength = PL - (n1 * bl);
        const n2 = Math.floor(remainingLength / bw);
        const boxes = [];
        const ny1 = Math.floor(PW / bw);
        for (let i = 0; i < n1; i++) {
            for (let j = 0; j < ny1; j++) {
                boxes.push({ x: i * bl, y: j * bw, l: bl, w: bw });
            }
        }
        const ny2 = Math.floor(PW / bl);
        for (let i = 0; i < n2; i++) {
            for (let j = 0; j < ny2; j++) {
                boxes.push({ x: (n1 * bl) + i * bw, y: j * bl, l: bw, w: bl });
            }
        }
        if (boxes.length > bestBoxes.length) bestBoxes = boxes;
    }
    
    return createLayersResult(bestBoxes, nz, bh, PL, PW, PH, bl, bw);
}

function optimalLayerPack(PL, PW, PH, bl, bw, bh) {
    let bestBoxes = [];
    const nz = Math.floor(PH / bh);

    const getBestForRect = (W, H) => {
        if (W <= 0 || H <= 0) return { l: bl, w: bw, n: 0 };
        const n1 = Math.floor(W / bl) * Math.floor(H / bw);
        const n2 = Math.floor(W / bw) * Math.floor(H / bl);
        return n1 >= n2 ? { l: bl, w: bw, n: n1 } : { l: bw, w: bl, n: n2 };
    };

    const fillGrid = (x0, y0, W, H, l, w) => {
        const boxes = [];
        const nx = Math.floor(W / l);
        const ny = Math.floor(H / w);
        for (let i = 0; i < nx; i++) {
            for (let j = 0; j < ny; j++) {
                boxes.push({ x: x0 + i * l, y: y0 + j * w, l: l, w: w });
            }
        }
        return boxes;
    };

    const xCandidates = new Set([0, PL]);
    for (let i = 1; i * bl <= PL; i++) xCandidates.add(i * bl);
    for (let i = 1; i * bw <= PL; i++) xCandidates.add(i * bw);

    const yCandidates = new Set([0, PW]);
    for (let i = 1; i * bl <= PW; i++) yCandidates.add(i * bl);
    for (let i = 1; i * bw <= PW; i++) yCandidates.add(i * bw);

    for (let x of xCandidates) {
        // 2-Block Vertical Split
        const b1v = getBestForRect(x, PW);
        const b2v = getBestForRect(PL - x, PW);
        if (b1v.n + b2v.n > bestBoxes.length) {
            bestBoxes = [
                ...fillGrid(0, 0, x, PW, b1v.l, b1v.w),
                ...fillGrid(x, 0, PL - x, PW, b2v.l, b2v.w)
            ];
        }

        for (let y of yCandidates) {
            // 3-Block Guillotine (Type A)
            const bA = getBestForRect(x, y);
            const bB = getBestForRect(PL - x, PW);
            const bC = getBestForRect(x, PW - y);
            if (bA.n + bB.n + bC.n > bestBoxes.length) {
                bestBoxes = [
                    ...fillGrid(0, 0, x, y, bA.l, bA.w),
                    ...fillGrid(x, 0, PL - x, PW, bB.l, bB.w),
                    ...fillGrid(0, y, x, PW - y, bC.l, bC.w)
                ];
            }

            // 3-Block Guillotine (Type B)
            const bA2 = getBestForRect(x, y);
            const bB2 = getBestForRect(PL, PW - y);
            const bC2 = getBestForRect(PL - x, y);
            if (bA2.n + bB2.n + bC2.n > bestBoxes.length) {
                bestBoxes = [
                    ...fillGrid(0, 0, x, y, bA2.l, bA2.w),
                    ...fillGrid(0, y, PL, PW - y, bB2.l, bB2.w),
                    ...fillGrid(x, 0, PL - x, y, bC2.l, bC2.w)
                ];
            }
        }
    }

    // 2-Block Horizontal Split
    for (let y of yCandidates) {
        const b1h = getBestForRect(PL, y);
        const b2h = getBestForRect(PL, PW - y);
        if (b1h.n + b2h.n > bestBoxes.length) {
            bestBoxes = [
                ...fillGrid(0, 0, PL, y, b1h.l, b1h.w),
                ...fillGrid(0, y, PL, PW - y, b2h.l, b2h.w)
            ];
        }
    }

    return createLayersResult(bestBoxes, nz, bh, PL, PW, PH, bl, bw);
}

function pinwheelPack(PL, PW, PH, bl, bw, bh) {
    const pwSize = bl + bw;
    const nx = Math.floor(PL / pwSize);
    const ny = Math.floor(PW / pwSize);
    const nz = Math.floor(PH / bh);

    let boxesInLayer = [];
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const ox = i * pwSize;
            const oy = j * pwSize;
            boxesInLayer.push({ x: ox, y: oy, l: bl, w: bw });
            boxesInLayer.push({ x: ox + bl, y: oy, l: bw, w: bl });
            boxesInLayer.push({ x: ox + bw, y: oy + bl, l: bl, w: bw });
            boxesInLayer.push({ x: ox + bw, y: oy + bw, l: bw, w: bl });
        }
    }

    return createLayersResult(boxesInLayer, nz, bh, PL, PW, PH, bl, bw);
}

function createLayersResult(boxesInLayer, nz, bh, PL, PW, PH, bl, bw) {
    const layers = [];
    for (let k = 0; k < nz; k++) {
        if (k % 2 === 1) {
            layers.push(boxesInLayer.map(b => ({
                x: PL - b.x - b.l,
                y: PW - b.y - b.w,
                z: k * bh,
                l: b.l,
                w: b.w,
                h: bh
            })));
        } else {
            layers.push(boxesInLayer.map(b => ({
                ...b,
                z: k * bh,
                h: bh
            })));
        }
    }

    return {
        count: boxesInLayer.length * nz,
        countPerLayer: boxesInLayer.length,
        layers: layers,
        utilization: (boxesInLayer.length * nz * (bl * bw * bh)) / (PL * PW * PH)
    };
}