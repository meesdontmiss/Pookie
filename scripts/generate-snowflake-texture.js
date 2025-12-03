const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas
const size = 128;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Clear canvas with transparent background
ctx.clearRect(0, 0, size, size);

// Function to draw a snowflake
function drawSnowflake() {
  // Set up styles
  ctx.fillStyle = 'white';
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.lineCap = 'round';
  
  // Draw center circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/16, 0, Math.PI * 2);
  ctx.fill();
  
  // Draw six arms
  const armLength = size * 0.4;
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i;
    const startX = size/2;
    const startY = size/2;
    const endX = startX + Math.cos(angle) * armLength;
    const endY = startY + Math.sin(angle) * armLength;
    
    // Draw main arm
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    // Draw branches
    const branchLength = armLength * 0.4;
    const branchStart = 0.5; // Start branches halfway along the arm
    
    for (let j = 0; j < 2; j++) {
      const branchDistance = armLength * (branchStart + j * 0.2);
      const branchX = startX + Math.cos(angle) * branchDistance;
      const branchY = startY + Math.sin(angle) * branchDistance;
      
      // Draw two branches at each point
      for (let k = 0; k < 2; k++) {
        const branchAngle = angle + (Math.PI / 4) * (k === 0 ? 1 : -1);
        const branchEndX = branchX + Math.cos(branchAngle) * branchLength;
        const branchEndY = branchY + Math.sin(branchAngle) * branchLength;
        
        ctx.beginPath();
        ctx.moveTo(branchX, branchY);
        ctx.lineTo(branchEndX, branchEndY);
        ctx.stroke();
      }
    }
  }
  
  // Add some sparkle
  for (let i = 0; i < 10; i++) {
    const sparkleX = size/2 + (Math.random() - 0.5) * size * 0.8;
    const sparkleY = size/2 + (Math.random() - 0.5) * size * 0.8;
    const sparkleSize = 1 + Math.random() * 2;
    
    ctx.beginPath();
    ctx.arc(sparkleX, sparkleY, sparkleSize, 0, Math.PI * 2);
    ctx.fill();
  }
}

// Draw the snowflake
drawSnowflake();

// Add a subtle glow effect
ctx.shadowColor = 'white';
ctx.shadowBlur = 15;
ctx.beginPath();
ctx.arc(size/2, size/2, size/4, 0, Math.PI * 2);
ctx.fill();

// Convert canvas to buffer
const buffer = canvas.toBuffer('image/png', { quality: 1 });

// Save to file
fs.writeFileSync('./public/textures/snowflake.png', buffer);

console.log('Snowflake texture generated and saved to public/textures/snowflake.png'); 