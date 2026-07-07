import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useBoardStore from '../store/boardStore';

const SOCKET_URL = 'http://localhost:3001';

export default function useSocket(boardId) {
  const socketRef = useRef(null);

  useEffect(() => {
    if (!boardId) return;

    const socket = io(SOCKET_URL);
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Socket connected');
      socket.emit('join-board', boardId);
    });

    // Receive full board sync (on join)
    socket.on('board:sync', (elements) => {
      useBoardStore.getState().setElements(elements);
      // Reset history with synced elements
      useBoardStore.setState({
        history: [JSON.parse(JSON.stringify(elements))],
        historyIndex: 0,
      });
    });

    // Remote element added
    socket.on('element:add', (element) => {
      const { elements } = useBoardStore.getState();
      if (!elements.find((el) => el.id === element.id)) {
        useBoardStore.setState({ elements: [...elements, element] });
      }
    });

    // Remote element updated
    socket.on('element:update', (data) => {
      if (data.id && data.updates) {
        useBoardStore.getState().updateElement(data.id, data.updates);
      } else if (data.updates) {
        useBoardStore.getState().updateElements(data.updates);
      }
    });

    // Remote element deleted
    socket.on('element:delete', (ids) => {
      useBoardStore.setState((state) => ({
        elements: state.elements.filter((el) => !ids.includes(el.id)),
      }));
    });

    // Remote cursor
    socket.on('cursor:move', (data) => {
      useBoardStore.setState((state) => ({
        remoteCursors: {
          ...state.remoteCursors,
          [data.socketId]: { x: data.x, y: data.y, name: data.name, color: data.color },
        },
      }));
    });

    socket.on('cursor:leave', (socketId) => {
      useBoardStore.setState((state) => {
        const cursors = { ...state.remoteCursors };
        delete cursors[socketId];
        return { remoteCursors: cursors };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [boardId]);

  return socketRef;
}
