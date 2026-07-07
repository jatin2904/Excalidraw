import express from 'express';
import Board from '../models/Board.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// All board routes require auth
router.use(auth);

// Create board
router.post('/', async (req, res) => {
  try {
    const board = await Board.create({
      name: req.body.name || 'Untitled Board',
      owner: req.userId,
      elements: [],
    });
    res.status(201).json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// List user's boards
router.get('/', async (req, res) => {
  try {
    const boards = await Board.find({
      $or: [{ owner: req.userId }, { collaborators: req.userId }],
    })
      .select('name owner createdAt updatedAt')
      .sort({ updatedAt: -1 });
    res.json(boards);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Get board
router.get('/:id', async (req, res) => {
  try {
    const board = await Board.findById(req.params.id);
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Update board (save elements)
router.put('/:id', async (req, res) => {
  try {
    const update = {};
    if (req.body.elements !== undefined) update.elements = req.body.elements;
    if (req.body.name !== undefined) update.name = req.body.name;

    const board = await Board.findByIdAndUpdate(req.params.id, update, {
      new: true,
    });
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json(board);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

// Delete board
router.delete('/:id', async (req, res) => {
  try {
    const board = await Board.findOneAndDelete({
      _id: req.params.id,
      owner: req.userId,
    });
    if (!board) return res.status(404).json({ message: 'Board not found' });
    res.json({ message: 'Board deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: err.message });
  }
});

export default router;
