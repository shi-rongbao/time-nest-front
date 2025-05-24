const fs = require('fs');
const { createCanvas } = require('canvas');

// 创建一个32x32的画布
const canvas = createCanvas(32, 32);
const ctx = canvas.getContext('2d');

// 设置背景为透明
ctx.clearRect(0, 0, 32, 32);

// 设置一个蓝色背景圆形
ctx.fillStyle = '#4a90e2';
ctx.beginPath();
ctx.arc(16, 16, 15, 0, Math.PI * 2);
ctx.fill();

// 设置文字样式
ctx.fillStyle = 'white';
ctx.font = 'bold 20px Arial';
ctx.textAlign = 'center';
ctx.textBaseline = 'middle';

// 添加文字 "拾"
ctx.fillText('拾', 16, 16);

// 将画布转换为PNG图像数据
const pngData = canvas.toBuffer('image/png');

// 写入文件
fs.writeFileSync('favicon.png', pngData);

console.log('Favicon generated successfully!'); 