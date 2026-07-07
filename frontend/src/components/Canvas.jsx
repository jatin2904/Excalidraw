import { useRef, useEffect, useCallback } from 'react';
import useBoardStore from '../store/boardStore';
import { screenToWorld } from '../utils/math';
import { drawElement } from '../utils/drawElement';
import { hitTest, getBoundingBox } from '../utils/hitTest';

const GRID_SIZE = 20;
const MIN_ZOOM = 0.1;
const MAX_ZOOM = 5;
const HANDLE_SIZE = 8;

// Resize handle positions: [xFraction, yFraction]
const HANDLE_POSITIONS = [
  [0, 0], [0.5, 0], [1, 0],
  [0, 0.5],         [1, 0.5],
  [0, 1], [0.5, 1], [1, 1],
];

const HANDLE_CURSORS = [
  'nwse-resize', 'ns-resize', 'nesw-resize',
  'ew-resize',                'ew-resize',
  'nesw-resize', 'ns-resize', 'nwse-resize',
];

export default function Canvas({ socketRef }) {
  const canvasRef = useRef(null);
  const animFrameRef = useRef(null);

  // Interaction state (refs for performance — no re-renders during drag)
  const isPanningRef = useRef(false);
  const isDrawingRef = useRef(false);
  const isDraggingRef = useRef(false);
  const isResizingRef = useRef(false);
  const isSelectingRef = useRef(false); // selection box
  const lastMouseRef = useRef({ x: 0, y: 0 });
  const spaceDownRef = useRef(false);
  const drawingElementRef = useRef(null);
  const dragStartRef = useRef(null); // { startPositions: { id: { x, y } } }
  const resizeRef = useRef(null); // { handleIndex, startBBox, startElements }
  const selectionBoxRef = useRef(null); // { startX, startY, endX, endY }

  // --- Grid ---
  const drawGrid = useCallback((ctx, width, height, cam) => {
    const dotSize = 1.5;
    const topLeft = screenToWorld(0, 0, cam);
    const bottomRight = screenToWorld(width, height, cam);
    const startX = Math.floor(topLeft.x / GRID_SIZE) * GRID_SIZE;
    const startY = Math.floor(topLeft.y / GRID_SIZE) * GRID_SIZE;
    const endX = Math.ceil(bottomRight.x / GRID_SIZE) * GRID_SIZE;
    const endY = Math.ceil(bottomRight.y / GRID_SIZE) * GRID_SIZE;

    ctx.fillStyle = 'rgba(180, 180, 180, 0.4)';
    for (let x = startX; x <= endX; x += GRID_SIZE) {
      for (let y = startY; y <= endY; y += GRID_SIZE) {
        ctx.beginPath();
        ctx.arc(x * cam.zoom + cam.x, y * cam.zoom + cam.y, dotSize, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }, []);

  // --- Draw selection UI ---
  const drawSelectionUI = useCallback((ctx, cam) => {
    const { elements, selectedIds } = useBoardStore.getState();
    if (selectedIds.length === 0) return;

    const selectedEls = elements.filter((el) => selectedIds.includes(el.id));
    if (selectedEls.length === 0) return;

    // Combined bounding box
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of selectedEls) {
      const bb = getBoundingBox(el);
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    }

    // Draw bounding box
    ctx.save();
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1 / cam.zoom;
    ctx.setLineDash([4 / cam.zoom, 4 / cam.zoom]);
    ctx.strokeRect(minX, minY, maxX - minX, maxY - minY);
    ctx.setLineDash([]);

    // Draw handles
    const handleSize = HANDLE_SIZE / cam.zoom;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 1.5 / cam.zoom;
    for (const [fx, fy] of HANDLE_POSITIONS) {
      const hx = minX + (maxX - minX) * fx - handleSize / 2;
      const hy = minY + (maxY - minY) * fy - handleSize / 2;
      ctx.fillRect(hx, hy, handleSize, handleSize);
      ctx.strokeRect(hx, hy, handleSize, handleSize);
    }
    ctx.restore();
  }, []);

  // --- Draw selection rectangle ---
  const drawSelectionBox = useCallback((ctx, cam) => {
    const box = selectionBoxRef.current;
    if (!box) return;

    ctx.save();
    ctx.fillStyle = 'rgba(59, 130, 246, 0.08)';
    ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
    ctx.lineWidth = 1 / cam.zoom;
    const x = Math.min(box.startX, box.endX);
    const y = Math.min(box.startY, box.endY);
    const w = Math.abs(box.endX - box.startX);
    const h = Math.abs(box.endY - box.startY);
    ctx.fillRect(x, y, w, h);
    ctx.strokeRect(x, y, w, h);
    ctx.restore();
  }, []);

  // --- Render loop ---
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    const cam = useBoardStore.getState().camera;
    const elements = useBoardStore.getState().elements;

    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = '#f8f9fa';
    ctx.fillRect(0, 0, width, height);

    drawGrid(ctx, width, height, cam);

    ctx.save();
    ctx.translate(cam.x, cam.y);
    ctx.scale(cam.zoom, cam.zoom);

    for (const el of elements) {
      drawElement(ctx, el);
    }

    // In-progress drawing
    if (drawingElementRef.current) {
      drawElement(ctx, drawingElementRef.current);
    }

    // Selection UI
    drawSelectionUI(ctx, cam);
    drawSelectionBox(ctx, cam);

    ctx.restore();

    animFrameRef.current = requestAnimationFrame(render);
  }, [drawGrid, drawSelectionUI, drawSelectionBox]);

  // --- Resize canvas ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);

  // --- Start render loop ---
  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  // --- Helpers ---
  const generateId = () =>
    Date.now().toString(36) + Math.random().toString(36).substr(2, 9);

  const getWorldPos = (e) => {
    const cam = useBoardStore.getState().camera;
    return screenToWorld(e.clientX, e.clientY, cam);
  };

  const getDefaultStyle = () => ({
    strokeColor: '#000000',
    fillColor: 'transparent',
    strokeWidth: 2,
    opacity: 1,
    fontSize: 20,
    fontFamily: 'sans-serif',
  });

  // Check if a world point is on a resize handle; return handle index or -1
  const getHandleAtPoint = (worldX, worldY) => {
    const { elements, selectedIds } = useBoardStore.getState();
    if (selectedIds.length === 0) return -1;

    const selectedEls = elements.filter((el) => selectedIds.includes(el.id));
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const el of selectedEls) {
      const bb = getBoundingBox(el);
      minX = Math.min(minX, bb.x);
      minY = Math.min(minY, bb.y);
      maxX = Math.max(maxX, bb.x + bb.width);
      maxY = Math.max(maxY, bb.y + bb.height);
    }

    const cam = useBoardStore.getState().camera;
    const handleSize = HANDLE_SIZE / cam.zoom;
    for (let i = 0; i < HANDLE_POSITIONS.length; i++) {
      const [fx, fy] = HANDLE_POSITIONS[i];
      const hx = minX + (maxX - minX) * fx;
      const hy = minY + (maxY - minY) * fy;
      if (
        Math.abs(worldX - hx) < handleSize &&
        Math.abs(worldY - hy) < handleSize
      ) {
        return i;
      }
    }
    return -1;
  };

  // --- Keyboard shortcuts ---
  useEffect(() => {
    const onKeyDown = (e) => {
      // Space for pan
      if (e.code === 'Space' && !e.repeat) {
        e.preventDefault();
        spaceDownRef.current = true;
        document.body.style.cursor = 'grab';
        return;
      }

      const store = useBoardStore.getState();

      // Delete
      if ((e.key === 'Delete' || e.key === 'Backspace') && store.selectedIds.length > 0) {
        // Don't delete if user is typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
        const idsToDelete = [...store.selectedIds];
        store.deleteElements(idsToDelete);
        store.pushHistory();
        if (socketRef?.current) socketRef.current.emit('element:delete', idsToDelete);
        return;
      }

      // Ctrl+A — select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        store.setSelectedIds(store.elements.map((el) => el.id));
        return;
      }

      // Ctrl+D — duplicate
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        if (store.selectedIds.length > 0) {
          store.duplicateElements(store.selectedIds);
          store.pushHistory();
        }
        return;
      }

      // Ctrl+Z — undo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        store.undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y — redo
      if (
        ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) ||
        ((e.ctrlKey || e.metaKey) && e.key === 'y')
      ) {
        e.preventDefault();
        store.redo();
        return;
      }

      // Tool shortcuts
      const toolKeys = {
        v: 'selection', s: 'selection',
        r: 'rectangle',
        o: 'ellipse',
        l: 'line',
        a: 'arrow',
        p: 'pencil',
        t: 'text',
      };
      if (!e.ctrlKey && !e.metaKey && toolKeys[e.key]) {
        store.setTool(toolKeys[e.key]);
      }
    };

    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceDownRef.current = false;
        isPanningRef.current = false;
        document.body.style.cursor = 'default';
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  // --- Mouse handlers ---
  const handleMouseDown = useCallback((e) => {
    // Pan: middle or space+left
    if (e.button === 1 || (e.button === 0 && spaceDownRef.current)) {
      e.preventDefault();
      isPanningRef.current = true;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      document.body.style.cursor = 'grabbing';
      return;
    }

    if (e.button !== 0) return;

    const store = useBoardStore.getState();
    const tool = store.tool;
    const pos = getWorldPos(e);

    // --- Selection mode ---
    if (tool === 'selection') {
      // Check resize handles first
      const handleIdx = getHandleAtPoint(pos.x, pos.y);
      if (handleIdx >= 0) {
        isResizingRef.current = true;
        const selectedEls = store.elements.filter((el) =>
          store.selectedIds.includes(el.id)
        );
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const el of selectedEls) {
          const bb = getBoundingBox(el);
          minX = Math.min(minX, bb.x);
          minY = Math.min(minY, bb.y);
          maxX = Math.max(maxX, bb.x + bb.width);
          maxY = Math.max(maxY, bb.y + bb.height);
        }
        resizeRef.current = {
          handleIndex: handleIdx,
          startBBox: { x: minX, y: minY, width: maxX - minX, height: maxY - minY },
          startElements: JSON.parse(JSON.stringify(selectedEls)),
          startMouse: { x: pos.x, y: pos.y },
        };
        return;
      }

      // Hit-test elements (back to front, topmost wins)
      let hitId = null;
      for (let i = store.elements.length - 1; i >= 0; i--) {
        if (hitTest(pos.x, pos.y, store.elements[i])) {
          hitId = store.elements[i].id;
          break;
        }
      }

      if (hitId) {
        // If clicking on already selected element, keep multi-select
        if (e.shiftKey) {
          const ids = store.selectedIds.includes(hitId)
            ? store.selectedIds.filter((id) => id !== hitId)
            : [...store.selectedIds, hitId];
          store.setSelectedIds(ids);
        } else if (!store.selectedIds.includes(hitId)) {
          store.setSelectedIds([hitId]);
        }

        // Start dragging
        isDraggingRef.current = true;
        dragStartRef.current = {
          mouseStart: { x: pos.x, y: pos.y },
          startPositions: {},
        };
        const ids = store.selectedIds.includes(hitId)
          ? store.selectedIds
          : [hitId];
        for (const id of ids) {
          const el = store.elements.find((e) => e.id === id);
          if (el) dragStartRef.current.startPositions[id] = { x: el.x, y: el.y };
        }
      } else {
        // Clicked on empty — start selection box
        if (!e.shiftKey) store.setSelectedIds([]);
        isSelectingRef.current = true;
        selectionBoxRef.current = {
          startX: pos.x,
          startY: pos.y,
          endX: pos.x,
          endY: pos.y,
        };
      }
      return;
    }

    // --- Text tool ---
    if (tool === 'text') {
      const text = prompt('Enter text:');
      if (text) {
        const textEl = {
          id: generateId(),
          type: 'text',
          x: pos.x,
          y: pos.y,
          width: 0,
          height: 0,
          text,
          ...getDefaultStyle(),
        };
        store.addElement(textEl);
        store.pushHistory();
        if (socketRef?.current) socketRef.current.emit('element:add', textEl);
      }
      return;
    }

    // --- Drawing tools ---
    isDrawingRef.current = true;
    const id = generateId();

    if (tool === 'rectangle' || tool === 'ellipse') {
      drawingElementRef.current = {
        id, type: tool,
        x: pos.x, y: pos.y, width: 0, height: 0,
        ...getDefaultStyle(),
      };
    } else if (tool === 'line' || tool === 'arrow') {
      drawingElementRef.current = {
        id, type: tool,
        x: pos.x, y: pos.y,
        points: [[0, 0], [0, 0]],
        ...getDefaultStyle(),
      };
    } else if (tool === 'pencil') {
      drawingElementRef.current = {
        id, type: 'pencil',
        x: pos.x, y: pos.y,
        points: [[0, 0]],
        ...getDefaultStyle(),
      };
    }
  }, []);

  const handleMouseMove = useCallback((e) => {
    // Panning
    if (isPanningRef.current) {
      const dx = e.clientX - lastMouseRef.current.x;
      const dy = e.clientY - lastMouseRef.current.y;
      lastMouseRef.current = { x: e.clientX, y: e.clientY };
      const cam = useBoardStore.getState().camera;
      useBoardStore.getState().setCamera({ ...cam, x: cam.x + dx, y: cam.y + dy });
      return;
    }

    const pos = getWorldPos(e);

    // Resizing
    if (isResizingRef.current && resizeRef.current) {
      const { handleIndex, startBBox, startElements, startMouse } = resizeRef.current;
      const dx = pos.x - startMouse.x;
      const dy = pos.y - startMouse.y;
      const [fx, fy] = HANDLE_POSITIONS[handleIndex];

      // Calculate new bounding box
      let newX = startBBox.x;
      let newY = startBBox.y;
      let newW = startBBox.width;
      let newH = startBBox.height;

      if (fx === 0) { newX += dx; newW -= dx; }
      else if (fx === 1) { newW += dx; }

      if (fy === 0) { newY += dy; newH -= dy; }
      else if (fy === 1) { newH += dy; }

      // Prevent zero-size
      if (Math.abs(newW) < 2) newW = 2;
      if (Math.abs(newH) < 2) newH = 2;

      // Scale each element relative to original bounding box
      const scaleX = newW / startBBox.width;
      const scaleY = newH / startBBox.height;
      const updates = {};

      for (const el of startElements) {
        const relX = el.x - startBBox.x;
        const relY = el.y - startBBox.y;

        const updated = {
          x: newX + relX * scaleX,
          y: newY + relY * scaleY,
        };

        if (el.type === 'rectangle' || el.type === 'ellipse') {
          updated.width = el.width * scaleX;
          updated.height = el.height * scaleY;
        } else if (el.type === 'line' || el.type === 'arrow') {
          updated.points = el.points.map(([px, py]) => [px * scaleX, py * scaleY]);
        } else if (el.type === 'pencil') {
          updated.points = el.points.map(([px, py]) => [px * scaleX, py * scaleY]);
        } else if (el.type === 'text') {
          updated.fontSize = Math.max(8, (el.fontSize || 20) * Math.abs(scaleY));
        }

        updates[el.id] = updated;
      }

      useBoardStore.getState().updateElements(updates);
      return;
    }

    // Dragging selected elements
    if (isDraggingRef.current && dragStartRef.current) {
      const dx = pos.x - dragStartRef.current.mouseStart.x;
      const dy = pos.y - dragStartRef.current.mouseStart.y;
      const updates = {};
      for (const [id, start] of Object.entries(dragStartRef.current.startPositions)) {
        updates[id] = { x: start.x + dx, y: start.y + dy };
      }
      useBoardStore.getState().updateElements(updates);
      return;
    }

    // Selection box
    if (isSelectingRef.current && selectionBoxRef.current) {
      selectionBoxRef.current = { ...selectionBoxRef.current, endX: pos.x, endY: pos.y };
      return;
    }

    // Drawing
    if (!isDrawingRef.current || !drawingElementRef.current) return;
    const el = drawingElementRef.current;

    if (el.type === 'rectangle' || el.type === 'ellipse') {
      drawingElementRef.current = { ...el, width: pos.x - el.x, height: pos.y - el.y };
    } else if (el.type === 'line' || el.type === 'arrow') {
      drawingElementRef.current = {
        ...el, points: [[0, 0], [pos.x - el.x, pos.y - el.y]],
      };
    } else if (el.type === 'pencil') {
      drawingElementRef.current = {
        ...el, points: [...el.points, [pos.x - el.x, pos.y - el.y]],
      };
    }
  }, []);

  const handleMouseUp = useCallback(() => {
    if (isPanningRef.current) {
      isPanningRef.current = false;
      document.body.style.cursor = spaceDownRef.current ? 'grab' : 'default';
      return;
    }

    // Finish resize
    if (isResizingRef.current) {
      isResizingRef.current = false;
      resizeRef.current = null;
      useBoardStore.getState().pushHistory();
      // Sync full elements state after resize
      if (socketRef?.current) socketRef.current.emit('elements:sync', useBoardStore.getState().elements);
      return;
    }

    // Finish drag
    if (isDraggingRef.current) {
      isDraggingRef.current = false;
      const drag = dragStartRef.current;
      dragStartRef.current = null;
      // Only push history if actually moved
      if (drag) {
        useBoardStore.getState().pushHistory();
        if (socketRef?.current) socketRef.current.emit('elements:sync', useBoardStore.getState().elements);
      }
      return;
    }

    // Finish selection box
    if (isSelectingRef.current) {
      isSelectingRef.current = false;
      const box = selectionBoxRef.current;
      selectionBoxRef.current = null;
      if (box) {
        const bx = Math.min(box.startX, box.endX);
        const by = Math.min(box.startY, box.endY);
        const bw = Math.abs(box.endX - box.startX);
        const bh = Math.abs(box.endY - box.startY);
        if (bw > 2 && bh > 2) {
          const store = useBoardStore.getState();
          const ids = store.elements
            .filter((el) => {
              const bb = getBoundingBox(el);
              return (
                bb.x >= bx && bb.y >= by &&
                bb.x + bb.width <= bx + bw &&
                bb.y + bb.height <= by + bh
              );
            })
            .map((el) => el.id);
          store.setSelectedIds(ids);
        }
      }
      return;
    }

    // Finish drawing
    if (!isDrawingRef.current || !drawingElementRef.current) return;
    const el = drawingElementRef.current;

    const hasSize =
      el.type === 'pencil'
        ? el.points.length > 2
        : el.type === 'line' || el.type === 'arrow'
        ? Math.abs(el.points[1][0]) + Math.abs(el.points[1][1]) > 2
        : Math.abs(el.width) + Math.abs(el.height) > 2;

    if (hasSize) {
      let normalized = { ...el };
      if (
        (el.type === 'rectangle' || el.type === 'ellipse') &&
        (el.width < 0 || el.height < 0)
      ) {
        normalized = {
          ...el,
          x: el.width < 0 ? el.x + el.width : el.x,
          y: el.height < 0 ? el.y + el.height : el.y,
          width: Math.abs(el.width),
          height: Math.abs(el.height),
        };
      }
      useBoardStore.getState().addElement(normalized);
      useBoardStore.getState().pushHistory();
      if (socketRef?.current) socketRef.current.emit('element:add', normalized);
    }

    isDrawingRef.current = false;
    drawingElementRef.current = null;
  }, []);

  // --- Zoom ---
  const handleWheel = useCallback((e) => {
    e.preventDefault();
    const cam = useBoardStore.getState().camera;
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    let newZoom = cam.zoom * zoomFactor;
    newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newZoom));
    const newX = e.clientX - (e.clientX - cam.x) * (newZoom / cam.zoom);
    const newY = e.clientY - (e.clientY - cam.y) * (newZoom / cam.zoom);
    useBoardStore.getState().setCamera({ x: newX, y: newY, zoom: newZoom });
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    return () => canvas.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', position: 'absolute', top: 0, left: 0 }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    />
  );
}
