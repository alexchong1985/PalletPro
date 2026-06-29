let scene, camera, renderer, palletGroup, controls;
let currentLayer = -1; // -1 means all layers
let lastResult = null;

function initVisualization() {
    const container = document.getElementById('visualization-container');
    const width = container.clientWidth;
    const height = container.clientHeight;

    scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf0f0f0);

    camera = new THREE.PerspectiveCamera(45, width / height, 1, 10000);
    camera.position.set(2000, 2000, 2000);

    renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('pallet-canvas'), antialias: true });
    renderer.setSize(width, height);

    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(10, 20, 10);
    scene.add(directionalLight);

    palletGroup = new THREE.Group();
    scene.add(palletGroup);

    // OrbitControls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    window.addEventListener('resize', onWindowResize, false);

    // Controls
    document.getElementById('prev-layer').onclick = () => {
        if (!lastResult) return;
        if (currentLayer > -1) {
            currentLayer--;
            updateDisplay();
        }
    };
    document.getElementById('next-layer').onclick = () => {
        if (!lastResult) return;
        if (currentLayer < lastResult.layers.length - 1) {
            currentLayer++;
            updateDisplay();
        }
    };
    document.getElementById('reset-view').onclick = () => {
        currentLayer = -1;
        updateDisplay();
        resetCamera();
    };

    animate();
}

function onWindowResize() {
    const container = document.getElementById('visualization-container');
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
}

function animate() {
    requestAnimationFrame(animate);
    if (controls) controls.update();
    renderer.render(scene, camera);
}

function resetCamera() {
    if (!lastResult) return;
    const { pallet, layers, box } = lastResult;
    const loadHeight = layers.length > 0 ? layers.length * box.h : 0;
    camera.position.set(pallet.l * 1.5, loadHeight + pallet.l, pallet.w * 1.5);
    controls.target.set(0, loadHeight / 2, 0);
    controls.update();
}

function drawResult(result) {
    lastResult = result;
    currentLayer = -1;
    updateDisplay();
    resetCamera();
}

function updateDisplay() {
    if (!lastResult) return;
    
    const { pallet, layers, box } = lastResult;
    const status = document.getElementById('layer-status');
    status.textContent = currentLayer === -1 ? 'All Layers' : `Layer ${currentLayer + 1}`;

    // Clear previous
    while(palletGroup.children.length > 0){ 
        palletGroup.remove(palletGroup.children[0]); 
    }

    // Draw Pallet Base
    const palletGeo = new THREE.BoxGeometry(pallet.l, 144, pallet.w);
    const palletMat = new THREE.MeshLambertMaterial({ color: 0x8b4513 });
    const palletMesh = new THREE.Mesh(palletGeo, palletMat);
    palletMesh.position.y = -72;
    palletGroup.add(palletMesh);

    // Draw Boxes
    layers.forEach((layer, lIdx) => {
        if (currentLayer !== -1 && currentLayer !== lIdx) return;

        layer.forEach((b, bIdx) => {
            const boxGeo = new THREE.BoxGeometry(b.l - 1, b.h - 1, b.w - 1);
            const boxMat = new THREE.MeshLambertMaterial({ 
                color: (lIdx % 2 === 0) ? 0xdeaa87 : 0xd2b48c,
                transparent: currentLayer === -1 && lIdx > 0,
                opacity: 1.0
            });
            const boxMesh = new THREE.Mesh(boxGeo, boxMat);
            
            boxMesh.position.set(
                b.x + b.l/2 - pallet.l/2,
                b.z + b.h/2,
                b.y + b.w/2 - pallet.w/2
            );
            palletGroup.add(boxMesh);

            // Edges
            const edges = new THREE.EdgesGeometry(boxGeo);
            const line = new THREE.LineSegments(edges, new THREE.LineBasicMaterial({ color: 0x000000, opacity: 0.3, transparent: true }));
            line.position.copy(boxMesh.position);
            palletGroup.add(line);
        });
    });
}
