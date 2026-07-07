import useBoardStore from '../store/boardStore';
import './CursorOverlay.css';

const CURSOR_COLORS = [
  '#e03131', '#2f9e44', '#1971c2', '#f08c00', '#9c36b5',
  '#0c8599', '#e8590c', '#6741d9',
];

export default function CursorOverlay() {
  const remoteCursors = useBoardStore((s) => s.remoteCursors);
  const camera = useBoardStore((s) => s.camera);

  if (!remoteCursors) return null;

  return (
    <div className="cursor-overlay">
      {Object.entries(remoteCursors).map(([id, cursor]) => {
        // Convert world coords to screen coords
        const screenX = cursor.x * camera.zoom + camera.x;
        const screenY = cursor.y * camera.zoom + camera.y;
        const color = cursor.color || CURSOR_COLORS[id.charCodeAt(0) % CURSOR_COLORS.length];

        return (
          <div
            key={id}
            className="remote-cursor"
            style={{
              left: screenX,
              top: screenY,
              color: color,
            }}
          >
            <svg width="16" height="20" viewBox="0 0 16 20" fill="none">
              <path
                d="M0 0L16 12H6L3 20L0 0Z"
                fill={color}
                stroke="#fff"
                strokeWidth="1"
              />
            </svg>
            {cursor.name && (
              <span className="cursor-name" style={{ background: color }}>
                {cursor.name}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
