import React, { useState, useEffect } from 'react';
import { 
  X, Layers, Eye, EyeOff, Trash2, Copy, Lock, Unlock, 
  ArrowUp, ArrowDown, Grid, Type, Square, Circle, Minus, 
  ArrowUp as ArrowIcon, Pencil 
} from 'lucide-react';
import './Sidebar.css';

const Sidebar = ({ 
  elements, 
  onClose, 
  onElementSelect,
  onDeleteElement,
  onDuplicateElement,
  onToggleVisibility,
  onToggleLock,
  onMoveUp,
  onMoveDown,
  onShowAll,
  onHideAll,
  selectedElementId 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');

  const getElementIcon = (type) => {
    switch(type) {
      case 'rectangle': return <Square size={16} />;
      case 'ellipse': return <Circle size={16} />;
      case 'line': return <Minus size={16} />;
      case 'arrow': return <ArrowIcon size={16} />;
      case 'freehand': return <Pencil size={16} />;
      default: return <Grid size={16} />;
    }
  };

  const getElementPreview = (element) => {
    if (element.type === 'freehand') {
      return `${element.points?.length || 0} points`;
    }
    if (element.width && element.height) {
      return `${Math.abs(Math.round(element.width))}×${Math.abs(Math.round(element.height))}`;
    }
    return '';
  };

  const filteredElements = elements.filter(element => {
    const matchesSearch = element.type.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (element.name && element.name.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesFilter = filterType === 'all' || element.type === filterType;
    return matchesSearch && matchesFilter;
  });

  const stats = {
    total: elements.length,
    visible: elements.filter(el => el.visible !== false).length,
    hidden: elements.filter(el => el.visible === false).length,
    locked: elements.filter(el => el.locked).length
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Layers size={20} />
          <h3>Layers</h3>
          <span className="layer-count">{elements.length}</span>
        </div>
        <button className="close-button" onClick={onClose}>
          <X size={20} />
        </button>
      </div>

      <div className="sidebar-stats">
        <div className="stat-item">
          <span className="stat-label">Total</span>
          <span className="stat-value">{stats.total}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Visible</span>
          <span className="stat-value">{stats.visible}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Hidden</span>
          <span className="stat-value">{stats.hidden}</span>
        </div>
        <div className="stat-item">
          <span className="stat-label">Locked</span>
          <span className="stat-value">{stats.locked}</span>
        </div>
      </div>

      <div className="sidebar-filters">
        <input
          type="text"
          placeholder="Search layers..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="search-input"
        />
        <select 
          value={filterType} 
          onChange={(e) => setFilterType(e.target.value)}
          className="filter-select"
        >
          <option value="all">All Types</option>
          <option value="rectangle">Rectangle</option>
          <option value="ellipse">Ellipse</option>
          <option value="line">Line</option>
          <option value="arrow">Arrow</option>
          <option value="freehand">Freehand</option>
        </select>
      </div>

      <div className="sidebar-content">
        {elements.length === 0 ? (
          <div className="empty-state">
            <Layers size={48} />
            <p>No layers yet</p>
            <span>Start drawing to create layers</span>
          </div>
        ) : filteredElements.length === 0 ? (
          <div className="empty-state">
            <p>No matching layers</p>
            <span>Try adjusting your search</span>
          </div>
        ) : (
          <ul className="layers-list">
            {filteredElements.map((element, index) => (
              <li 
                key={element.id} 
                className={`layer-item ${selectedElementId === element.id ? 'selected' : ''} ${element.locked ? 'locked' : ''}`}
                onClick={() => onElementSelect?.(element.id)}
              >
                <div className="layer-preview">
                  <span className="layer-icon" style={{ backgroundColor: element.color + '20', color: element.color }}>
                    {getElementIcon(element.type)}
                  </span>
                  <div className="layer-info">
                    <span className="layer-type">
                      {element.name || element.type}
                      {element.locked && <Lock size={12} className="locked-icon" />}
                    </span>
                    <span className="layer-details">{getElementPreview(element)}</span>
                  </div>
                </div>

                <div className="layer-actions">
                  <button 
                    className={`layer-action ${element.visible === false ? 'inactive' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleVisibility?.(element.id);
                    }}
                    title={element.visible === false ? 'Show' : 'Hide'}
                  >
                    {element.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  
                  <button 
                    className={`layer-action ${element.locked ? 'active' : ''}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleLock?.(element.id);
                    }}
                    title={element.locked ? 'Unlock' : 'Lock'}
                  >
                    {element.locked ? <Lock size={16} /> : <Unlock size={16} />}
                  </button>
                  
                  <button 
                    className="layer-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateElement?.(element.id);
                    }}
                    title="Duplicate"
                    disabled={element.locked}
                  >
                    <Copy size={16} />
                  </button>
                  
                  <button 
                    className="layer-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveUp?.(element.id);
                    }}
                    title="Move Up"
                    disabled={index === 0 || element.locked}
                  >
                    <ArrowUp size={16} />
                  </button>
                  
                  <button 
                    className="layer-action"
                    onClick={(e) => {
                      e.stopPropagation();
                      onMoveDown?.(element.id);
                    }}
                    title="Move Down"
                    disabled={index === elements.length - 1 || element.locked}
                  >
                    <ArrowDown size={16} />
                  </button>
                  
                  <button 
                    className="layer-action delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (window.confirm('Delete this layer?')) {
                        onDeleteElement?.(element.id);
                      }
                    }}
                    title="Delete"
                    disabled={element.locked}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <div 
                  className="layer-color-strip" 
                  style={{ backgroundColor: element.color }}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      {elements.length > 0 && (
        <div className="sidebar-footer">
          <button className="footer-button" onClick={onShowAll} title="Show all layers">
            <Eye size={16} />
            Show All
          </button>
          <button className="footer-button" onClick={onHideAll} title="Hide all layers">
            <EyeOff size={16} />
            Hide All
          </button>
          <button className="footer-button danger" onClick={() => {
            if (window.confirm('Delete all layers?')) {
              elements.forEach(el => onDeleteElement?.(el.id));
            }
          }} title="Delete all layers">
            <Trash2 size={16} />
            Clear All
          </button>
        </div>
      )}
    </div>
  );
};

export default Sidebar;