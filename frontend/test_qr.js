import fs from 'fs';
import { PNG } from 'pngjs';

const imagePath = 'C:\\Users\\user\\Downloads\\Captura de pantalla (405).png';

try {
  const buffer = fs.readFileSync(imagePath);
  const png = PNG.sync.read(buffer);
  
  const maxX = 592;
  const maxY = 593;
  
  console.log('Bottom-right corner ASCII map (50x50 pixels):');
  for (let y = maxY - 50; y < maxY; y++) {
    let row = '';
    for (let x = maxX - 50; x < maxX; x++) {
      const idx = (y * png.width + x) * 4;
      const r = png.data[idx];
      const g = png.data[idx+1];
      const b = png.data[idx+2];
      
      const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
      row += lum < 150 ? '#' : ' ';
    }
    console.log(row);
  }
} catch (e) {
  console.error(e);
}
