// ================================
// 3D GROWING PLANT - Three.js
// ================================

class Plant3D {
    constructor(containerId, streak = 0) {
        this.containerId = containerId;
        this.streak = streak;
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.plant = null;
        this.animationId = null;
        this.isRotating = false;
        
        this.init();
    }

    init() {
        const container = document.getElementById(this.containerId);
        if (!container) {
            console.error('Plant container not found!');
            return;
        }

        // Remove loading spinner
        const loadingSpinner = container.querySelector('.plant-loading');
        if (loadingSpinner) {
            loadingSpinner.remove();
        }

        // Scene setup
        this.scene = new THREE.Scene();
        this.scene.background = null; // Transparent

        // Camera
        const width = container.clientWidth || 200;
        const height = container.clientHeight || 200;
        this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
        this.camera.position.set(0, 2, 5);
        this.camera.lookAt(0, 0, 0);

        // Renderer
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        this.renderer.setSize(width, height);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        container.appendChild(this.renderer.domElement);

        // Lighting
        this.setupLighting();

        // Create plant based on streak
        this.createPlant(this.streak);

        // Controls
        this.setupControls();

        // Start animation loop
        this.animate();

        // Handle resize
        window.addEventListener('resize', () => this.onResize());

        console.log('🌱 3D Plant initialized! Streak:', this.streak);
    }

    setupLighting() {
        // Ambient light
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);

        // Directional light (sun)
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(5, 10, 5);
        this.scene.add(directionalLight);

        // Soft fill light
        const fillLight = new THREE.DirectionalLight(0x88ccff, 0.3);
        fillLight.position.set(-5, 5, -5);
        this.scene.add(fillLight);
    }

    setupControls() {
        const canvas = this.renderer.domElement;
        let isDragging = false;
        let previousMouseX = 0;
        let previousMouseY = 0;
        
        // Store cumulative rotations
        this.rotationX = 0;
        this.rotationY = 0;

        canvas.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMouseX = e.clientX;
            previousMouseY = e.clientY;
            this.isRotating = true;
            canvas.style.cursor = 'grabbing';
        });

        canvas.addEventListener('mousemove', (e) => {
            if (isDragging && this.plant) {
                const deltaX = e.clientX - previousMouseX;
                const deltaY = e.clientY - previousMouseY;
                
                // Rotate around Y axis (horizontal drag)
                this.rotationY += deltaX * 0.01;
                
                // Rotate around X axis (vertical drag)
                this.rotationX -= deltaY * 0.01;
                
                // Clamp X rotation to prevent flipping upside down
                this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX));
                
                // Apply rotations
                this.plant.rotation.y = this.rotationY;
                this.plant.rotation.x = this.rotationX;
                
                previousMouseX = e.clientX;
                previousMouseY = e.clientY;
            }
        });

        canvas.addEventListener('mouseup', () => {
            isDragging = false;
            canvas.style.cursor = 'grab';
            setTimeout(() => {
                this.isRotating = false;
            }, 100);
        });

        canvas.addEventListener('mouseleave', () => {
            if (isDragging) {
                isDragging = false;
                canvas.style.cursor = 'grab';
                this.isRotating = false;
            }
        });

        // Touch support with multi-axis rotation
        canvas.addEventListener('touchstart', (e) => {
            if (e.touches.length === 1) {
                isDragging = true;
                previousMouseX = e.touches[0].clientX;
                previousMouseY = e.touches[0].clientY;
                this.isRotating = true;
            }
        });

        canvas.addEventListener('touchmove', (e) => {
            if (isDragging && this.plant && e.touches.length === 1) {
                e.preventDefault();
                const deltaX = e.touches[0].clientX - previousMouseX;
                const deltaY = e.touches[0].clientY - previousMouseY;
                
                this.rotationY += deltaX * 0.01;
                this.rotationX -= deltaY * 0.01;
                this.rotationX = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.rotationX));
                
                this.plant.rotation.y = this.rotationY;
                this.plant.rotation.x = this.rotationX;
                
                previousMouseX = e.touches[0].clientX;
                previousMouseY = e.touches[0].clientY;
            }
        }, { passive: false });

        canvas.addEventListener('touchend', () => {
            isDragging = false;
            setTimeout(() => {
                this.isRotating = false;
            }, 100);
        });
        
        // Set cursor style
        canvas.style.cursor = 'grab';
    }

    createPlant(streak) {
        // Save current rotation before removing old plant
        let savedRotationX = this.rotationX || 0;
        let savedRotationY = this.rotationY || 0;
        
        // Remove old plant if exists
        if (this.plant) {
            savedRotationX = this.plant.rotation.x;
            savedRotationY = this.plant.rotation.y;
            this.scene.remove(this.plant);
        }

        // Determine growth stage
        const stage = this.getGrowthStage(streak);
        
        // Create plant group
        this.plant = new THREE.Group();
        
        // Restore rotation
        this.plant.rotation.x = savedRotationX;
        this.plant.rotation.y = savedRotationY;
        this.rotationX = savedRotationX;
        this.rotationY = savedRotationY;

        // Create pot
        this.createPot();

        // Create plant based on stage
        switch(stage) {
            case 0: this.createSeed(); break;
            case 1: this.createSprout(); break;
            case 2: this.createYoungPlant(); break;
            case 3: this.createMaturePlant(); break;
            case 4: this.createLargePlant(); break;
            case 5: this.createBuddingPlant(); break;
            case 6: this.createBloomingPlant(); break;
        }

        this.scene.add(this.plant);
    }

    getGrowthStage(streak) {
        if (streak === 0) return 0;      // Seed
        if (streak <= 3) return 1;        // Sprout
        if (streak <= 7) return 2;        // Young
        if (streak <= 14) return 3;       // Mature
        if (streak <= 29) return 4;       // Large
        if (streak <= 59) return 5;       // Budding
        return 6;                         // Blooming
    }

    createPot() {
        const potGeometry = new THREE.CylinderGeometry(0.6, 0.5, 0.7, 16);
        const potMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B4513,
            roughness: 0.8 
        });
        const pot = new THREE.Mesh(potGeometry, potMaterial);
        pot.position.y = 0.35;
        this.plant.add(pot);

        // Soil
        const soilGeometry = new THREE.CylinderGeometry(0.55, 0.55, 0.1, 16);
        const soilMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x3d2817,
            roughness: 1 
        });
        const soil = new THREE.Mesh(soilGeometry, soilMaterial);
        soil.position.y = 0.7;
        this.plant.add(soil);
    }

    createSeed() {
        const seedGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const seedMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x8B7355,
            roughness: 0.9 
        });
        const seed = new THREE.Mesh(seedGeometry, seedMaterial);
        seed.position.y = 0.8;
        this.plant.add(seed);
    }

    createSprout() {
        // Small stem
        const stemGeometry = new THREE.CylinderGeometry(0.03, 0.03, 0.3, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x90EE90,
            roughness: 0.6 
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 0.85;
        this.plant.add(stem);

        // Tiny leaf
        this.createLeaf(0, 1.0, 0, 0.15);
    }

    createYoungPlant() {
        // Stem
        const stemGeometry = new THREE.CylinderGeometry(0.04, 0.04, 0.8, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.6 
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 1.1;
        this.plant.add(stem);

        // 2 leaves
        this.createLeaf(0.2, 1.2, 0, 0.25);
        this.createLeaf(-0.2, 1.3, Math.PI, 0.25);
    }

    createMaturePlant() {
        // Thicker stem
        const stemGeometry = new THREE.CylinderGeometry(0.05, 0.05, 1.2, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.6 
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 1.3;
        this.plant.add(stem);

        // 4 leaves
        this.createLeaf(0.25, 1.4, 0, 0.3);
        this.createLeaf(-0.25, 1.5, Math.PI, 0.3);
        this.createLeaf(0.2, 1.7, Math.PI/2, 0.3);
        this.createLeaf(-0.2, 1.8, -Math.PI/2, 0.3);
    }

    createLargePlant() {
        // Tall stem
        const stemGeometry = new THREE.CylinderGeometry(0.06, 0.06, 1.6, 8);
        const stemMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x228B22,
            roughness: 0.6 
        });
        const stem = new THREE.Mesh(stemGeometry, stemMaterial);
        stem.position.y = 1.5;
        this.plant.add(stem);

        // 6 leaves
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const x = Math.cos(angle) * 0.3;
            const z = Math.sin(angle) * 0.3;
            const y = 1.4 + i * 0.15;
            this.createLeaf(x, y, angle, 0.35);
        }
    }

    createBuddingPlant() {
        // Same as large plant
        this.createLargePlant();

        // Add small buds
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const x = Math.cos(angle) * 0.25;
            const z = Math.sin(angle) * 0.25;
            this.createBud(x, 2.1 + i * 0.1, z);
        }
    }

    createBloomingPlant() {
        // Same as large plant
        this.createLargePlant();

        // Add flowers
        for (let i = 0; i < 3; i++) {
            const angle = (i / 3) * Math.PI * 2;
            const x = Math.cos(angle) * 0.25;
            const z = Math.sin(angle) * 0.25;
            this.createFlower(x, 2.1 + i * 0.1, z);
        }
    }

    createLeaf(x, y, rotation, scale = 0.3) {
        const leafShape = new THREE.Shape();
        leafShape.moveTo(0, 0);
        leafShape.quadraticCurveTo(0.5, 0.3, 1, 0);
        leafShape.quadraticCurveTo(0.5, -0.3, 0, 0);

        const leafGeometry = new THREE.ShapeGeometry(leafShape);
        const leafMaterial = new THREE.MeshStandardMaterial({ 
            color: 0x32CD32,
            roughness: 0.7,
            side: THREE.DoubleSide
        });
        const leaf = new THREE.Mesh(leafGeometry, leafMaterial);
        leaf.scale.set(scale, scale, scale);
        leaf.position.set(x, y, 0);
        leaf.rotation.y = rotation;
        leaf.rotation.x = Math.PI / 4;
        this.plant.add(leaf);
    }

    createBud(x, y, z) {
        const budGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const budMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFB6C1,
            roughness: 0.5 
        });
        const bud = new THREE.Mesh(budGeometry, budMaterial);
        bud.position.set(x, y, z);
        bud.scale.set(1, 1.3, 1);
        this.plant.add(bud);
    }

    createFlower(x, y, z) {
        const flowerGroup = new THREE.Group();
        
        // Center
        const centerGeometry = new THREE.SphereGeometry(0.05, 8, 8);
        const centerMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFFD700 
        });
        const center = new THREE.Mesh(centerGeometry, centerMaterial);
        flowerGroup.add(center);

        // Petals
        const petalGeometry = new THREE.SphereGeometry(0.08, 8, 8);
        const petalMaterial = new THREE.MeshStandardMaterial({ 
            color: 0xFF69B4,
            roughness: 0.4 
        });
        
        for (let i = 0; i < 5; i++) {
            const angle = (i / 5) * Math.PI * 2;
            const petal = new THREE.Mesh(petalGeometry, petalMaterial);
            petal.position.x = Math.cos(angle) * 0.1;
            petal.position.z = Math.sin(angle) * 0.1;
            petal.scale.set(0.8, 1, 0.5);
            flowerGroup.add(petal);
        }

        flowerGroup.position.set(x, y, z);
        this.plant.add(flowerGroup);
    }

    animate() {
        this.animationId = requestAnimationFrame(() => this.animate());

        // Gentle idle rotation if not being dragged
        if (this.plant && !this.isRotating) {
            // Only add gentle rotation, don't override user rotation
            this.rotationY += 0.002;
            this.plant.rotation.y = this.rotationY;
        }

        // Gentle floating animation
        if (this.plant) {
            this.plant.position.y = Math.sin(Date.now() * 0.001) * 0.05;
        }

        this.renderer.render(this.scene, this.camera);
    }

    updateStreak(newStreak) {
        this.streak = newStreak;
        this.createPlant(newStreak);
    }

    onResize() {
        const container = document.getElementById(this.containerId);
        if (!container) return;

        const width = container.clientWidth;
        const height = container.clientHeight;

        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(width, height);
    }

    destroy() {
        if (this.animationId) {
            cancelAnimationFrame(this.animationId);
        }
        if (this.renderer) {
            this.renderer.dispose();
        }
    }
}

// Export for global access
window.Plant3D = Plant3D;

// Auto-initialize plant when this script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(() => {
            if (typeof window.initPlant === 'function') {
                window.initPlant();
            }
        }, 300);
    });
} else {
    setTimeout(() => {
        if (typeof window.initPlant === 'function') {
            window.initPlant();
        }
    }, 300);
}

// ================================
// DEMO MODE - Cycle through growth stages
// ================================
let demoMode = false;
let demoStage = 0;

function initDemoMode() {
    const demoBtn = document.getElementById('plantDemoBtn');
    const plantSection = document.querySelector('.plant-section');
    
    if (!demoBtn) return;
    
    demoBtn.addEventListener('click', () => {
        demoMode = !demoMode;
        
        if (demoMode) {
            // Initialize demo stage to current plant stage
            const currentStreak = window.streakData?.overall || 0;
            if (window.plant3D) {
                demoStage = window.plant3D.getGrowthStage(currentStreak);
            }
            
            plantSection.classList.add('demo-mode');
            demoBtn.textContent = '⏹️';
            demoBtn.title = 'Exit demo mode';
            showDemoControls();
            updateDemoStageDisplay(); // Show current stage immediately
        } else {
            plantSection.classList.remove('demo-mode');
            demoBtn.textContent = '🎮';
            demoBtn.title = 'Demo mode';
            hideDemoControls();
            
            // Reset to actual streak
            const actualStreak = window.streakData?.overall || 0;
            console.log('🔙 Exiting demo mode, resetting to streak:', actualStreak);
            
            if (window.plant3D) {
                window.plant3D.updateStreak(actualStreak);
                console.log('✅ Plant reset to actual streak:', actualStreak);
            }
            
            if (typeof window.updatePlantStageLabel === 'function') {
                window.updatePlantStageLabel(actualStreak);
                console.log('✅ Label reset to actual streak:', actualStreak);
            }
            
            // Reset demo stage
            demoStage = 0;
        }
    });
    
    // Keyboard shortcuts for demo mode
    document.addEventListener('keydown', (e) => {
        if (!demoMode) return;
        
        if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
            e.preventDefault();
            nextDemoStage();
        } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
            e.preventDefault();
            previousDemoStage();
        }
    });
}

function showDemoControls() {
    const instructions = document.querySelector('.plant-instructions');
    if (!instructions) return;
    
    const controls = document.createElement('div');
    controls.className = 'demo-controls';
    controls.innerHTML = `
        <button class="demo-nav-btn" id="demoPrev" title="Previous stage">◀</button>
        <span class="demo-stage-info">Stage: <span id="demoStageNum">0</span>/6</span>
        <button class="demo-nav-btn" id="demoNext" title="Next stage">▶</button>
        <span style="font-size: 0.7rem; opacity: 0.7; margin-left: 8px;">Arrow keys work too!</span>
    `;
    instructions.appendChild(controls);
    
    document.getElementById('demoPrev').addEventListener('click', previousDemoStage);
    document.getElementById('demoNext').addEventListener('click', nextDemoStage);
    
    updateDemoStageDisplay();
}

function hideDemoControls() {
    const controls = document.querySelector('.demo-controls');
    if (controls) controls.remove();
}

function nextDemoStage() {
    demoStage = Math.min(6, demoStage + 1);
    updateDemoPlant();
}

function previousDemoStage() {
    demoStage = Math.max(0, demoStage - 1);
    updateDemoPlant();
}

function updateDemoPlant() {
    // Convert stage to streak equivalent
    const streakMap = [0, 2, 5, 10, 20, 40, 70];
    const demoStreak = streakMap[demoStage];
    
    console.log('🎮 Demo mode update:', { demoStage, demoStreak, hasPlant3D: !!window.plant3D });
    
    if (window.plant3D) {
        window.plant3D.updateStreak(demoStreak);
        console.log('✅ Plant updated to streak:', demoStreak);
    } else {
        console.error('❌ window.plant3D not found!');
    }
    
    if (typeof window.updatePlantStageLabel === 'function') {
        window.updatePlantStageLabel(demoStreak);
        console.log('✅ Label updated to streak:', demoStreak);
    } else {
        console.error('❌ window.updatePlantStageLabel not found!');
    }
    
    updateDemoStageDisplay();
}

function updateDemoStageDisplay() {
    const stageNum = document.getElementById('demoStageNum');
    if (stageNum) {
        stageNum.textContent = demoStage;
    }
}

// Initialize demo mode when this script loads
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initDemoMode, 500);
    });
} else {
    setTimeout(initDemoMode, 500);
}