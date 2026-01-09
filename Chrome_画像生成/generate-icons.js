// アイコン生成スクリプト
// 使用方法: node generate-icons.js

const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 48, 128];

function generateIcon(size) {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // 背景グラデーション
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#6366f1');
  gradient.addColorStop(1, '#8b5cf6');

  // 角丸背景
  const radius = size * 0.2;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fillStyle = gradient;
  ctx.fill();

  // 4つの四角形（図解のシンボル）
  ctx.fillStyle = 'white';
  const padding = size * 0.2;
  const boxSize = (size - padding * 3) / 2;
  const gap = padding;

  // 左上
  ctx.fillRect(padding, padding, boxSize, boxSize);
  // 右上
  ctx.fillRect(padding + boxSize + gap, padding, boxSize, boxSize);
  // 左下
  ctx.fillRect(padding, padding + boxSize + gap, boxSize, boxSize);
  // 右下
  ctx.fillRect(padding + boxSize + gap, padding + boxSize + gap, boxSize, boxSize);

  // 接続線
  ctx.strokeStyle = 'white';
  ctx.lineWidth = size * 0.04;

  // 横線（上）
  ctx.beginPath();
  ctx.moveTo(padding + boxSize, padding + boxSize / 2);
  ctx.lineTo(padding + boxSize + gap, padding + boxSize / 2);
  ctx.stroke();

  // 縦線（左）
  ctx.beginPath();
  ctx.moveTo(padding + boxSize / 2, padding + boxSize);
  ctx.lineTo(padding + boxSize / 2, padding + boxSize + gap);
  ctx.stroke();

  return canvas.toBuffer('image/png');
}

// アイコン生成
sizes.forEach(size => {
  const buffer = generateIcon(size);
  const filename = `icons/icon${size}.png`;
  fs.writeFileSync(filename, buffer);
  console.log(`Generated: ${filename}`);
});

console.log('All icons generated!');
