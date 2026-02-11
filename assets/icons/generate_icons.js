// This is a Node.js script to generate icons using Canvas
const { createCanvas } = require('canvas');
const fs = require('fs');

const sizes = [16, 48, 128];

function generateIcon(size) {
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');
    
    // Background circle
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2, 0, Math.PI * 2);
    ctx.fillStyle = '#4285f4'; // Google Blue
    ctx.fill();
    
    // Clock design
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/2.4, 0, Math.PI * 2);
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size/16;
    ctx.stroke();
    
    // Clock hands
    // Hour hand (pointing to 2)
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2 + size/4 * Math.cos(Math.PI/6 * 2), 
               size/2 + size/4 * Math.sin(Math.PI/6 * 2));
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size/12;
    ctx.stroke();
    
    // Minute hand (pointing to 10)
    ctx.beginPath();
    ctx.moveTo(size/2, size/2);
    ctx.lineTo(size/2 + size/3 * Math.cos(Math.PI/6 * 10), 
               size/2 + size/3 * Math.sin(Math.PI/6 * 10));
    ctx.strokeStyle = 'white';
    ctx.lineWidth = size/16;
    ctx.stroke();
    
    // Small dot in center
    ctx.beginPath();
    ctx.arc(size/2, size/2, size/16, 0, Math.PI * 2);
    ctx.fillStyle = 'white';
    ctx.fill();
    
    // Save the icon
    const buffer = canvas.toBuffer('image/png');
    fs.writeFileSync(`icon${size}.png`, buffer);
}

// Generate icons for all sizes
sizes.forEach(size => generateIcon(size)); 