import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import rough from 'roughjs';

const Canvas = forwardRef(({ elements, setElements, tool, color, strokeWidth, showGrid, panOffset, zoom, bgColor, pattern }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  const startPoint = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getSVG: () => {
      // 1. Calculate boundaries of all elements for export
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

      if (elements.length === 0) {
         minX = 0; minY = 0; maxX = canvasSize.width; maxY = canvasSize.height;
      } else {
        elements.forEach(element => {
            if (element.type === 'line' || element.type === 'arrow') {
                minX = Math.min(minX, element.x1, element.x2);
                minY = Math.min(minY, element.y1, element.y2);
                maxX = Math.max(maxX, element.x1, element.x2);
                maxY = Math.max(maxY, element.y2, element.y2);
            } else if (element.type === 'freehand') {
                element.points.forEach(p => {
                    minX = Math.min(minX, p.x);
                    minY = Math.min(minY, p.y);
                    maxX = Math.max(maxX, p.x);
                    maxY = Math.max(maxY, p.y);
                });
            } else {
                const x1 = element.x;
                const x2 = element.x + element.width;
                const y1 = element.y;
                const y2 = element.y + element.height;
                minX = Math.min(minX, x1, x2);
                minY = Math.min(minY, y1, y2);
                maxX = Math.max(maxX, x1, x2);
                maxY = Math.max(maxY, y1, y2);
            }
        });
      }

      // Add padding to the export
      const padding = 50;
      minX -= padding;
      minY -= padding;
      const width = (maxX - minX) + padding * 2;
      const height = (maxY - minY) + padding * 2;

      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${minX} ${minY} ${width} ${height}" style="background-color: ${bgColor}">`;
      
      elements.forEach(element => {
        if (element.type === 'rectangle') {
            svg += `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
        } else if (element.type === 'ellipse') {
            svg += `<ellipse cx="${element.x + element.width/2}" cy="${element.y + element.height/2}" rx="${Math.abs(element.width/2)}" ry="${Math.abs(element.height/2)}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
        } else if (element.type === 'line' || element.type === 'arrow') {
            svg += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.color}" stroke-width="${element.strokeWidth}" />`;
            if (element.type === 'arrow') {
                 // Simple SVG marker for arrow - in a real app, define <defs> separately
            }
        } else if (element.type === 'freehand') {
            const points = element.points.map(p => `${p.x},${p.y}`).join(' ');
            svg += `<polyline points="${points}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
        }
      });
      svg += '</svg>';
      return svg;
    }
  }));

  // Initialize canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctxRef.current = ctx;
    roughCanvasRef.current = rough.canvas(canvas);

    const resizeCanvas = () => {
      const container = canvas.parentElement; 
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        // Check if size actually changed to avoid unnecessary renders
        if (canvas.width !== width * 2 || canvas.height !== height * 2) {
            setCanvasSize({ width, height });
            // Handle High-DPI screens (Retina)
            canvas.width = width * 2;
            canvas.height = height * 2;
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            requestAnimationFrame(() => drawCanvas());
        }
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []); 

  // --- RENDERING LOGIC ---

  const renderScene = (previewElement = null) => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const roughCanvas = roughCanvasRef.current;

    if (!ctx || !roughCanvas) return;

    // 1. Clear Screen
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(2, 2); // DPI Scale

    // 2. Draw Infinite Background (Screen Space)
    ctx.save();
    ctx.fillStyle = bgColor;
    // Fill the visible viewport (logical size)
    ctx.fillRect(0, 0, canvas.width / 2, canvas.height / 2);
    ctx.restore();

    // 3. Draw Infinite Pattern
    if (pattern !== 'none') {
        const visibleWidth = canvas.width / 2;
        const visibleHeight = canvas.height / 2;
        
        switch(pattern) {
          case 'grid':
            drawInfiniteGrid(ctx, visibleWidth, visibleHeight, panOffset, zoom);
            break;
          case 'dots':
            drawInfiniteDots(ctx, visibleWidth, visibleHeight, panOffset, zoom);
            break;
          case 'lines':
            drawInfiniteLines(ctx, visibleWidth, visibleHeight, panOffset, zoom);
            break;
          default: break;
        }
    }

    // 4. Draw Elements (World Space)
    elements.forEach(element => {
      drawElement(element, roughCanvas, ctx, panOffset, zoom);
    });

    // 5. Draw Preview (World Space)
    if (previewElement) {
        drawElement(previewElement, roughCanvas, ctx, panOffset, zoom);
    }

    ctx.restore();
  };

  // Wrapper for useEffect
  const drawCanvas = () => {
    renderScene(null);
  };

  // Helper to determine if we are in dark mode for grid colors
  const isDarkTheme = (color) => {
    return color === '#1e1e28' || color === '#000000' || color === '#1a1a24';
  };

  const drawInfiniteGrid = (ctx, width, height, panOffset, zoom) => {
    const gridSize = 20;
    
    // Correctly calculate world boundaries by dividing by zoom
    const startX = Math.floor((-panOffset.x / zoom) / gridSize) * gridSize - gridSize;
    const startY = Math.floor((-panOffset.y / zoom) / gridSize) * gridSize - gridSize;
    
    const endX = Math.ceil(((width - panOffset.x) / zoom) / gridSize) * gridSize + gridSize;
    const endY = Math.ceil(((height - panOffset.y) / zoom) / gridSize) * gridSize + gridSize;

    ctx.save();
    // Dark Theme = White Lines, Light Theme = Black Lines
    ctx.strokeStyle = isDarkTheme(bgColor) ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.3)';
    ctx.lineWidth = 0.5 / zoom;
    ctx.beginPath();
    
    for (let x = startX; x <= endX; x += gridSize) {
        const screenX = (x * zoom) + panOffset.x;
        ctx.moveTo(screenX, 0); 
        ctx.lineTo(screenX, height);
    }
    for (let y = startY; y <= endY; y += gridSize) {
        const screenY = (y * zoom) + panOffset.y;
        ctx.moveTo(0, screenY);
        ctx.lineTo(width, screenY);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawInfiniteDots = (ctx, width, height, panOffset, zoom) => {
    const gridSize = 30;
    const dotSize = 1.5 / zoom;
    
    const startX = Math.floor((-panOffset.x / zoom) / gridSize) * gridSize - gridSize;
    const startY = Math.floor((-panOffset.y / zoom) / gridSize) * gridSize - gridSize;
    
    const endX = Math.ceil(((width - panOffset.x) / zoom) / gridSize) * gridSize + gridSize;
    const endY = Math.ceil(((height - panOffset.y) / zoom) / gridSize) * gridSize + gridSize;

    ctx.save();
    // Dark Theme = White Dots, Light Theme = Black Dots
    ctx.fillStyle = isDarkTheme(bgColor) ? 'rgba(255, 255, 255, 0.2)' : 'rgba(0, 0, 0, 0.41)';
    
    ctx.beginPath(); 
    for (let x = startX; x <= endX; x += gridSize) {
      for (let y = startY; y <= endY; y += gridSize) {
        const screenX = (x * zoom) + panOffset.x;
        const screenY = (y * zoom) + panOffset.y;
        // Optimization: check bounds before drawing
        if (screenX >= -20 && screenX <= width + 20 && screenY >= -20 && screenY <= height + 20) {
            ctx.moveTo(screenX, screenY); 
            ctx.arc(screenX, screenY, dotSize, 0, Math.PI * 2);
        }
      }
    }
    ctx.fill();
    ctx.restore();
  };

  const drawInfiniteLines = (ctx, width, height, panOffset, zoom) => {
    const lineSpacing = 40;
    
    const startY = Math.floor((-panOffset.y / zoom) / lineSpacing) * lineSpacing - lineSpacing;
    const endY = Math.ceil(((height - panOffset.y) / zoom) / lineSpacing) * lineSpacing + lineSpacing;

    ctx.save();
    // Dark Theme = White Lines, Light Theme = Black Lines
    ctx.strokeStyle = isDarkTheme(bgColor) ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 0.5 / zoom;
    ctx.beginPath();
    for (let y = startY; y <= endY; y += lineSpacing) {
      const screenY = (y * zoom) + panOffset.y;
      ctx.moveTo(0, screenY);
      ctx.lineTo(width, screenY);
    }
    ctx.stroke();
    ctx.restore();
  };

  const drawElement = (element, roughCanvas, ctx, panOffset, zoom) => {
    const options = {
      stroke: element.color,
      strokeWidth: element.strokeWidth,
      roughness: 1,
      seed: element.seed || Math.random()
    };

    ctx.save();
    ctx.translate(panOffset.x, panOffset.y);
    ctx.scale(zoom, zoom); 

    switch (element.type) {
      case 'rectangle':
        roughCanvas.rectangle(element.x, element.y, element.width, element.height, options);
        break;
      case 'ellipse':
        roughCanvas.ellipse(
          element.x + element.width / 2,
          element.y + element.height / 2,
          Math.abs(element.width),
          Math.abs(element.height),
          options
        );
        break;
      case 'line':
        roughCanvas.line(element.x1, element.y1, element.x2, element.y2, options);
        break;
      case 'arrow':
        roughCanvas.line(element.x1, element.y1, element.x2, element.y2, options);
        drawArrowHead(ctx, element.x2, element.y2, element.x1, element.y1, element.color, element.strokeWidth * 2);
        break;
      case 'freehand':
        if (element.points && element.points.length > 1) {
          ctx.save();
          ctx.strokeStyle = element.color;
          ctx.lineWidth = element.strokeWidth;
          ctx.lineCap = 'round';
          ctx.lineJoin = 'round';
          ctx.beginPath();
          ctx.moveTo(element.points[0].x, element.points[0].y);
          for (let i = 1; i < element.points.length; i++) {
            ctx.lineTo(element.points[i].x, element.points[i].y);
          }
          ctx.stroke();
          ctx.restore();
        }
        break;
      default: break;
    }

    ctx.restore();
  };

  const drawArrowHead = (ctx, x, y, fromX, fromY, color, size) => {
    const angle = Math.atan2(y - fromY, x - fromX);
    
    // Increased Size for visibility
    const arrowSize = size * 4;
    
    ctx.save();
    ctx.fillStyle = color;
    ctx.translate(x, y);
    ctx.rotate(angle);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-arrowSize, -arrowSize / 2);
    ctx.lineTo(-arrowSize, arrowSize / 2);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  useEffect(() => {
    drawCanvas();
  }, [elements, showGrid, color, strokeWidth, panOffset, zoom, canvasSize, pattern, bgColor]);

  // --- INTERACTION LOGIC ---

  // Helper to translate Mouse Screen Coords -> World Coords
  const getMouseCoordinates = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width / 2;
    const scaleY = canvasRef.current.height / rect.height / 2;
    
    // (Screen - Pan) / Zoom = World
    const x = ((e.clientX - rect.left) * scaleX - panOffset.x) / zoom;
    const y = ((e.clientY - rect.top) * scaleY - panOffset.y) / zoom;
    
    return { x, y };
  };

  const startDrawing = (e) => {
    if (tool === 'selection' || tool === 'hand') return;
    
    isDrawing.current = true;
    const { x, y } = getMouseCoordinates(e);

    startPoint.current = { x, y };

    if (tool === 'freehand') {
      const newElement = {
        id: Date.now() + Math.random(),
        type: 'freehand',
        points: [{ x, y }],
        color,
        strokeWidth,
        seed: Math.random()
      };
      setElements([...elements, newElement]);
    }
  };

  const draw = (e) => {
    if (!isDrawing.current || tool === 'selection' || tool === 'hand') return;

    const { x, y } = getMouseCoordinates(e);

    if (tool === 'freehand') {
      const lastElement = elements[elements.length - 1];
      if (lastElement && lastElement.type === 'freehand') {
        const updatedPoints = [...lastElement.points, { x, y }];
        const newElements = [...elements.slice(0, -1), {
          ...lastElement,
          points: updatedPoints
        }];
        setElements(newElements);
      }
    } else {
        // Preview Drawing (World Coords)
        const previewElement = {
            type: tool,
            x: startPoint.current.x,
            y: startPoint.current.y,
            width: x - startPoint.current.x,
            height: y - startPoint.current.y,
            color,
            strokeWidth,
            seed: Math.random()
        };

        if (tool === 'line' || tool === 'arrow') {
            previewElement.x1 = startPoint.current.x;
            previewElement.y1 = startPoint.current.y;
            previewElement.x2 = x;
            previewElement.y2 = y;
        }

        renderScene(previewElement);
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing.current || tool === 'selection' || tool === 'hand') return;

    const { x, y } = getMouseCoordinates(e);

    if (tool !== 'freehand' && startPoint.current) {
      const newElement = {
        id: Date.now() + Math.random(),
        type: tool,
        x: startPoint.current.x,
        y: startPoint.current.y,
        width: x - startPoint.current.x,
        height: y - startPoint.current.y,
        color,
        strokeWidth,
        seed: Math.random()
      };

      if (tool === 'line' || tool === 'arrow') {
        newElement.x1 = startPoint.current.x;
        newElement.y1 = startPoint.current.y;
        newElement.x2 = x;
        newElement.y2 = y;
      }

      setElements([...elements, newElement]);
    }

    isDrawing.current = false;
    startPoint.current = null;
  };

  return (
    <canvas
      ref={canvasRef}
      className="drawing-canvas"
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      style={{
        width: '100%',
        height: '100%',
        display: 'block',
        cursor: tool === 'selection' ? 'default' : (tool === 'hand' ? 'grab' : 'crosshair'),
        touchAction: 'none'
      }}
    />
  );
});

export default Canvas;