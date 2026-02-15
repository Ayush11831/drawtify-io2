import React, { useState } from 'react';
import { X, Download, Image, FileJson, FileCode } from 'lucide-react';
import './ExportModal.css';

const ExportModal = ({ onClose, onExport, canvasRef }) => {
  const [format, setFormat] = useState('png');
  const [quality, setQuality] = useState(1);
  const [filename, setFilename] = useState(`drawtify-${new Date().toISOString().slice(0,10)}`);

  const formats = [
    { id: 'png', icon: Image, label: 'PNG', description: 'High quality raster image' },
    { id: 'svg', icon: FileCode, label: 'SVG', description: 'Scalable vector graphics' },
    { id: 'json', icon: FileJson, label: 'JSON', description: 'Editable project data' }
  ];

  const handleExport = () => {
    if (format === 'json') {
      // Export as JSON
      const canvas = canvasRef.current;
      if (canvas) {
        // Get elements from canvas ref
        const data = JSON.stringify(canvas.elements, null, 2);
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.download = `${filename}.json`;
        link.href = url;
        link.click();
        URL.revokeObjectURL(url);
      }
    } else {
      onExport(format);
    }
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Export Drawing</h2>
          <button className="close-button" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="modal-body">
          <div className="format-section">
            <label>Format</label>
            <div className="format-grid">
              {formats.map(f => {
                const Icon = f.icon;
                return (
                  <button
                    key={f.id}
                    className={`format-card ${format === f.id ? 'selected' : ''}`}
                    onClick={() => setFormat(f.id)}
                  >
                    <Icon size={24} />
                    <span className="format-name">{f.label}</span>
                    <span className="format-desc">{f.description}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {format === 'png' && (
            <div className="quality-section">
              <label>Quality</label>
              <input
                type="range"
                min="0.1"
                max="1"
                step="0.1"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
              />
              <span className="quality-value">{Math.round(quality * 100)}%</span>
            </div>
          )}

          <div className="filename-section">
            <label>Filename</label>
            <input
              type="text"
              value={filename}
              onChange={(e) => setFilename(e.target.value)}
              placeholder="Enter filename"
            />
            <span className="file-extension">.{format}</span>
          </div>
        </div>

        <div className="modal-footer">
          <button className="cancel-button" onClick={onClose}>
            Cancel
          </button>
          <button className="export-button" onClick={handleExport}>
            <Download size={18} />
            Export
          </button>
        </div>
      </div>
    </div>
  );
};

export default ExportModal;