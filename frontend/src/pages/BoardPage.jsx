import { useEffect, useRef, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import useBoardStore from '../store/boardStore';
import useAuthStore from '../store/authStore';
import useSocket from '../hooks/useSocket';
import { apiFetch } from '../utils/api';
import { screenToWorld } from '../utils/math';
import Canvas from '../components/Canvas';
import Toolbar from '../components/Toolbar';
import StylePanel from '../components/StylePanel';
import TopBar from '../components/TopBar';
import CursorOverlay from '../components/CursorOverlay';

export default function BoardPage() {
  const { id } = useParams();
  const socketRef = useSocket(id);
  const saveTimerRef = useRef(null);
  const user = useAuthStore((s) => s.user);

  // Load board from API on mount
  useEffect(() => {
    if (!id) return;
    const loadBoard = async () => {
      try {
        const board = await apiFetch(`/boards/${id}`);
        useBoardStore.getState().setElements(board.elements || []);
        useBoardStore.setState({
          history: [JSON.parse(JSON.stringify(board.elements || []))],
          historyIndex: 0,
          boardName: board.name,
        });
      } catch (err) {
        console.error('Failed to load board:', err.message);
      }
    };
    loadBoard();

    // Cleanup on unmount
    return () => {
      useBoardStore.setState({
        elements: [],
        selectedIds: [],
        camera: { x: 0, y: 0, zoom: 1 },
        history: [[]],
        historyIndex: 0,
        remoteCursors: {},
      });
    };
  }, [id]);

  // Auto-save: debounced save on elements change
  useEffect(() => {
    if (!id) return;
    const unsub = useBoardStore.subscribe(
      (state) => state.elements,
      (elements) => {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = setTimeout(async () => {
          try {
            await apiFetch(`/boards/${id}`, {
              method: 'PUT',
              body: JSON.stringify({ elements }),
            });
          } catch (err) {
            console.error('Auto-save failed:', err.message);
          }
        }, 2000);
      }
    );
    return () => {
      unsub();
      clearTimeout(saveTimerRef.current);
    };
  }, [id]);

  // Emit element changes to socket
  useEffect(() => {
    if (!id) return;
    const store = useBoardStore;

    // Monkey-patch store actions to emit socket events
    const origAddElement = store.getState().addElement;
    const origDeleteElements = store.getState().deleteElements;
    const origUpdateElements = store.getState().updateElements;
    const origUpdateElement = store.getState().updateElement;
    const origUpdateElementStyle = store.getState().updateElementStyle;

    // We'll use subscribe instead to avoid monkey-patching
    // On any elements change, we could sync — but for MVP,
    // we'll emit in the Canvas component where we know the specific action
    return () => {};
  }, [id]);

  // Emit cursor position on mouse move
  const handleGlobalMouseMove = useCallback(
    (e) => {
      const socket = socketRef.current;
      if (!socket) return;
      const cam = useBoardStore.getState().camera;
      const world = screenToWorld(e.clientX, e.clientY, cam);
      socket.emit('cursor:move', {
        x: world.x,
        y: world.y,
        name: user?.username || 'Anonymous',
      });
    },
    [user]
  );

  // Throttle cursor emit
  const throttledMouseMove = useRef(null);
  useEffect(() => {
    const handler = (e) => {
      if (throttledMouseMove.current) return;
      throttledMouseMove.current = setTimeout(() => {
        throttledMouseMove.current = null;
      }, 50);
      handleGlobalMouseMove(e);
    };
    window.addEventListener('mousemove', handler);
    return () => window.removeEventListener('mousemove', handler);
  }, [handleGlobalMouseMove]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <Canvas socketRef={socketRef} />
      <CursorOverlay />
      <TopBar boardId={id} />
      <Toolbar />
      <StylePanel />
    </div>
  );
}
