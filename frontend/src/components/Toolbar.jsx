import useBoardStore from '../store/boardStore';
import './Toolbar.css';

const tools = [
  { id: 'selection', label: 'Select', icon: '↖' },
  { id: 'rectangle', label: 'Rectangle', icon: '▭' },
  { id: 'ellipse', label: 'Ellipse', icon: '○' },
  { id: 'line', label: 'Line', icon: '╱' },
  { id: 'arrow', label: 'Arrow', icon: '→' },
  { id: 'pencil', label: 'Pencil', icon: '✎' },
  { id: 'text', label: 'Text', icon: 'T' },
];

export default function Toolbar() {
  const tool = useBoardStore((s) => s.tool);
  const setTool = useBoardStore((s) => s.setTool);

  return (
    <div className="toolbar">
      {tools.map((t) => (
        <button
          key={t.id}
          className={`toolbar-btn ${tool === t.id ? 'active' : ''}`}
          onClick={() => setTool(t.id)}
          title={t.label}
        >
          <span className="toolbar-icon">{t.icon}</span>
        </button>
      ))}
    </div>
  );
}
