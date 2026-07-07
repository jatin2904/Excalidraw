/**
 * Draw a single element on the canvas.
 * Called from Canvas.jsx render loop with the 2D context already transformed.
 */
export function drawElement(ctx, element) {
  ctx.save();
  ctx.globalAlpha = element.opacity ?? 1;
  ctx.strokeStyle = element.strokeColor || '#000000';
  ctx.fillStyle = element.fillColor || 'transparent';
  ctx.lineWidth = element.strokeWidth || 2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  switch (element.type) {
    case 'rectangle':
      drawRectangle(ctx, element);
      break;
    case 'ellipse':
      drawEllipse(ctx, element);
      break;
    case 'line':
      drawLine(ctx, element);
      break;
    case 'arrow':
      drawArrow(ctx, element);
      break;
    case 'pencil':
      drawPencil(ctx, element);
      break;
    case 'text':
      drawText(ctx, element);
      break;
  }

  ctx.restore();
}

function drawRectangle(ctx, el) {
  const { x, y, width, height } = el;
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fillRect(x, y, width, height);
  }
  ctx.strokeRect(x, y, width, height);
}

function drawEllipse(ctx, el) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = Math.abs(el.width / 2);
  const ry = Math.abs(el.height / 2);

  ctx.beginPath();
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
  if (el.fillColor && el.fillColor !== 'transparent') {
    ctx.fill();
  }
  ctx.stroke();
}

function drawLine(ctx, el) {
  if (!el.points || el.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(el.x + el.points[0][0], el.y + el.points[0][1]);
  ctx.lineTo(el.x + el.points[1][0], el.y + el.points[1][1]);
  ctx.stroke();
}

function drawArrow(ctx, el) {
  if (!el.points || el.points.length < 2) return;
  const startX = el.x + el.points[0][0];
  const startY = el.y + el.points[0][1];
  const endX = el.x + el.points[1][0];
  const endY = el.y + el.points[1][1];

  // Draw line
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  // Draw arrowhead
  const angle = Math.atan2(endY - startY, endX - startX);
  const headLen = Math.max(10, el.strokeWidth * 4);
  ctx.beginPath();
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLen * Math.cos(angle - Math.PI / 6),
    endY - headLen * Math.sin(angle - Math.PI / 6)
  );
  ctx.moveTo(endX, endY);
  ctx.lineTo(
    endX - headLen * Math.cos(angle + Math.PI / 6),
    endY - headLen * Math.sin(angle + Math.PI / 6)
  );
  ctx.stroke();
}

function drawPencil(ctx, el) {
  if (!el.points || el.points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(el.x + el.points[0][0], el.y + el.points[0][1]);

  // Use quadratic curves for smoothness
  if (el.points.length === 2) {
    ctx.lineTo(el.x + el.points[1][0], el.y + el.points[1][1]);
  } else {
    for (let i = 1; i < el.points.length - 1; i++) {
      const cpX = el.x + el.points[i][0];
      const cpY = el.y + el.points[i][1];
      const nextX = el.x + (el.points[i][0] + el.points[i + 1][0]) / 2;
      const nextY = el.y + (el.points[i][1] + el.points[i + 1][1]) / 2;
      ctx.quadraticCurveTo(cpX, cpY, nextX, nextY);
    }
    // Last point
    const last = el.points[el.points.length - 1];
    ctx.lineTo(el.x + last[0], el.y + last[1]);
  }
  ctx.stroke();
}

function drawText(ctx, el) {
  const fontSize = el.fontSize || 20;
  const fontFamily = el.fontFamily || 'sans-serif';
  ctx.font = `${fontSize}px ${fontFamily}`;
  ctx.fillStyle = el.strokeColor || '#000000';
  ctx.textBaseline = 'top';

  const lines = (el.text || '').split('\n');
  lines.forEach((line, i) => {
    ctx.fillText(line, el.x, el.y + i * fontSize * 1.2);
  });
}
