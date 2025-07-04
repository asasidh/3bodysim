document.addEventListener('DOMContentLoaded', () => {
// Constants
const G = 6.67430e-8; // Increased gravitational constant for better visibility
const SCALE = 100; // Scale factor for visualization
const TRAIL_LENGTH = 200; // Shorter trail length

// DOM Elements
const canvas = document.getElementById('simulation');
const ctx = canvas.getContext('2d');
const speedControl = document.getElementById('speed');
const startPauseBtn = document.getElementById('startPause');
const resetBtn = document.getElementById('reset');
const sizeControls = document.querySelectorAll('.planet-size');
const massControls = document.querySelectorAll('.planet-mass');

// Canvas dimensions
let centerX, centerY;

// Set canvas size
function resizeCanvas() {
    const container = canvas.parentElement;
    canvas.width = container.clientWidth;
    canvas.height = Math.min(container.clientWidth * 0.7, 600);
    
    // Update center coordinates
    centerX = canvas.width / 2;
    centerY = canvas.height / 2;
}

// Initialize planets with positions in a triangle
let planets = [
    {
        x: -100,
        y: 0,
        vx: 0,
        vy: -1.5,
        mass: 5e8, // Base mass (will be scaled by sliders)
        radius: 15,
        color: '#4db8ff',
        trail: []
    },
    {
        x: 100,
        y: 0,
        vx: 0,
        vy: 1.5,
        mass: 5e8, // Base mass (will be scaled by sliders)
        radius: 15,
        color: '#ff9f43',
        trail: []
    },
    {
        x: 0,
        y: 173.2,
        vx: 1.8,
        vy: 0,
        mass: 5e8, // Base mass (will be scaled by sliders)
        radius: 15,
        color: '#ffd700',
        trail: []
    }
];

// Simulation state
let isRunning = false;
let animationId = null;
let lastTimestamp = 0;

// Initialize canvas
resizeCanvas();
window.addEventListener('resize', () => {
    resizeCanvas();
    draw();
});

// Physics functions
function calculateGravity(p1, p2) {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);
    
    // Prevent division by zero and extreme forces
    if (dist < 10) return { fx: 0, fy: 0 };
    
    const force = G * p1.mass * p2.mass / distSq;
    const fx = force * dx / dist;
    const fy = force * dy / dist;
    
    return { fx, fy };
}

function updatePlanets(deltaTime) {
    if (!isRunning) return; // Don't update physics if simulation is paused

    // Reset forces
    const forces = planets.map(() => ({ fx: 0, fy: 0 }));

    // Calculate gravitational forces (optimized to avoid redundant calculations)
    for (let i = 0; i < planets.length; i++) {
        for (let j = i + 1; j < planets.length; j++) {
            const p1 = planets[i];
            const p2 = planets[j];
            const { fx, fy } = calculateGravity(p1, p2);

            // Apply forces to both planets (Newton's third law)
            forces[i].fx += fx;
            forces[i].fy += fy;
            forces[j].fx -= fx;
            forces[j].fy -= fy;
        }
    }

    // Update velocities and positions
    for (let i = 0; i < planets.length; i++) {
        const planet = planets[i];
        const { fx, fy } = forces[i];

        // Update velocity (F = ma, a = F/m)
        planet.vx += (fx / planet.mass) * deltaTime * 100;
        planet.vy += (fy / planet.mass) * deltaTime * 100;

        // Update position
        planet.x += planet.vx * deltaTime * 0.5;
        planet.y += planet.vy * deltaTime * 0.5;

        // Boundary collision check
        const simWidth = canvas.width / 2;
        const simHeight = canvas.height / 2;

        if (planet.x + planet.radius > simWidth || planet.x - planet.radius < -simWidth) {
            planet.vx *= -0.9; // Reverse velocity with energy loss
            planet.x = Math.max(-simWidth + planet.radius, Math.min(simWidth - planet.radius, planet.x));
        }
        if (planet.y + planet.radius > simHeight || planet.y - planet.radius < -simHeight) {
            planet.vy *= -0.9; // Reverse velocity with energy loss
            planet.y = Math.max(-simHeight + planet.radius, Math.min(simHeight - planet.radius, planet.y));
        }

        // Add current position to trail
        planet.trail.push({ x: planet.x, y: planet.y });
        if (planet.trail.length > TRAIL_LENGTH) {
            planet.trail.shift();
        }
    }
}

// Drawing functions
function drawBackground() {
    ctx.fillStyle = '#0a0a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw grid
    ctx.strokeStyle = '#1a1a2a';
    ctx.lineWidth = 0.5;
    
    // Vertical lines
    for (let x = 0; x <= canvas.width; x += 40) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    
    // Horizontal lines
    for (let y = 0; y <= canvas.height; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }
}

function drawTrails() {
    const time = Date.now() / 100; // Time factor for twinkling effect

    planets.forEach(planet => {
        if (planet.trail.length < 2) return;

        // Draw sparkling trail
        for (let i = 0; i < planet.trail.length; i++) {
            const point = planet.trail[i];
            const progress = i / planet.trail.length; // 0 for oldest, 1 for newest

            // Pulsating effect using a sine wave
            const pulse = Math.sin(time + i * 0.5) * 0.5 + 0.5;

            // Sparkle properties - size and opacity increase with progress (closer to the planet)
            const size = progress * 2 * pulse + Math.random() * 0.5;
            const opacity = progress * 0.8 * pulse + 0.2;

            // Draw the sparkle with a glow
            // Outer glow
            ctx.beginPath();
            ctx.fillStyle = `${planet.color}${Math.floor(opacity * 100).toString(16)}`; // Fainter glow
            ctx.arc(point.x + centerX, point.y + centerY, size * 2, 0, Math.PI * 2);
            ctx.fill();

            // Inner core
            ctx.beginPath();
            ctx.fillStyle = `${planet.color}${Math.floor(opacity * 255).toString(16)}`; // Brighter core
            ctx.arc(point.x + centerX, point.y + centerY, size, 0, Math.PI * 2);
            ctx.fill();
        }
    });
}

function drawPlanets() {
    // Draw planets in reverse order so the one being dragged is on top
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        if (!planet) continue;
        // Draw glow
        const gradient = ctx.createRadialGradient(
            planet.x + centerX, 
            planet.y + centerY, 
            0,
            planet.x + centerX, 
            planet.y + centerY, 
            planet.radius * 2
        );
        
        gradient.addColorStop(0, planet.color);
        gradient.addColorStop(1, `${planet.color}00`);
        
        // Draw planet
        ctx.beginPath();
        ctx.arc(
            planet.x + centerX, 
            planet.y + centerY, 
            planet.radius, 
            0, 
            Math.PI * 2
        );
        
        // Fill with gradient
        ctx.fillStyle = planet.color;
        ctx.fill();
        
        // Add glow
        ctx.save();
        ctx.shadowColor = planet.color;
        ctx.shadowBlur = 15;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
        ctx.fillStyle = planet.color;
        ctx.fill();
        ctx.restore();
    }
}

function draw() {
    try {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw background
        drawBackground();
        
        // Draw trails
        drawTrails();
        
        // Draw planets
        drawPlanets();
        
        // Draw debug info
        ctx.fillStyle = 'white';
        ctx.font = '14px Arial';
        ctx.fillText(`Planets: ${planets.length}`, 10, 20);
        ctx.fillText(`FPS: ${frameCount}`, 10, 40);
        
        // Draw instructions when not running
        if (!isRunning) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.font = '16px Arial';
            ctx.textAlign = 'center';
            ctx.fillText('Drag planets to reposition them', canvas.width / 2, 30);
            ctx.textAlign = 'left';
        }
        
    } catch (error) {
        console.error('Error in draw function:', error);
    }
}

// Animation loop
let frameCount = 0;
let lastFpsUpdate = 0;

function animate(timestamp) {
    if (!lastTimestamp) {
        lastTimestamp = timestamp;
    }
    
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    lastTimestamp = timestamp;
    frameCount++;
    
    // Log FPS every second
    if (timestamp - lastFpsUpdate > 1000) {
        const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        frameCount = 0;
        lastFpsUpdate = timestamp;
    }
    
    if (isNaN(deltaTime) || deltaTime > 1) {
        console.error('Invalid deltaTime:', deltaTime);
        lastTimestamp = 0; // Reset timestamp to prevent large delta on next frame
        frameCount = 0;
        lastFpsUpdate = timestamp;
    } else {
        // Update physics with speed control
        const speed = parseFloat(speedControl.value);
        updatePlanets(deltaTime * speed);
        
        // Draw everything
        draw();
    }
    
    // Continue animation
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

// Control event listeners
startPauseBtn.addEventListener('click', () => {
    isRunning = !isRunning;
    startPauseBtn.textContent = isRunning ? 'Pause' : 'Start';
    
    if (isRunning) {
        lastTimestamp = 0;
        animationId = requestAnimationFrame(animate);
    } else if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
});

resetBtn.addEventListener('click', () => {
    // Stop animation
    isRunning = false;
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
    
    // Reset planets to initial state
    planets = [
        {
            x: -100,
            y: 0,
            vx: 0,
            vy: -1.5,
            mass: 50,
            radius: 15,
            color: '#4db8ff',
            trail: []
        },
        {
            x: 100,
            y: 0,
            vx: 0,
            vy: 1.5,
            mass: 50,
            radius: 15,
            color: '#ff9f43',
            trail: []
        },
        {
            x: 0,
            y: 173.2,
            vx: 1.8,
            vy: 0,
            mass: 50,
            radius: 15,
            color: '#ffd700',
            trail: []
        }
    ];
    
    // Reset controls
    startPauseBtn.textContent = 'Start';
    speedControl.value = 15; // Restore to initial default value
    sizeControls.forEach((control, i) => {
        control.value = 15;
    });
    massControls.forEach((control, i) => {
        control.value = 50;
    });
    
    // Redraw
    draw();
});

// Update planet properties when sliders change
sizeControls.forEach((control, index) => {
    control.addEventListener('input', (e) => {
        // Scale the radius to be more visible
        planets[index].radius = parseInt(e.target.value);
        // Update the mass proportionally to the cube of the radius (since mass scales with volume)
        const massScale = Math.pow(parseInt(e.target.value) / 15, 3);
        planets[index].mass = 5e8 * massScale;
        // Update the mass slider to reflect the change
        massControls[index].value = Math.min(100, Math.max(1, Math.round(massScale * 50)));
        draw();
    });
});

massControls.forEach((control, index) => {
    control.addEventListener('input', (e) => {
        // Scale the mass value to a reasonable range
        const massValue = parseFloat(e.target.value);
        // Map the slider value (1-100) to a mass range (1e7 to 2e9)
        planets[index].mass = Math.pow(10, 7 + (massValue / 50) * 2);
        // Update the radius based on the cube root of mass
        const radiusScale = Math.pow(planets[index].mass / 5e8, 1/3);
        const newRadius = Math.max(5, Math.min(30, 15 * radiusScale));
        planets[index].radius = newRadius;
        // Update the size slider to reflect the change
        sizeControls[index].value = Math.round(newRadius);
        draw();
    });
});

// Initial draw
draw();
}); // End of DOMContentLoaded
