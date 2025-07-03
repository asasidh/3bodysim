document.addEventListener('DOMContentLoaded', () => {
// Constants
const G = 6.67430e-8; // Increased gravitational constant for better visibility
const SCALE = 100; // Scale factor for visualization
const TRAIL_LENGTH = 1000; // Number of points to keep in the trail

// DOM Elements
const canvas = document.getElementById('simulation');
const ctx = canvas.getContext('2d');
const speedControl = document.getElementById('speed');
const startPauseBtn = document.getElementById('startPause');
const resetBtn = document.getElementById('reset');
const sizeControls = document.querySelectorAll('.planet-size');
const massControls = document.querySelectorAll('.planet-mass');

// Canvas dimensions and drag state
let centerX, centerY;
let isDragging = false;
let draggedPlanet = null;
let dragOffsetX = 0;
let dragOffsetY = 0;

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

// Mouse event handlers
canvas.addEventListener('mousedown', handleMouseDown);
canvas.addEventListener('mousemove', handleMouseMove);
canvas.addEventListener('mouseup', handleMouseUp);
canvas.addEventListener('mouseleave', handleMouseUp);

// Touch event handlers for mobile
document.addEventListener('touchstart', handleTouchStart, { passive: false });
document.addEventListener('touchmove', handleTouchMove, { passive: false });
document.addEventListener('touchend', handleTouchEnd);

function getMousePos(canvas, evt) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: evt.clientX - rect.left,
        y: evt.clientY - rect.top
    };
}

function findPlanetAt(x, y) {
    // Convert canvas coordinates to simulation coordinates
    const simX = x - centerX;
    const simY = y - centerY;
    
    // Check each planet to see if the click is within its radius
    for (let i = planets.length - 1; i >= 0; i--) {
        const planet = planets[i];
        const dx = simX - planet.x;
        const dy = simY - planet.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        
        if (distance <= planet.radius * 2) { // Make it easier to grab by doubling the hit area
            return planet;
        }
    }
    return null;
}

function handleMouseDown(e) {
    if (isRunning) return; // Don't allow dragging while simulation is running
    
    const mousePos = getMousePos(canvas, e);
    const planet = findPlanetAt(mousePos.x, mousePos.y);
    
    if (planet) {
        isDragging = true;
        draggedPlanet = planet;
        dragOffsetX = mousePos.x - (planet.x + centerX);
        dragOffsetY = mousePos.y - (planet.y + centerY);
        canvas.style.cursor = 'grabbing';
        e.preventDefault();
    }
}

function handleMouseMove(e) {
    if (!isDragging || !draggedPlanet || isRunning) return;
    
    const mousePos = getMousePos(canvas, e);
    
    // Update planet position
    draggedPlanet.x = mousePos.x - centerX - dragOffsetX;
    draggedPlanet.y = mousePos.y - centerY - dragOffsetY;
    
    // Clear the trail when dragging
    draggedPlanet.trail = [];
    
    // Redraw
    draw();
    e.preventDefault();
}

function handleMouseUp() {
    if (isDragging) {
        isDragging = false;
        draggedPlanet = null;
        canvas.style.cursor = 'default';
    }
}

// Touch event handlers
function handleTouchStart(e) {
    if (isRunning) return;
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousedown', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseDown(mouseEvent);
    e.preventDefault();
}

function handleTouchMove(e) {
    if (!isDragging) return;
    
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent('mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    handleMouseMove(mouseEvent);
    e.preventDefault();
}

function handleTouchEnd() {
    handleMouseUp();
}

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
    // Calculate forces
    const forces = [];
    
    for (let i = 0; i < planets.length; i++) {
        let fx = 0, fy = 0;
        
        for (let j = 0; j < planets.length; j++) {
            if (i === j) continue;
            const { fx: dfx, fy: dfy } = calculateGravity(planets[i], planets[j]);
            fx += dfx;
            fy += dfy;
        }
        
        forces.push({ fx, fy });
    }
    
    // Update velocities and positions
    for (let i = 0; i < planets.length; i++) {
        const planet = planets[i];
        const { fx, fy } = forces[i];
        
        // Update velocity (F = ma, a = F/m)
        // Scale down the deltaTime factor to prevent excessive movement
        planet.vx += (fx / planet.mass) * deltaTime * 100;
        planet.vy += (fy / planet.mass) * deltaTime * 100;
        
        // Update position with scaled velocity
        planet.x += planet.vx * deltaTime * 0.5;
        planet.y += planet.vy * deltaTime * 0.5;
        
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
    planets.forEach(planet => {
        if (planet.trail.length < 2) return;
        
        // Draw gradient trail
        const gradient = ctx.createLinearGradient(
            planet.trail[0].x + centerX, 
            planet.trail[0].y + centerY,
            planet.trail[planet.trail.length - 1].x + centerX,
            planet.trail[planet.trail.length - 1].y + centerY
        );
        
        gradient.addColorStop(0, `${planet.color}00`);
        gradient.addColorStop(0.3, `${planet.color}80`);
        gradient.addColorStop(1, planet.color);
        
        ctx.beginPath();
        ctx.moveTo(planet.trail[0].x + centerX, planet.trail[0].y + centerY);
        
        for (let i = 1; i < planet.trail.length; i++) {
            ctx.lineTo(planet.trail[i].x + centerX, planet.trail[i].y + centerY);
        }
        
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 2;
        ctx.stroke();
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
        console.log('First animation frame');
    }
    
    const deltaTime = (timestamp - lastTimestamp) / 1000; // Convert to seconds
    lastTimestamp = timestamp;
    frameCount++;
    
    // Log FPS every second
    if (timestamp - lastFpsUpdate > 1000) {
        const fps = Math.round((frameCount * 1000) / (timestamp - lastFpsUpdate));
        console.log(`FPS: ${fps}`);
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
        console.log('Frame drawn');
    }
    
    // Continue animation
    if (isRunning) {
        animationId = requestAnimationFrame(animate);
    }
}

// Control event listeners
startPauseBtn.addEventListener('click', () => {
    console.log('Start/Pause button clicked');
    isRunning = !isRunning;
    console.log('isRunning:', isRunning);
    startPauseBtn.textContent = isRunning ? 'Pause' : 'Start';
    
    if (isRunning) {
        console.log('Starting animation...');
        lastTimestamp = 0;
        animationId = requestAnimationFrame(animate);
        console.log('Animation started with ID:', animationId);
    } else if (animationId) {
        console.log('Pausing animation...');
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
    speedControl.value = 1;
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
        if (isRunning) draw();
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
    });
});

// Initial draw
draw();
}); // End of DOMContentLoaded
