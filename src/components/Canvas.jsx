import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import rough from 'roughjs';

const Canvas = forwardRef(({ elements, setElements, tool, color, strokeWidth, showGrid }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  const startPoint = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getSVG: () => {
      // Generate SVG from elements
      let svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.width}" height="${canvasSize.height}" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}">`;
      elements.forEach(element => {
        if (element.type === 'rectangle') {
          svg += `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
        } else if (element.type === 'ellipse') {
          svg += `<ellipse cx="${element.x + element.width/2}" cy="${element.y + element.height/2}" rx="${Math.abs(element.width/2)}" ry="${Math.abs(element.height/2)}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
        } else if (element.type === 'line' || element.type === 'arrow') {
          svg += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.color}" stroke-width="${element.strokeWidth}" />`;
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
        setCanvasSize({ width, height });
        canvas.width = width;
        canvas.height = height;
        drawCanvas();
      }
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, []);

  // Draw everything
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    const roughCanvas = roughCanvasRef.current;

    if (!ctx || !roughCanvas) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw grid if enabled
    if (showGrid) {
      drawGrid(ctx, canvas.width, canvas.height);
    }

    // Draw all elements with stabilization
    elements.forEach(element => {
      drawElement(element, roughCanvas, ctx);
    });
  };

  // Draw grid
  const drawGrid = (ctx, width, height) => {
    const gridSize = 20;
    ctx.save();
    ctx.strokeStyle = '#e2e8f0';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    
    for (let x = 0; x <= width; x += gridSize) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
    }
    
    for (let y = 0; y <= height; y += gridSize) {
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
    }
    
    ctx.stroke();
    ctx.restore();
  };

  // Draw single element with stabilization
  const drawElement = (element, roughCanvas, ctx) => {
    const options = {
      stroke: element.color,
      strokeWidth: element.strokeWidth,
      roughness: 1,
      seed: element.seed || Math.random() // Add seed for stability
    };

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
      default:
        break;
    }
  };

  // Draw arrow head
  const drawArrowHead = (ctx, x, y, fromX, fromY, color, size) => {
    const angle = Math.atan2(y - fromY, x - fromX);
    const arrowSize = size * 1.5;
    
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

  // Redraw when elements, grid, or color change
  useEffect(() => {
    drawCanvas();
  }, [elements, showGrid, color, strokeWidth, canvasSize]);

  const startDrawing = (e) => {
    if (tool === 'selection') return;
    
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    startPoint.current = { x, y };

    if (tool === 'freehand') {
      setElements([...elements, {
        type: 'freehand',
        points: [{ x, y }],
        color,
        strokeWidth,
        seed: Math.random()
      }]);
    }
  };

  const draw = (e) => {
    if (!isDrawing.current || tool === 'selection') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

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
      // Preview for shapes
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const roughCanvas = roughCanvasRef.current;
      
      // Clear and redraw everything
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (showGrid) drawGrid(ctx, canvas.width, canvas.height);
      elements.forEach(element => drawElement(element, roughCanvas, ctx));
      
      // Draw preview
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

      drawElement(previewElement, roughCanvas, ctx);
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing.current || tool === 'selection') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    if (tool !== 'freehand' && startPoint.current) {
      const newElement = {
        type: tool,
        x: startPoint.current.x,
        y: startPoint.current.y,
        width: x - startPoint.current.x,
        height: y - startPoint.current.y,
        color,
        strokeWidth,
        seed: Math.random() // Add seed for stability
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
        cursor: tool === 'selection' ? 'default' : 'crosshair',
        touchAction: 'none' // Prevent scrolling on touch devices
      }}
    />
  );
});

export default Canvas;