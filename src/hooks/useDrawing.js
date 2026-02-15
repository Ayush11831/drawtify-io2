import { useState, useCallback } from 'react';

export const useDrawing = () => {
  const [elements, setElements] = useState([]);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [visibleLayers, setVisibleLayers] = useState({});

  const addElement = useCallback((element) => {
    const newElement = {
      ...element,
      id: Date.now() + Math.random() + Math.random(),
      seed: Math.random(),
      visible: true,
      locked: false,
      name: `${element.type} ${elements.length + 1}`
    };
    
    setElements(prev => {
      const newElements = [...prev, newElement];
      setHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex(prev => prev + 1);
      return newElements;
    });
    
    return newElement;
  }, [historyIndex, elements.length]);

  const updateElement = useCallback((id, updates) => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1) return prev;
      
      const newElements = [...prev];
      newElements[index] = { ...newElements[index], ...updates };
      
      setHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex(prev => prev + 1);
      
      return newElements;
    });
  }, [historyIndex]);

  const deleteElement = useCallback((id) => {
    setElements(prev => {
      const newElements = prev.filter(el => el.id !== id);
      
      setHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex(prev => prev + 1);
      
      if (selectedElementId === id) {
        setSelectedElementId(null);
      }
      
      // Also remove from visible layers
      const newVisibleLayers = { ...visibleLayers };
      delete newVisibleLayers[id];
      setVisibleLayers(newVisibleLayers);
      
      return newElements;
    });
  }, [historyIndex, selectedElementId, visibleLayers]);

  const duplicateElement = useCallback((id) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      const { id: _, ...elementData } = element;
      addElement({
        ...elementData,
        x: element.x + 20,
        y: element.y + 20
      });
    }
  }, [elements, addElement]);

  const toggleLayerVisibility = useCallback((id) => {
    setVisibleLayers(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
    
    // Also update the element's visibility property
    updateElement(id, { visible: !visibleLayers[id] });
  }, [visibleLayers, updateElement]);

  const toggleLayerLock = useCallback((id) => {
    const element = elements.find(el => el.id === id);
    if (element) {
      updateElement(id, { locked: !element.locked });
    }
  }, [elements, updateElement]);

  const moveLayerUp = useCallback((id) => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1 || index === prev.length - 1) return prev;
      
      const newElements = [...prev];
      [newElements[index], newElements[index + 1]] = [newElements[index + 1], newElements[index]];
      
      setHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex(prev => prev + 1);
      
      return newElements;
    });
  }, [historyIndex]);

  const moveLayerDown = useCallback((id) => {
    setElements(prev => {
      const index = prev.findIndex(el => el.id === id);
      if (index === -1 || index === 0) return prev;
      
      const newElements = [...prev];
      [newElements[index], newElements[index - 1]] = [newElements[index - 1], newElements[index]];
      
      setHistory(prevHistory => [...prevHistory.slice(0, historyIndex + 1), newElements]);
      setHistoryIndex(prev => prev + 1);
      
      return newElements;
    });
  }, [historyIndex]);

  const showAllLayers = useCallback(() => {
    const newVisibleLayers = {};
    elements.forEach(el => {
      newVisibleLayers[el.id] = true;
    });
    setVisibleLayers(newVisibleLayers);
    
    // Update all elements to be visible
    setElements(prev => prev.map(el => ({ ...el, visible: true })));
  }, [elements]);

  const hideAllLayers = useCallback(() => {
    const newVisibleLayers = {};
    elements.forEach(el => {
      newVisibleLayers[el.id] = false;
    });
    setVisibleLayers(newVisibleLayers);
    
    // Update all elements to be invisible
    setElements(prev => prev.map(el => ({ ...el, visible: false })));
  }, [elements]);

  const undo = useCallback(() => {
    if (historyIndex > 0) {
      setHistoryIndex(prev => prev - 1);
      setElements(history[historyIndex - 1]);
    }
  }, [history, historyIndex]);

  const redo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(prev => prev + 1);
      setElements(history[historyIndex + 1]);
    }
  }, [history, historyIndex]);

  const clearCanvas = useCallback(() => {
    setElements([]);
    setHistory([]);
    setHistoryIndex(-1);
    setSelectedElementId(null);
    setVisibleLayers({});
  }, []);

  const selectElement = useCallback((id) => {
    setSelectedElementId(id);
  }, []);

  const getVisibleElements = useCallback(() => {
    return elements.filter(el => visibleLayers[el.id] !== false);
  }, [elements, visibleLayers]);

  return {
    elements,
    selectedElementId,
    visibleLayers,
    addElement,
    updateElement,
    deleteElement,
    selectElement,
    duplicateElement,
    toggleLayerVisibility,
    toggleLayerLock,
    moveLayerUp,
    moveLayerDown,
    showAllLayers,
    hideAllLayers,
    undo,
    redo,
    clearCanvas,
    getVisibleElements,
    canUndo: historyIndex > 0,
    canRedo: historyIndex < history.length - 1,
    elementCount: elements.length
  };
};