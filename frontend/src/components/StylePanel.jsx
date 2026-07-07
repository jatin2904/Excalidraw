import useBoardStore from '../store/boardStore';
import './StylePanel.css';

const STROKE_WIDTHS = [1, 2, 4, 6, 8];
const FONT_FAMILIES = ['sans-serif', 'serif', 'monospace', 'Georgia', 'Courier New'];
const PRESET_COLORS = [
  '#000000', '#343a40', '#495057', '#c92a2a', '#e67700',
  '#2b8a3e', '#1864ab', '#5f3dc4', '#d6336c', '#ffffff',
];

export default function StylePanel() {
  const selectedIds = useBoardStore((s) => s.selectedIds);
  const elements = useBoardStore((s) => s.elements);
  const updateElementStyle = useBoardStore((s) => s.updateElementStyle);
  const pushHistory = useBoardStore((s) => s.pushHistory);

  if (selectedIds.length === 0) return null;

  // Get current style from first selected element
  const firstSelected = elements.find((el) => selectedIds.includes(el.id));
  if (!firstSelected) return null;

  const hasText = elements.some(
    (el) => selectedIds.includes(el.id) && el.type === 'text'
  );

  const handleChange = (prop, value) => {
    updateElementStyle(selectedIds, { [prop]: value });
    pushHistory();
  };

  return (
    <div className="style-panel">
      <div className="style-section">
        <label className="style-label">Stroke</label>
        <div className="color-row">
          {PRESET_COLORS.map((color) => (
            <button
              key={`stroke-${color}`}
              className={`color-swatch ${firstSelected.strokeColor === color ? 'active' : ''}`}
              style={{ background: color }}
              onClick={() => handleChange('strokeColor', color)}
            />
          ))}
        </div>
        <input
          type="color"
          value={firstSelected.strokeColor || '#000000'}
          onChange={(e) => handleChange('strokeColor', e.target.value)}
          className="color-input"
        />
      </div>

      <div className="style-section">
        <label className="style-label">Fill</label>
        <div className="color-row">
          <button
            className={`color-swatch transparent-swatch ${firstSelected.fillColor === 'transparent' ? 'active' : ''}`}
            onClick={() => handleChange('fillColor', 'transparent')}
            title="No fill"
          />
          {PRESET_COLORS.filter((c) => c !== '#ffffff').map((color) => (
            <button
              key={`fill-${color}`}
              className={`color-swatch ${firstSelected.fillColor === color ? 'active' : ''}`}
              style={{ background: color }}
              onClick={() => handleChange('fillColor', color)}
            />
          ))}
        </div>
        <input
          type="color"
          value={firstSelected.fillColor === 'transparent' ? '#ffffff' : firstSelected.fillColor || '#ffffff'}
          onChange={(e) => handleChange('fillColor', e.target.value)}
          className="color-input"
        />
      </div>

      <div className="style-section">
        <label className="style-label">Stroke width</label>
        <div className="width-row">
          {STROKE_WIDTHS.map((w) => (
            <button
              key={w}
              className={`width-btn ${firstSelected.strokeWidth === w ? 'active' : ''}`}
              onClick={() => handleChange('strokeWidth', w)}
            >
              {w}
            </button>
          ))}
        </div>
      </div>

      <div className="style-section">
        <label className="style-label">Opacity</label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.05"
          value={firstSelected.opacity ?? 1}
          onChange={(e) => handleChange('opacity', parseFloat(e.target.value))}
          className="opacity-slider"
        />
        <span className="opacity-value">
          {Math.round((firstSelected.opacity ?? 1) * 100)}%
        </span>
      </div>

      {hasText && (
        <>
          <div className="style-section">
            <label className="style-label">Font size</label>
            <input
              type="number"
              min="8"
              max="200"
              value={firstSelected.fontSize || 20}
              onChange={(e) =>
                handleChange('fontSize', parseInt(e.target.value) || 20)
              }
              className="font-size-input"
            />
          </div>

          <div className="style-section">
            <label className="style-label">Font family</label>
            <select
              value={firstSelected.fontFamily || 'sans-serif'}
              onChange={(e) => handleChange('fontFamily', e.target.value)}
              className="font-select"
            >
              {FONT_FAMILIES.map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>
          </div>
        </>
      )}
    </div>
  );
}
