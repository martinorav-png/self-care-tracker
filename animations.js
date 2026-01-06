// ================================
// ANIMATION PACK - JAVASCRIPT
// ================================

// ================================
// 1. RIPPLE EFFECT
// ================================
function createRipple(event, element) {
    const ripple = document.createElement('span');
    ripple.classList.add('ripple');
    
    const rect = element.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height);
    const x = event.clientX - rect.left - size / 2;
    const y = event.clientY - rect.top - size / 2;
    
    ripple.style.width = ripple.style.height = size + 'px';
    ripple.style.left = x + 'px';
    ripple.style.top = y + 'px';
    
    element.appendChild(ripple);
    
    setTimeout(() => ripple.remove(), 600);
}

// Add ripple to elements
function addRippleEffect(selector) {
    document.querySelectorAll(selector).forEach(element => {
        if (!element.classList.contains('ripple-container')) {
            element.classList.add('ripple-container');
        }
        
        element.addEventListener('click', (e) => {
            createRipple(e, element);
        });
    });
}

// ================================
// 2. ANIMATED NUMBERS (Count Up)
// ================================
function animateNumber(element, target, duration = 1000) {
    const start = parseInt(element.textContent) || 0;
    const increment = (target - start) / (duration / 16); // 60fps
    let current = start;
    
    element.classList.add('counting');
    
    const timer = setInterval(() => {
        current += increment;
        if ((increment > 0 && current >= target) || (increment < 0 && current <= target)) {
            current = target;
            clearInterval(timer);
            element.classList.remove('counting');
        }
        element.textContent = Math.round(current);
    }, 16);
}

function animateAllNumbers(selector) {
    document.querySelectorAll(selector).forEach(element => {
        const target = parseInt(element.getAttribute('data-target')) || parseInt(element.textContent);
        element.setAttribute('data-target', target);
        element.textContent = '0';
        
        // Animate after a short delay
        setTimeout(() => {
            animateNumber(element, target);
        }, 100);
    });
}

// ================================
// 3. SCROLL ANIMATIONS
// ================================
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -50px 0px'
};

const scrollObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.classList.add('fade-in-up');
            // Optional: stop observing after animation
            // scrollObserver.unobserve(entry.target);
        }
    });
}, observerOptions);

function observeScrollAnimations(selector) {
    document.querySelectorAll(selector).forEach(element => {
        scrollObserver.observe(element);
    });
}

// ================================
// 4. GLASSMORPHISM TOGGLE
// ================================
function enableGlassmorphism(selector) {
    document.querySelectorAll(selector).forEach(element => {
        element.classList.add('glass-effect');
    });
}

function addGlassOverlay() {
    // Add blur overlay to modal-overlay
    const modals = document.querySelectorAll('.modal-overlay');
    modals.forEach(modal => {
        if (!modal.querySelector('.glass-overlay')) {
            const overlay = document.createElement('div');
            overlay.classList.add('glass-overlay');
            modal.insertBefore(overlay, modal.firstChild);
        }
    });
}

// ================================
// 5. SPARKLE EFFECT
// ================================
function createSparkles(element, count = 5) {
    const rect = element.getBoundingClientRect();
    
    for (let i = 0; i < count; i++) {
        const sparkle = document.createElement('span');
        sparkle.classList.add('sparkle');
        
        const x = rect.left + rect.width / 2 + (Math.random() - 0.5) * rect.width;
        const y = rect.top + rect.height / 2 + (Math.random() - 0.5) * rect.height;
        
        sparkle.style.left = x + 'px';
        sparkle.style.top = y + 'px';
        sparkle.style.animationDelay = (Math.random() * 0.3) + 's';
        
        document.body.appendChild(sparkle);
        
        setTimeout(() => sparkle.remove(), 1000);
    }
}

// ================================
// 6. STAGGER ANIMATIONS
// ================================
function staggerAnimation(selector, delay = 100) {
    const elements = document.querySelectorAll(selector);
    elements.forEach((element, index) => {
        const animDelay = index * delay;
        element.style.animationDelay = `${animDelay}ms`;
        element.classList.add('fade-in-up');
        
        // Remove fade-in-up class after animation completes to avoid conflicts
        setTimeout(() => {
            element.classList.remove('fade-in-up');
            element.style.animationDelay = '';
        }, 600 + animDelay); // 600ms animation + delay
    });
}

// ================================
// 7. SMOOTH HOVER EFFECTS
// ================================
function addHoverEffects(selector, effectClass) {
    document.querySelectorAll(selector).forEach(element => {
        element.classList.add(effectClass);
    });
}

// ================================
// 8. PARTICLE BURST
// ================================
function particleBurst(x, y, color = 'var(--color-accent)', count = 12) {
    for (let i = 0; i < count; i++) {
        const particle = document.createElement('div');
        particle.style.position = 'fixed';
        particle.style.left = x + 'px';
        particle.style.top = y + 'px';
        particle.style.width = '6px';
        particle.style.height = '6px';
        particle.style.borderRadius = '50%';
        particle.style.background = color;
        particle.style.pointerEvents = 'none';
        particle.style.zIndex = '10000';
        
        const angle = (Math.PI * 2 * i) / count;
        const velocity = 50 + Math.random() * 50;
        const vx = Math.cos(angle) * velocity;
        const vy = Math.sin(angle) * velocity;
        
        document.body.appendChild(particle);
        
        let currentX = x;
        let currentY = y;
        let opacity = 1;
        
        const animate = () => {
            currentX += vx * 0.016;
            currentY += vy * 0.016 + 2; // gravity
            opacity -= 0.02;
            
            particle.style.left = currentX + 'px';
            particle.style.top = currentY + 'px';
            particle.style.opacity = opacity;
            
            if (opacity > 0) {
                requestAnimationFrame(animate);
            } else {
                particle.remove();
            }
        };
        
        requestAnimationFrame(animate);
    }
}

// ================================
// 9. INITIALIZE ALL ANIMATIONS
// ================================
function initializeAnimations() {
    // Add ripple to all buttons and tasks
    addRippleEffect('.btn, .btn-primary, .btn-secondary, .task-item, .quick-add-btn, .filter-btn');
    
    // Add hover effects
    addHoverEffects('.btn, .btn-primary, .btn-secondary', 'btn-hover-lift');
    // Quick-add buttons already have their own hover animation, skip btn-hover-bounce
    // addHoverEffects('.quick-add-btn', 'btn-hover-bounce');
    addHoverEffects('.header-btn', 'btn-hover-glow');
    
    // DISABLED: Glassmorphism causes blur issues
    // enableGlassmorphism('.modal');
    // addGlassOverlay();
    
    // Observe scroll animations for tasks
    observeScrollAnimations('.task-item');
    
    // Stagger animation for quick add buttons
    staggerAnimation('.quick-add-btn', 80);
    
    // Filter buttons already animate via .filters container, skip stagger
    // staggerAnimation('.filter-btn', 50);
    
    console.log('✨ Animations initialized!');
}

// ================================
// 10. HELPER FUNCTIONS
// ================================

// Animate an element with a specific animation class
function animateElement(element, animationClass, duration = 1000) {
    return new Promise(resolve => {
        element.classList.add(animationClass);
        setTimeout(() => {
            element.classList.remove(animationClass);
            resolve();
        }, duration);
    });
}

// Add shake animation to element (for errors)
function shakeElement(element) {
    animateElement(element, 'shake-animation', 500);
}

// Add pulse animation
function pulseElement(element) {
    element.classList.add('pulse-animation');
    setTimeout(() => {
        element.classList.remove('pulse-animation');
    }, 2000);
}

// ================================
// EXPORT FUNCTIONS
// ================================
window.AnimationPack = {
    createRipple,
    addRippleEffect,
    animateNumber,
    animateAllNumbers,
    createSparkles,
    particleBurst,
    shakeElement,
    pulseElement,
    animateElement,
    staggerAnimation,
    initializeAnimations
};

// Auto-initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAnimations);
} else {
    initializeAnimations();
}