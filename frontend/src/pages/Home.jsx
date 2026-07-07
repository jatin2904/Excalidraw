import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';
import { apiFetch } from '../utils/api';
import './Home.css';

export default function Home() {
  const [boards, setBoards] = useState([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);

  useEffect(() => {
    loadBoards();
  }, []);

  const loadBoards = async () => {
    try {
      const data = await apiFetch('/api/boards');
      setBoards(data);
    } catch (err) {
      console.error('Failed to load boards:', err.message);
    } finally {
      setLoading(false);
    }
  };

  const createBoard = async () => {
    setCreating(true);
    try {
      const board = await apiFetch('/boards', {
        method: 'POST',
        body: JSON.stringify({ name: 'Untitled Board' }),
      });
      navigate(`/board/${board._id}`);
    } catch (err) {
      console.error('Failed to create board:', err.message);
    } finally {
      setCreating(false);
    }
  };

  const deleteBoard = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this board?')) return;
    try {
      await apiFetch(`/boards/${id}`, { method: 'DELETE' });
      setBoards(boards.filter((b) => b._id !== id));
    } catch (err) {
      console.error('Failed to delete board:', err.message);
    }
  };

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-header-left">
          <h1 className="home-logo">⬡ Whiteboard</h1>
        </div>
        <div className="home-header-right">
          <span className="home-user">{user?.username}</span>
          <button className="home-logout" onClick={() => { logout(); navigate('/login'); }}>
            Sign out
          </button>
        </div>
      </header>

      <main className="home-main">
        <div className="home-actions">
          <h2>Your boards</h2>
          <button className="create-btn" onClick={createBoard} disabled={creating}>
            {creating ? 'Creating...' : '+ New Board'}
          </button>
        </div>

        {loading ? (
          <p className="home-loading">Loading boards...</p>
        ) : boards.length === 0 ? (
          <div className="home-empty">
            <p>No boards yet. Create your first board to get started!</p>
          </div>
        ) : (
          <div className="board-grid">
            {boards.map((board) => (
              <div
                key={board._id}
                className="board-card"
                onClick={() => navigate(`/board/${board._id}`)}
              >
                <div className="board-card-preview">
                  <span className="board-card-icon">⬡</span>
                </div>
                <div className="board-card-info">
                  <span className="board-card-name">{board.name}</span>
                  <span className="board-card-date">
                    {new Date(board.updatedAt).toLocaleDateString()}
                  </span>
                </div>
                <button
                  className="board-card-delete"
                  onClick={(e) => deleteBoard(board._id, e)}
                  title="Delete board"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
