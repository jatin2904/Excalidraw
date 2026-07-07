// Convert screen coordinates to world coordinates
export function screenToWorld(screenX, screenY, camera) {
  return {
    x: (screenX - camera.x) / camera.zoom,
    y: (screenY - camera.y) / camera.zoom,
  };
}

// Convert world coordinates to screen coordinates
export function worldToScreen(worldX, worldY, camera) {
  return {
    x: worldX * camera.zoom + camera.x,
    y: worldY * camera.zoom + camera.y,
  };
}
