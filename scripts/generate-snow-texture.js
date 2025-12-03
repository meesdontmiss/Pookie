const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a canvas
const size = 512;
const canvas = createCanvas(size, size);
const ctx = canvas.getContext('2d');

// Fill with white background
ctx.fillStyle = 'white';
ctx.fillRect(0, 0, size, size);

// Add some noise for snow texture
for (let i = 0; i < 5000; i++) {
  const x = Math.random() * size;
  const y = Math.random() * size;
  const radius = Math.random() * 2 + 0.5;
  
  // Vary the color slightly for more realistic snow
  const shade = 220 + Math.floor(Math.random() * 35);
  ctx.fillStyle = `rgb(${shade}, ${shade}, ${shade})`;
  
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Add some subtle blue tint in places
for (let i = 0; i < 1000; i++) {
  const x = Math.random() * size;
  const y = Math.random() * size;
  const radius = Math.random() * 4 + 1;
  
  ctx.fillStyle = 'rgba(200, 220, 255, 0.1)';
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
}

// Convert canvas to buffer
const buffer = canvas.toBuffer('image/jpeg', { quality: 0.9 });

// Save to file
fs.writeFileSync('./public/textures/snow.jpg', buffer);

console.log('Snow texture generated and saved to public/textures/snow.jpg'); 