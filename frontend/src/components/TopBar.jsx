import { useNavigate } from 'react-router-dom';
import useBoardStore from '../store/boardStore';
import './TopBar.css';

export default function TopBar({ boardId }) {
  const undo = useBoardStore((s) => s.undo);
  const redo = useBoardStore((s) => s.redo);
  const historyIndex = useBoardStore((s) => s.historyIndex);
  const historyLength = useBoardStore((s) => s.history.length);
  const zoom = useBoardStore((s) => s.camera.zoom);
  const boardName = useBoardStore((s) => s.boardName) || 'Untitled Board';
  const navigate = useNavigate();

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <button className="top-btn" onClick={() => navigate('/')} title="Back to boards">
          ←
        </button>
        <span className="board-name">{boardName}</span>
      </div>
      <div className="top-bar-right">
        <span className="zoom-level">{Math.round(zoom * 100)}%</span>
        <button
          className="top-btn"
          onClick={undo}
          disabled={historyIndex <= 0}
          title="Undo (Ctrl+Z)"
        >
          ↩
        </button>
        <button
          className="top-btn"
          onClick={redo}
          disabled={historyIndex >= historyLength - 1}
          title="Redo (Ctrl+Shift+Z)"
        >
          ↪
        </button>
      </div>
    </div>
  );
}
