import React from 'react';
import { 
  MousePointer, 
  Square, 
  Circle, 
  Minus, 
  ArrowUp, 
  Pencil,
  Undo2,
  Redo2,
  Trash2,
  Palette,
  Sliders
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import './Toolbar.css'; // This import is correct

const Toolbar = ({ 
  tool, 
  setTool, 
  color, 
  setColor, 
  strokeWidth, 
  setStrokeWidth,
  onUndo,
  onRedo,
  onClear,
  canUndo,
  canRedo
}) => {
  const [showColorPicker, setShowColorPicker] = React.useState(false);

  const tools = [
    { id: 'selection', icon: MousePointer, label: 'Select (V)' },
    { id: 'rectangle', icon: Square, label: 'Rectangle (R)' },
    { id: 'ellipse', icon: Circle, label: 'Ellipse (E)' },
    { id: 'line', icon: Minus, label: 'Line (L)' },
    { id: 'arrow', icon: ArrowUp, label: 'Arrow (A)' },
    { id: 'freehand', icon: Pencil, label: 'Freehand (F)' }
  ];

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      
      switch(e.key.toLowerCase()) {
        case 'v': setTool('selection'); break;
        case 'r': setTool('rectangle'); break;
        case 'e': setTool('ellipse'); break;
        case 'l': setTool('line'); break;
        case 'a': setTool('arrow'); break;
        case 'f': setTool('freehand'); break;
        case 'z': if (e.ctrlKey || e.metaKey) { e.preventDefault(); onUndo(); } break;
        case 'y': if (e.ctrlKey || e.metaKey) { e.preventDefault(); onRedo(); } break;
        default: break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setTool, onUndo, onRedo]);

  return (
    <div className="toolbar">
      <div className="toolbar-group">
        {tools.map(t => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              className={`tool-button ${tool === t.id ? 'active' : ''}`}
              onClick={() => setTool(t.id)}
              title={t.label}
            >
              <Icon size={20} />
            </button>
          );
        })}
      </div>

      <div className="toolbar-group">
        <div className="color-picker-wrapper">
          <button 
            className="tool-button color-button"
            onClick={() => setShowColorPicker(!showColorPicker)}
            style={{ backgroundColor: color }}
            title="Change Color"
          />
          {showColorPicker && (
            <div className="color-picker-popup">
              <HexColorPicker color={color} onChange={setColor} />
            </div>
          )}
        </div>

        <div className="stroke-control">
          <Sliders size={16} />
          <input
            type="range"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value))}
            className="stroke-slider"
            title="Stroke Width"
          />
          <span className="stroke-value">{strokeWidth}px</span>
        </div>
      </div>

      <div className="toolbar-group">
        <button 
          className="action-button" 
          onClick={onUndo} 
          disabled={!canUndo}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 size={18} />
        </button>
        <button 
          className="action-button" 
          onClick={onRedo} 
          disabled={!canRedo}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 size={18} />
        </button>
        <button 
          className="action-button clear-button" 
          onClick={onClear}
          title="Clear Canvas"
        >
          <Trash2 size={18} />
        </button>
      </div>
    </div>
  );
};

export default Toolbar;