function calculatePacking(pallet, box) {
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
        gridPack(pallet.l, pallet.w, pallet.h, boxOri.l, boxOri.w, boxOri.h),
        gridPack(pallet.l, pallet.w, pallet.h, boxOri.w, boxOri.l, boxOri.h),
        brickPack(pallet.l, pallet.w, pallet.h, boxOri.l, boxOri.w, boxOri.h),
        brickPack(pallet.l, pallet.w, pallet.h, boxOri.w, boxOri.l, boxOri.h),
        pinwheelPack(pallet.l, pallet.w, pallet.h, boxOri.l, boxOri.w, boxOri.h)
    ];

    let bestPattern = patterns[0];
    patterns.forEach(p => {
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

function gridPack(PL, PW, PH, bl, bw, bh) {
    const nx = Math.floor(PL / bl);
    const ny = Math.floor(PW / bw);
    const nz = Math.floor(PH / bh);

    const boxesInLayer = [];
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            boxesInLayer.push({ x: i * bl, y: j * bw, l: bl, w: bw });
        }
    }

    // Try filling the remaining L-strip
    const lStripL = PL - nx * bl;
    if (lStripL >= bw) {
        const snx = Math.floor(lStripL / bw);
        const sny = Math.floor(PW / bl);
        for (let i = 0; i < snx; i++) {
            for (let j = 0; j < sny; j++) {
                boxesInLayer.push({ x: nx * bl + i * bw, y: j * bl, l: bw, w: bl });
            }
        }
    }

    return createLayersResult(boxesInLayer, nz, bh, PL, PW, PH, bl, bw);
}

function brickPack(PL, PW, PH, bl, bw, bh) {
    const nx = Math.floor(PL / bl);
    const ny = Math.floor(PW / bw);
    const nz = Math.floor(PH / bh);

    let boxesInLayer = [];
    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            boxesInLayer.push({ x: i * bl, y: j * bw, l: bl, w: bw });
        }
    }

    // Strip 1: (PL - nx*bl) x PW
    const s1L = PL - nx * bl;
    if (s1L >= bw) {
        const snx = Math.floor(s1L / bw);
        const sny = Math.floor(PW / bl);
        for (let i = 0; i < snx; i++) {
            for (let j = 0; j < sny; j++) {
                boxesInLayer.push({ x: nx * bl + i * bw, y: j * bl, l: bw, w: bl });
            }
        }
    }

    // Strip 2: (nx*bl) x (PW - ny*bw)
    const s2W = PW - ny * bw;
    if (s2W >= bl) {
        const snx = Math.floor((nx * bl) / bw);
        const sny = Math.floor(s2W / bl);
        for (let i = 0; i < snx; i++) {
            for (let j = 0; j < sny; j++) {
                boxesInLayer.push({ x: i * bw, y: ny * bw + j * bl, l: bw, w: bl });
            }
        }
    }

    return createLayersResult(boxesInLayer, nz, bh, PL, PW, PH, bl, bw);
}

function pinwheelPack(PL, PW, PH, bl, bw, bh) {
    // A simple pinwheel can be formed by 4 blocks
    // This is a basic implementation of a 4-block pinwheel
    const boxesInLayer = [];
    
    // Try to fit as many 4-block pinwheels as possible
    // Each pinwheel occupies (bl+bw) x (bl+bw)
    const pwSize = bl + bw;
    const nx = Math.floor(PL / pwSize);
    const ny = Math.floor(PW / pwSize);
    const nz = Math.floor(PH / bh);

    for (let i = 0; i < nx; i++) {
        for (let j = 0; j < ny; j++) {
            const ox = i * pwSize;
            const oy = j * pwSize;
            // 4 boxes in pinwheel
            boxesInLayer.push({ x: ox, y: oy, l: bl, w: bw });
            boxesInLayer.push({ x: ox + bl, y: oy, l: bw, w: bl });
            boxesInLayer.push({ x: ox + bw, y: oy + bl, l: bl, w: bw });
            boxesInLayer.push({ x: ox, y: oy + bw, l: bw, w: bl });
        }
    }

    // Fill remaining areas with gridPack logic (simplified)
    // For now, if pinwheel count is 0, this will return 0 which is fine.
    
    return createLayersResult(boxesInLayer, nz, bh, PL, PW, PH, bl, bw);
}

function createLayersResult(boxesInLayer, nz, bh, PL, PW, PH, bl, bw) {
    const layers = [];
    for (let k = 0; k < nz; k++) {
        // Alternating pattern: rotate/mirror every other layer
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
