// Script to generate the retro cursor PNG file
// This is a Node.js script that can be run with: node scripts/generate-cursor.js

const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas to draw the cursor
const size = 32;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Clear the canvas
ctx.clearRect(0, 0, size, size);

// Draw the cursor shape
ctx.beginPath();
ctx.moveTo(3, 1);
ctx.lineTo(19.7, 1);
ctx.lineTo(8, 28.7);
ctx.lineTo(3, 23.7);
ctx.closePath();

// Fill with blue color
ctx.fillStyle = '#3498db';
ctx.fill();

// Add black outline
ctx.strokeStyle = 'black';
ctx.lineWidth = 1;
ctx.stroke();

// Add white inner highlight
ctx.beginPath();
ctx.moveTo(4, 2);
ctx.lineTo(18, 2);
ctx.lineTo(7.5, 26.5);
ctx.lineTo(3.5, 22.5);
ctx.closePath();
ctx.strokeStyle = 'white';
ctx.lineWidth = 0.5;
ctx.stroke();

// Add pixel art details
ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
ctx.fillRect(4, 4, 2, 2);
ctx.fillRect(10, 8, 2, 2);

// Save the cursor as a PNG file
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync('./public/cursors/retro-cursor.png', buffer);

console.log('Retro cursor PNG generated and saved to public/cursors/retro-cursor.png');

// Also generate a fallback cursor in case the PNG doesn't load
const fallbackCanvas = createCanvas(size, size);
const fallbackCtx = fallbackCanvas.getContext('2d');

// Simple arrow shape for the fallback
fallbackCtx.fillStyle = '#3498db';
fallbackCtx.beginPath();
fallbackCtx.moveTo(0, 0);
fallbackCtx.lineTo(16, 16);
fallbackCtx.lineTo(8, 16);
fallbackCtx.lineTo(16, 24);
fallbackCtx.lineTo(12, 28);
fallbackCtx.lineTo(4, 20);
fallbackCtx.lineTo(4, 28);
fallbackCtx.closePath();
fallbackCtx.fill();
fallbackCtx.strokeStyle = 'black';
fallbackCtx.lineWidth = 1;
fallbackCtx.stroke();

// Save the fallback cursor
const fallbackBuffer = fallbackCanvas.toBuffer('image/png');
fs.writeFileSync('./public/cursors/fallback-cursor.png', fallbackBuffer);

console.log('Fallback cursor PNG generated and saved to public/cursors/fallback-cursor.png'); 