
import React, { useEffect } from 'react';
import * as fabric from 'fabric';

const PrintAreaOverlay = ({ 
  canvas, 
  printArea, 
  visible = true, 
  interactive = false,
  color = '#007bff',
  opacity = 0.1,
  strokeWidth = 2,
  dashArray = [5, 5]
}) => {
  useEffect(() => {
    if (!canvas || !printArea) return;

    // Remove existing overlay
    const existingOverlay = canvas.getObjects().find(obj => obj.id === 'printAreaOverlay');
    if (existingOverlay) {
      canvas.remove(existingOverlay);
    }

    if (!visible) {
      canvas.renderAll();
      return;
    }

    // Create print area overlay
    const overlay = new fabric.Rect({
      left: printArea.x,
      top: printArea.y,
      width: printArea.width,
      height: printArea.height,
      fill: `rgba(${hexToRgb(color)}, ${opacity})`,
      stroke: color,
      strokeWidth: strokeWidth,
      strokeDashArray: dashArray,
      selectable: interactive,
      evented: interactive,
      excludeFromExport: true,
      id: 'printAreaOverlay',
      type: 'printAreaOverlay'
    });

    // Add corner indicators for better visibility
    const corners = [
      { x: printArea.x, y: printArea.y }, // top-left
      { x: printArea.x + printArea.width, y: printArea.y }, // top-right
      { x: printArea.x, y: printArea.y + printArea.height }, // bottom-left
      { x: printArea.x + printArea.width, y: printArea.y + printArea.height } // bottom-right
    ];

    corners.forEach((corner, index) => {
      const cornerIndicator = new fabric.Circle({
        left: corner.x,
        top: corner.y,
        radius: 4,
        fill: color,
        originX: 'center',
        originY: 'center',
        selectable: false,
        evented: false,
        excludeFromExport: true,
        id: `printAreaCorner_${index}`,
        type: 'printAreaCorner'
      });
      canvas.add(cornerIndicator);
    });

    // Add label
    const label = new fabric.Text(printArea.name || 'Print Area', {
      left: printArea.x + 5,
      top: printArea.y - 25,
      fontSize: 12,
      fill: color,
      fontWeight: 'bold',
      selectable: false,
      evented: false,
      excludeFromExport: true,
      id: 'printAreaLabel',
      type: 'printAreaLabel'
    });

    canvas.add(overlay);
    canvas.add(label);
    canvas.bringToFront(overlay);
    canvas.bringToFront(label);
    canvas.renderAll();

    // Cleanup function
    return () => {
      const overlayElements = canvas.getObjects().filter(obj => 
        obj.type === 'printAreaOverlay' || 
        obj.type === 'printAreaCorner' || 
        obj.id === 'printAreaLabel'
      );
      overlayElements.forEach(element => canvas.remove(element));
      canvas.renderAll();
    };
  }, [canvas, printArea, visible, interactive, color, opacity, strokeWidth, dashArray]);

  return null; // This component doesn't render anything directly
};

// Helper function to convert hex to RGB
const hexToRgb = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (result) {
    const r = parseInt(result[1], 16);
    const g = parseInt(result[2], 16);
    const b = parseInt(result[3], 16);
    return `${r}, ${g}, ${b}`;
  }
  return '0, 123, 255'; // Default blue
};

export default PrintAreaOverlay;
