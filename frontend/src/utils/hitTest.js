/**
 * Hit-test: check if a world-coordinate point is on/inside an element.
 */

const HIT_THRESHOLD = 8; // pixels tolerance for lines

export function hitTest(worldX, worldY, element) {
  switch (element.type) {
    case 'rectangle':
      return hitTestRectangle(worldX, worldY, element);
    case 'ellipse':
      return hitTestEllipse(worldX, worldY, element);
    case 'line':
    case 'arrow':
      return hitTestLine(worldX, worldY, element);
    case 'pencil':
      return hitTestPencil(worldX, worldY, element);
    case 'text':
      return hitTestText(worldX, worldY, element);
    default:
      return false;
  }
}

function hitTestRectangle(px, py, el) {
  const x = Math.min(el.x, el.x + el.width);
  const y = Math.min(el.y, el.y + el.height);
  const w = Math.abs(el.width);
  const h = Math.abs(el.height);
  return px >= x && px <= x + w && py >= y && py <= y + h;
}

function hitTestEllipse(px, py, el) {
  const cx = el.x + el.width / 2;
  const cy = el.y + el.height / 2;
  const rx = Math.abs(el.width / 2);
  const ry = Math.abs(el.height / 2);
  if (rx === 0 || ry === 0) return false;
  return ((px - cx) ** 2) / (rx ** 2) + ((py - cy) ** 2) / (ry ** 2) <= 1;
}

function hitTestLine(px, py, el) {
  if (!el.points || el.points.length < 2) return false;
  const ax = el.x + el.points[0][0];
  const ay = el.y + el.points[0][1];
  const bx = el.x + el.points[1][0];
  const by = el.y + el.points[1][1];
  return distToSegment(px, py, ax, ay, bx, by) < HIT_THRESHOLD;
}

function hitTestPencil(px, py, el) {
  if (!el.points || el.points.length < 2) return false;
  for (let i = 0; i < el.points.length - 1; i++) {
    const ax = el.x + el.points[i][0];
    const ay = el.y + el.points[i][1];
    const bx = el.x + el.points[i + 1][0];
    const by = el.y + el.points[i + 1][1];
    if (distToSegment(px, py, ax, ay, bx, by) < HIT_THRESHOLD) return true;
  }
  return false;
}

function hitTestText(px, py, el) {
  const lines = (el.text || '').split('\n');
  const fontSize = el.fontSize || 20;
  const approxWidth = (el.text || '').length * fontSize * 0.6;
  const height = lines.length * fontSize * 1.2;
  return px >= el.x && px <= el.x + approxWidth && py >= el.y && py <= el.y + height;
}

function distToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(px - ax, py - ay);
  let t = ((px - ax) * dx + (py - ay) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const projX = ax + t * dx;
  const projY = ay + t * dy;
  return Math.hypot(px - projX, py - projY);
}

/**
 * Get bounding box for an element in world coordinates.
 */
export function getBoundingBox(element) {
  switch (element.type) {
    case 'rectangle':
    case 'ellipse': {
      const x = Math.min(element.x, element.x + element.width);
      const y = Math.min(element.y, element.y + element.height);
      return {
        x,
        y,
        width: Math.abs(element.width),
        height: Math.abs(element.height),
      };
    }
    case 'line':
    case 'arrow': {
      if (!element.points || element.points.length < 2)
        return { x: element.x, y: element.y, width: 0, height: 0 };
      const xs = element.points.map((p) => element.x + p[0]);
      const ys = element.points.map((p) => element.y + p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    }
    case 'pencil': {
      if (!element.points || element.points.length === 0)
        return { x: element.x, y: element.y, width: 0, height: 0 };
      const xs = element.points.map((p) => element.x + p[0]);
      const ys = element.points.map((p) => element.y + p[1]);
      const minX = Math.min(...xs);
      const minY = Math.min(...ys);
      return {
        x: minX,
        y: minY,
        width: Math.max(...xs) - minX,
        height: Math.max(...ys) - minY,
      };
    }
    case 'text': {
      const fontSize = element.fontSize || 20;
      const lines = (element.text || '').split('\n');
      const maxLen = Math.max(...lines.map((l) => l.length));
      return {
        x: element.x,
        y: element.y,
        width: maxLen * fontSize * 0.6,
        height: lines.length * fontSize * 1.2,
      };
    }
    default:
      return { x: element.x, y: element.y, width: 0, height: 0 };
  }
}
