import React, { useRef, useEffect, forwardRef, useImperativeHandle, useState } from 'react';
import rough from 'roughjs';

const Canvas = forwardRef(({ elements, setElements, tool, color, strokeWidth, showGrid, panOffset, zoom }, ref) => {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const roughCanvasRef = useRef(null);
  const isDrawing = useRef(false);
  const startPoint = useRef(null);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });

  useImperativeHandle(ref, () => ({
    getCanvas: () => canvasRef.current,
    getSVG: () => {
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
      const container = canvas.parentElement?.parentElement;
      if (container) {
        const { width, height } = container.getBoundingClientRect();
        setCanvasSize({ width, height });
        canvas.width = width * 2;
        canvas.height = height * 2;
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
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

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.save();
    ctx.scale(2, 2);

    if (showGrid) {
      drawInfiniteGrid(ctx, canvas.width / 2, canvas.height / 2, panOffset, zoom);
    }

    elements.forEach(element => {
      drawElement(element, roughCanvas, ctx, panOffset, zoom);
    });

    ctx.restore();
  };

  const drawInfiniteGrid = (ctx, width, height, panOffset, zoom) => {
    const gridSize = 20;
    const startX = Math.floor(-panOffset.x / gridSize) * gridSize;
    const startY = Math.floor(-panOffset.y / gridSize) * gridSize;
    const endX = startX + width / zoom + gridSize * 2;
    const endY = startY + height / zoom + gridSize * 2;

    ctx.save();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 0.5 / zoom;
    ctx.beginPath();
    
    for (let x = startX; x <= endX; x += gridSize) {
      ctx.moveTo(x + panOffset.x, startY + panOffset.y);
      ctx.lineTo(x + panOffset.x, endY + panOffset.y);
    }
    
    for (let y = startY; y <= endY; y += gridSize) {
      ctx.moveTo(startX + panOffset.x, y + panOffset.y);
      ctx.lineTo(endX + panOffset.x, y + panOffset.y);
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

    ctx.restore();
  };

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

  useEffect(() => {
    drawCanvas();
  }, [elements, showGrid, color, strokeWidth, panOffset, zoom, canvasSize]);

  const startDrawing = (e) => {
    if (tool === 'selection' || tool === 'hand') return;
    
    isDrawing.current = true;
    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width / 2;
    const scaleY = canvasRef.current.height / rect.height / 2;
    
    const x = (e.clientX - rect.left) * scaleX - panOffset.x;
    const y = (e.clientY - rect.top) * scaleY - panOffset.y;

    startPoint.current = { x, y };

    if (tool === 'freehand') {
      const newElement = {
        id: Date.now() + Math.random() + Math.random(),
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

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width / 2;
    const scaleY = canvasRef.current.height / rect.height / 2;
    
    const x = (e.clientX - rect.left) * scaleX - panOffset.x;
    const y = (e.clientY - rect.top) * scaleY - panOffset.y;

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
      const canvas = canvasRef.current;
      const ctx = ctxRef.current;
      const roughCanvas = roughCanvasRef.current;
      
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.save();
      ctx.scale(2, 2);
      
      if (showGrid) drawInfiniteGrid(ctx, canvas.width / 2, canvas.height / 2, panOffset, zoom);
      elements.forEach(element => drawElement(element, roughCanvas, ctx, panOffset, zoom));
      
      ctx.save();
      ctx.translate(panOffset.x, panOffset.y);
      
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

      drawElement(previewElement, roughCanvas, ctx, { x: 0, y: 0 }, zoom);
      ctx.restore();
      ctx.restore();
    }
  };

  const stopDrawing = (e) => {
    if (!isDrawing.current || tool === 'selection' || tool === 'hand') return;

    const rect = canvasRef.current.getBoundingClientRect();
    const scaleX = canvasRef.current.width / rect.width / 2;
    const scaleY = canvasRef.current.height / rect.height / 2;
    
    const x = (e.clientX - rect.left) * scaleX - panOffset.x;
    const y = (e.clientY - rect.top) * scaleY - panOffset.y;

    if (tool !== 'freehand' && startPoint.current) {
      const newElement = {
        id: Date.now() + Math.random() + Math.random(),
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