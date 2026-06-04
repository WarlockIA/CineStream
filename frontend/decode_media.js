import fs from 'fs';
import { PNG } from 'pngjs';
import jsQR from 'jsqr';

const imagePath = 'C:\\Users\\user\\.gemini\\antigravity-ide\\brain\\eda01f23-b7e2-4afd-bdef-cb0e241d063e\\media__1779588148008.png';

try {
  const buffer = fs.readFileSync(imagePath);
  const png = PNG.sync.read(buffer);

  const decoded = jsQR(new Uint8ClampedArray(png.data), png.width, png.height);
  if (decoded) {
    console.log('--- DECODED QR CONTENT ---');
    console.log(decoded.data);
    console.log('--------------------------');
  } else {
    console.log('jsQR could not decode the image.');
  }
} catch (e) {
  console.error('Error:', e);
}
