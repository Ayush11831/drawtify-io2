import React, { useState, useCallback, useRef, useEffect } from 'react';
import { Undo2, Redo2, Save, Trash2, PanelLeft, Download, ZoomIn, ZoomOut, Move, Grid3X3, Hand, Circle, Minus, Square } from 'lucide-react';
import './App.css';
import { isPointInRectangle, isPointInEllipse, isPointOnLine } from './utils/drawingUtils';
import Canvas from './components/Canvas';
import Toolbar from './components/Toolbar';
import Sidebar from './components/Sidebar';

function App() {
  const [elements, setElements] = useState([]);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [tool, setTool] = useState('selection');
  const [color, setColor] = useState('#8b5cf6');
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [showSidebar, setShowSidebar] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [showGrid, setShowGrid] = useState(true);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [visibleLayers, setVisibleLayers] = useState({});
  const [panOffset, setPanOffset] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [lastPanPoint, setLastPanPoint] = useState(null);
  const [bgColor, setBgColor] = useState('#1e1e28');
  const [pattern, setPattern] = useState('grid');
  
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const canvasContainerRef = useRef(null);

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

  // Pan handlers
  const startPan = (e) => {
    if (e.button === 1 || tool === 'hand' || (e.ctrlKey && e.button === 0)) {
      e.preventDefault();
      setIsPanning(true);
      setLastPanPoint({ x: e.clientX, y: e.clientY });
    }
  };

  const handlePan = (e) => {
    if (!isPanning || !lastPanPoint) return;
    
    e.preventDefault();
    
    const dx = e.clientX - lastPanPoint.x;
    const dy = e.clientY - lastPanPoint.y;
    
    setPanOffset(prev => ({
      x: prev.x + dx,
      y: prev.y + dy
    }));
    
    setLastPanPoint({ x: e.clientX, y: e.clientY });
  };

  const stopPan = () => {
    setIsPanning(false);
    setLastPanPoint(null);
  };

  // Layer management functions
  const handleElementSelect = (id) => {
    setSelectedElementId(id);
  };

  const handleDeleteElement = (id) => {
    setElements(prev => {
      const newElements = prev.filter(el => el.id !== id);
      return newElements;
    });
    
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

  const handleDeleteAllLayers = () => {
    if (window.confirm('Delete all layers?')) {
      setElements([]);
      setVisibleLayers({});
      setSelectedElementId(null);
    }
  };

  // Filter visible elements for canvas
  const visibleElements = elements.filter(el => visibleLayers[el.id] !== false);

  return (
    <div className="app dark-theme">
      <header className="app-header dark-header">
        <div className="logo-container">
          <svg className="logo-icon" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 8L3 12L7 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M17 8L21 12L17 16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M14 4L10 20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1>Drawtify.io</h1>
          <span className="badge dark-badge">EPICS Project v2.0</span>
        </div>
        
        <div className="header-controls">
          <div className="zoom-controls dark-zoom-controls">
            <button className="icon-button dark-icon-button" onClick={handleZoomOut} title="Zoom Out">
              <ZoomOut size={18} />
            </button>
            <span className="zoom-level dark-text">{Math.round(zoom * 100)}%</span>
            <button className="icon-button dark-icon-button" onClick={handleZoomIn} title="Zoom In">
              <ZoomIn size={18} />
            </button>
            <button className="icon-button dark-icon-button" onClick={handleZoomReset} title="Reset Zoom">
              <Move size={18} />
            </button>
          </div>

          <div className="toolbar-group mini-group">
            <button 
              className={`icon-button dark-icon-button ${bgColor === '#1e1e28' ? 'active' : ''}`} 
              onClick={() => setBgColor('#1e1e28')}
              title="Dark Background"
              style={{ backgroundColor: '#1e1e28', width: '32px', height: '32px', borderRadius: '6px' }}
            />
            <button 
              className={`icon-button dark-icon-button ${bgColor === '#ffffff' ? 'active' : ''}`} 
              onClick={() => setBgColor('#ffffff')}
              title="Light Background"
              style={{ backgroundColor: '#ffffff', width: '32px', height: '32px', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.2)' }}
            />
          </div>

          <div className="toolbar-group mini-group">
            <button 
              className={`icon-button dark-icon-button ${pattern === 'grid' ? 'active' : ''}`} 
              onClick={() => setPattern('grid')}
              title="Grid Pattern"
            >
              <Grid3X3 size={16} />
            </button>
            <button 
              className={`icon-button dark-icon-button ${pattern === 'dots' ? 'active' : ''}`} 
              onClick={() => setPattern('dots')}
              title="Dots Pattern"
            >
              <Circle size={16} />
            </button>
            <button 
              className={`icon-button dark-icon-button ${pattern === 'lines' ? 'active' : ''}`} 
              onClick={() => setPattern('lines')}
              title="Line Pattern"
            >
              <Minus size={16} />
            </button>
            <button 
              className={`icon-button dark-icon-button ${pattern === 'none' ? 'active' : ''}`} 
              onClick={() => setPattern('none')}
              title="No Pattern"
            >
              <Square size={16} />
            </button>
          </div>

          <button 
            className={`icon-button dark-icon-button ${showSidebar ? 'active' : ''}`} 
            onClick={() => setShowSidebar(!showSidebar)} 
            title="Toggle Sidebar"
          >
            <PanelLeft size={18} />
          </button>

          <button className="icon-button dark-icon-button" onClick={() => fileInputRef.current.click()} title="Import">
            <Download size={18} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImport}
            accept=".json"
            style={{ display: 'none' }}
          />

          <button className="icon-button dark-icon-button" onClick={() => handleSave('png')} title="Export PNG">
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
        
        <div 
          ref={canvasContainerRef}
          className="canvas-container dark-canvas-container infinite-canvas"
          style={{ 
            cursor: isPanning ? 'grabbing' : (tool === 'hand' ? 'grab' : 'default'),
            // IMPORTANT: Ensure the container is full width/height and relative
            width: '100%',
            height: '100%',
            position: 'relative',
            overflow: 'hidden'
          }}
          onMouseDown={startPan}
          onMouseMove={handlePan}
          onMouseUp={stopPan}
          onMouseLeave={stopPan}
        >
            {/* FIX: Removed the <div className="canvas-transform-wrapper"> 
                and its CSS transforms. The Canvas component is now a direct
                child and stays fixed in the DOM.
            */}
            <Canvas
              ref={canvasRef}
              elements={visibleElements}
              setElements={handleCanvasUpdate}
              tool={tool}
              color={color}
              strokeWidth={strokeWidth}
              showGrid={showGrid}
              panOffset={panOffset}
              zoom={zoom}
              bgColor={bgColor}
              pattern={pattern}
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
            onDeleteAll={handleDeleteAllLayers}
            selectedElementId={selectedElementId}
            visibleLayers={visibleLayers}
          />
        )}
      </main>

      <div className="status-bar dark-status-bar">
        <div className="status-item">
          <span>Elements: {elements.length}</span>
        </div>
        <div className="status-item">
          <span>Visible: {visibleElements.length}</span>
        </div>
        <div className="status-item">
          <span>Hidden: {elements.length - visibleElements.length}</span>
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
        <div className="status-item">
          <span>Pos: ({Math.round(panOffset.x)}, {Math.round(panOffset.y)})</span>
        </div>
      </div>
    </div>
  );
}

export default App;