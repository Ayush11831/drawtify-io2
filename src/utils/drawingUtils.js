export const calculateDistance = (x1, y1, x2, y2) => {
  return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
};

export const isPointInRectangle = (x, y, rect) => {
  return x >= rect.x && 
         x <= rect.x + rect.width && 
         y >= rect.y && 
         y <= rect.y + rect.height;
};

export const isPointInEllipse = (x, y, ellipse) => {
  const rx = ellipse.width / 2;
  const ry = ellipse.height / 2;
  const cx = ellipse.x + rx;
  const cy = ellipse.y + ry;
  
  return (Math.pow(x - cx, 2) / Math.pow(rx, 2) + 
          Math.pow(y - cy, 2) / Math.pow(ry, 2)) <= 1;
};

export const snapToGrid = (value, gridSize = 20) => {
  return Math.round(value / gridSize) * gridSize;
};

export const constrainAspectRatio = (width, height, maintainRatio = false) => {
  if (!maintainRatio) return { width, height };
  
  const aspectRatio = Math.abs(width / height);
  return {
    width: width > 0 ? Math.max(1, width) : Math.min(-1, width),
    height: height > 0 ? Math.max(1, height) : Math.min(-1, height)
  };
};

export const downloadAsPNG = (canvas, filename = 'drawing.png') => {
  const dataURL = canvas.toDataURL('image/png');
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataURL;
  link.click();
};

export const downloadAsSVG = (elements, width = 800, height = 600, filename = 'drawing.svg') => {
  let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`;
  
  elements.forEach(element => {
    if (element.type === 'rectangle') {
      svgContent += `<rect x="${element.x}" y="${element.y}" width="${element.width}" height="${element.height}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
    } else if (element.type === 'ellipse') {
      svgContent += `<ellipse cx="${element.x + element.width/2}" cy="${element.y + element.height/2}" rx="${Math.abs(element.width/2)}" ry="${Math.abs(element.height/2)}" stroke="${element.color}" stroke-width="${element.strokeWidth}" fill="none" />`;
    } else if (element.type === 'line') {
      svgContent += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.color}" stroke-width="${element.strokeWidth}" />`;
    } else if (element.type === 'arrow') {
      svgContent += `<line x1="${element.x1}" y1="${element.y1}" x2="${element.x2}" y2="${element.y2}" stroke="${element.color}" stroke-width="${element.strokeWidth}" marker-end="url(#arrowhead)" />`;
    }
  });
  
  // Add arrowhead marker
  svgContent += `<defs><marker id="arrowhead" markerWidth="10" markerHeight="10" refX="9" refY="5" orient="auto"><polygon points="0 0, 10 5, 0 10" fill="${elements[0]?.color || '#000'}" /></marker></defs>`;
  
  svgContent += '</svg>';
  
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export const downloadAsJSON = (elements, filename = 'drawing.json') => {
  const data = JSON.stringify(elements, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
};

export const generateSeed = () => {
  return Math.random() * 10000;
};