const { createCanvas, loadImage } = require('canvas');
const fs = require('fs');

async function generateBattleImage(mob, zoneName) {
  const canvas = createCanvas(800, 450);
  const ctx = canvas.getContext('2d');

  const background = await loadImage(`./assets/zones/${zoneName}.png`);
  ctx.drawImage(background, 0, 0, canvas.width, canvas.height);

  const mobImage = await loadImage(mob.image);
  const mobWidth = 200;
  const mobHeight = 200;
  const x = (canvas.width - mobWidth) / 2;
  const y = (canvas.height - mobHeight) / 2;

  ctx.drawImage(mobImage, x, y, mobWidth, mobHeight);

  const buffer = canvas.toBuffer('image/png');
  const filePath = `./temp/battle_${Date.now()}.png`;
  fs.writeFileSync(filePath, buffer);
  return filePath;
}

module.exports = { generateBattleImage };
