const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas
const size = 64;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Clear canvas with transparent background
ctx.clearRect(0, 0, size, size);

// Draw a simple circular snowflake
function drawSimpleSnowflake() {
  // Set up styles
  ctx.fillStyle = 'white';
  
  // Draw main circle
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/4, 0, Math.PI * 2);
  ctx.fill();
  
  // Add a subtle glow effect
  ctx.shadowColor = 'white';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.arc(size/2, size/2, size/6, 0, Math.PI * 2);
  ctx.fill();
}

// Draw the snowflake
drawSimpleSnowflake();

// Convert canvas to buffer
const buffer = canvas.toBuffer('image/png', { quality: 1 });

// Save to file
fs.writeFileSync('./public/textures/simple-snowflake.png', buffer);

console.log('Simple snowflake texture generated and saved to public/textures/simple-snowflake.png'); 