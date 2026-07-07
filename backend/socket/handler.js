import Board from '../models/Board.js';

export default function setupSocket(io) {
  io.on('connection', (socket) => {
    console.log('Socket connected:', socket.id);

    // Join a board room
    socket.on('join-board', async (boardId) => {
      socket.join(boardId);
      socket.boardId = boardId;
      console.log(`Socket ${socket.id} joined board ${boardId}`);

      // Send current board state
      try {
        const board = await Board.findById(boardId);
        if (board) {
          socket.emit('board:sync', board.elements);
        }
      } catch (err) {
        console.error('Error loading board for sync:', err.message);
      }
    });

    // Element events — broadcast to others in room
    socket.on('element:add', (element) => {
      if (socket.boardId) {
        socket.to(socket.boardId).emit('element:add', element);
      }
    });

    socket.on('element:update', (data) => {
      // data = { id, updates } or { updates: { id: updates, ... } }
      if (socket.boardId) {
        socket.to(socket.boardId).emit('element:update', data);
      }
    });

    socket.on('element:delete', (ids) => {
      if (socket.boardId) {
        socket.to(socket.boardId).emit('element:delete', ids);
      }
    });

    socket.on('elements:sync', (elements) => {
      if (socket.boardId) {
        socket.to(socket.boardId).emit('board:sync', elements);
      }
    });

    // Cursor tracking
    socket.on('cursor:move', (data) => {
      if (socket.boardId) {
        socket.to(socket.boardId).emit('cursor:move', {
          ...data,
          socketId: socket.id,
        });
      }
    });

    socket.on('disconnect', () => {
      if (socket.boardId) {
        socket.to(socket.boardId).emit('cursor:leave', socket.id);
      }
      console.log('Socket disconnected:', socket.id);
    });
  });
}
