import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Undo2, Redo2, Save, Trash2, PanelLeft, Download, ZoomIn, ZoomOut, Move, Grid3X3 } from 'lucide-react';
import './App.css';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';
// import ExportModal from './components/ExportModal'; // Comment out until ExportModal is created

function App() {
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [tool, setTool] = useState('selection');
  const [color, setColor] = useState('#8b5cf6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showSidebar, setShowSidebar] = useState(true);
  const [showExportModal, setShowExportModal] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [visibleLayers, setVisibleLayers] = useState({});
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  // Auto-save to localStorage
  useEffect(() => {
    const savedElements = localStorage.getItem('drawtify-elements');
    if (savedElements) {
      try {
        const parsed = JSON.parse(savedElements);
        setElements(parsed);
        // Initialize visible layers for all elements
        const initialVisibility = {};
        parsed.forEach(el => {
          if (el.id) {
            initialVisibility[el.id] = el.visible !== false;
          }
        });
        setVisibleLayers(initialVisibility);
      } catch (e) {
        console.error('Failed to load saved drawing');
      }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem('drawtify-elements', JSON.stringify(elements));
  }, [elements]);

  const handleCanvasUpdate = useCallback((newElements) => {
    setElements(newElements);
    // Add to history
    setHistory(prev => [...prev.slice(0, historyIndex + 1), newElements]);
    setHistoryIndex(prev => prev + 1);
  }, [historyIndex]);

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1]);
    }
  };

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1]);
    }
  };

  const handleClearCanvas = () => {
    if (window.confirm('Are you sure you want to clear the canvas?')) {
      setElements([]);
      setHistory([]);
      setHistoryIndex(-1);
      setSelectedElementId(null);
      setVisibleLayers({});
      localStorage.removeItem('drawtify-elements');
    }
  };

  const handleSave = (format = 'png') => {
    const canvas = canvasRef.current?.getCanvas();
    if (canvas) {
      if (format === 'png') {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = `drawtify-drawing-${new Date().toISOString().slice(0,10)}.png`;
        link.href = dataURL;
        link.click();
      }
    }
  };

  const handleImport = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const imported = JSON.parse(e.target.result);
          setElements(imported);
          // Initialize visibility for imported elements
          const initialVisibility = {};
          imported.forEach(el => {
            if (el.id) {
              initialVisibility[el.id] = el.visible !== false;
            }
          });
          setVisibleLayers(initialVisibility);
        } catch (e) {
          alert('Invalid file format');
        }
      };
      reader.readAsText(file);
    }
  };

  const handleZoomIn = () => setZoom(prev => Math.min(prev + 0.1, 3));
  const handleZoomOut = () => setZoom(prev => Math.max(prev - 0.1, 0.5));
  const handleZoomReset = () => setZoom(1);

  // Layer management functions
  const handleElementSelect = (id) => {
    setSelectedElementId(id);
  };

  const handleDeleteElement = (id) => {
    setElements(prev => prev.filter(el => el.id !== id));
    if (selectedElementId === id) {
      setSelectedElementId(null);
    }
    // Remove from visible layers
    setVisibleLayers(prev => {
      const newLayers = { ...prev };
      delete newLayers[id];
      return newLayers;
    });
  };

  const handleDuplicateElement = (id) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const newElement = {
        ...element,
        id: Date.now() + Math.random() + Math.random(),
        x: element.x + 20,
        y: element.y + 20,
        name: `${element.type} Copy`
      };
      setElements(prev => [...prev, newElement]);
      setVisibleLayers(prev => ({ ...prev, [newElement.id]: true }));
    }
  };

  const handleToggleVisibility = (id) => {
    setVisibleLayers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleToggleLock = (id) => {
    setElements(prev => prev.map(el => 
      el.id === id ? { ...el, locked: !el.locked } : el
    ));
  };

  const handleMoveUp = (id) => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1 || index === prev.length - 1) return prev;
      
      const newElements = [...prev];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      return newElements;
    });
  };

  const handleMoveDown = (id) => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1 || index === 0) return prev;
      
      const newElements = [...prev];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      return newElements;
    });
  };

  const handleShowAllLayers = () => {
    const allVisible = {};
    elements.forEach(el => {
      allVisible[el.id] = true;
    });
    setVisibleLayers(allVisible);
  };

  const handleHideAllLayers = () => {
    const allHidden = {};
    elements.forEach(el => {
      allHidden[el.id] = false;
    });
    setVisibleLayers(allHidden);
  };

  // Filter visible elements for canvas
  const visibleElements = elements.filter(el => visibleLayers[el.id] !== false);

  return (
    <div className="app">
      <header className="app-header">
        <div className="logo-container">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 8L3 12L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 8L21 12L17 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 4L10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>Drawtify.io</h1>
          <span className="badge">EPICS Project v2.0</span>
        </div>
        
        <div className="header-controls">
          <div className="zoom-controls">
            <button className="icon-button" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <span className="zoom-level">{Math.round(zoom * 100)}%</span>
            <button className="icon-button" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={18} />
            </button>
            <button className="icon-button" onClick={handleZoomReset} title="Reset Zoom">
              <Move size={18} />
            </button>
          </div>

          <button 
            className={`icon-button ${showGrid ? 'active' : ''}`} 
            onClick={() => setShowGrid(!showGrid)}
            title="Toggle Grid"
          >
            <Grid3X3 size={18} />
          </button>

          <button className="icon-button" onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar">
            <PanelLeft size={18} />
          </button>

          <button className="icon-button" onClick={() => fileInputRef.current.click()} title="Import">
            <Download size={18} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: 'none' }}
          />

          <button className="icon-button" onClick={() => handleSave('png')} title="Export PNG">
            <Save size={18} />
          </button>
        </div>
      </header>

      <main className="app-main">
        <Toolbar
          tool={tool}
          setTool={setTool}
          color={color}
          setColor={setColor}
          strokeWidth={strokeWidth}
          setStrokeWidth={setStrokeWidth}
          onUndo={handleUndo}
          onRedo={handleRedo}
          onClear={handleClearCanvas}
          canUndo={historyIndex > 0}
          canRedo={historyIndex < history.length - 1}
        />
        
        <div className="canvas-container" style={{ transform: `scale(${zoom})` }}>
          <Canvas
            ref={canvasRef}
            elements={visibleElements}
            setElements={handleCanvasUpdate}
            tool={tool}
            color={color}
            strokeWidth={strokeWidth}
            showGrid={showGrid}
          />
        </div>

        {showSidebar && (
          <Sidebar
            elements={elements}
            onClose={() => setShowSidebar(false)}
            onElementSelect={handleElementSelect}
            onDeleteElement={handleDeleteElement}
            onDuplicateElement={handleDuplicateElement}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onMoveUp={handleMoveUp}
            onMoveDown={handleMoveDown}
            onShowAll={handleShowAllLayers}
            onHideAll={handleHideAllLayers}
            selectedElementId={selectedElementId}
            visibleLayers={visibleLayers}
          />
        )}

        {/* {showExportModal && (
          <ExportModal
            onClose={() => setShowExportModal(false)}
            onExport={handleSave}
            canvasRef={canvasRef}
          />
        )} */}
      </main>

      <div className="status-bar">
        <div className="status-item">
          <span>Elements: {elements.length}</span>
        </div>
        <div className="status-item">
          <span>Visible: {visibleElements.length}</span>
        </div>
        <div className="status-item">
          <span>Tool: {tool.charAt(0).toUpperCase() + tool.slice(1)}</span>
        </div>
        <div className="status-item">
          <span>Stroke: {strokeWidth}px</span>
        </div>
        <div className="status-item">
          <span>Zoom: {Math.round(zoom * 100)}%</span>
        </div>
      </div>
    </div>
  );
}

export default App;