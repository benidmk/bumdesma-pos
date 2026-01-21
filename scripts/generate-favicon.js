const sharp = require('sharp');
const path = require('path');

async function generateFavicon() {
  const inputPath = path.join(__dirname, '../public/logo.png');
  const outputPath = path.join(__dirname, '../app/favicon.ico');
  
  try {
    await sharp(inputPath)
      .resize(32, 32)
      .toFile(outputPath);
    
    console.log('✅ Favicon created successfully!');
  } catch (error) {
    console.error('Error creating favicon:', error);
  }
}

generateFavicon();
