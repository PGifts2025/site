
import React, { useState, useRef, useEffect } from 'react';
import { fabric } from 'fabric';
import { 
  Settings, 
  Save, 
  Plus, 
  Trash2, 
  Eye, 
  EyeOff, 
  Move, 
  RotateCcw,
  Download,
  Upload,
  Grid,
  Ruler
} from 'lucide-react';

/**
 * Print Area Admin Component
 * 
 * Design Intent:
 * - Automatically loads the product template from the configured template path in products.json
 * - Templates are stored in public/templates/{product-type}/template.png
 * - The Visual Configuration canvas displays the template centered and scaled to fit
 * - Print areas are shown as blue draggable/resizable rectangles overlaid on the template
 * - Administrators can visually configure print areas by dragging and resizing
 * - Changes are saved back to the product configuration
 * - No manual template import is needed - it uses the template from the folder automatically
 */
const PrintAreaAdmin = ({ 
  selectedProduct, 
  productsConfig, 
  onSaveConfiguration,
  onClose 
}) => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [currentProduct, setCurrentProduct] = useState(null);
  const [printAreas, setPrintAreas] = useState({});
  const [selectedPrintArea, setSelectedPrintArea] = useState(null);
  const [showGrid, setShowGrid] = useState(true);
  const [showRulers, setShowRulers] = useState(true);
  const [snapToGrid, setSnapToGrid] = useState(true);
  const [gridSize, setGridSize] = useState(20);
  const [isEditing, setIsEditing] = useState(false);
  const [newAreaName, setNewAreaName] = useState('');
  const [showNewAreaDialog, setShowNewAreaDialog] = useState(false);

  // Initialize canvas
  useEffect(() => {
    console.log('[PrintAreaAdmin] Canvas init useEffect - canvasRef.current:', canvasRef.current, 'canvas:', canvas);
    if (canvasRef.current && !canvas) {
      console.log('[PrintAreaAdmin] Creating new Fabric canvas');
      try {
        const fabricCanvas = new fabric.Canvas(canvasRef.current, {
          width: 800,
          height: 800,
          backgroundColor: '#f8f9fa',
          selection: true
        });

        console.log('[PrintAreaAdmin] Fabric canvas created:', fabricCanvas);

        // Enable object controls
        fabricCanvas.on('object:modified', handleObjectModified);
        fabricCanvas.on('object:selected', handleObjectSelected);
        fabricCanvas.on('selection:cleared', handleSelectionCleared);

        setCanvas(fabricCanvas);
        console.log('[PrintAreaAdmin] Canvas state set');

        return () => {
          console.log('[PrintAreaAdmin] Disposing canvas');
          fabricCanvas.dispose();
        };
      } catch (error) {
        console.error('[PrintAreaAdmin] Error creating Fabric canvas:', error);
      }
    }
  }, []); // Empty dependency array - run once on mount

  // Load product when selected
  useEffect(() => {
    if (canvas && selectedProduct && productsConfig && productsConfig[selectedProduct]) {
      loadProduct();
    } else if (selectedProduct && productsConfig && productsConfig[selectedProduct]) {
      // Set product info even before canvas is ready
      const product = productsConfig[selectedProduct];
      setCurrentProduct(product);
      setPrintAreas({ ...product.printAreas });
    }
  }, [canvas, selectedProduct, productsConfig]);

  // Update grid visibility
  useEffect(() => {
    if (canvas) {
      updateGridOverlay();
    }
  }, [canvas, showGrid, gridSize]);

  const loadProduct = async () => {
    console.log('[PrintAreaAdmin] loadProduct called - canvas:', canvas, 'selectedProduct:', selectedProduct);
    if (!canvas || !selectedProduct) {
      console.log('[PrintAreaAdmin] loadProduct early return - missing canvas or product');
      return;
    }

    const product = productsConfig[selectedProduct];
    console.log('[PrintAreaAdmin] Product config:', product);
    setCurrentProduct(product);
    setPrintAreas({ ...product.printAreas });

    // Clear canvas
    console.log('[PrintAreaAdmin] Clearing canvas');
    canvas.clear();

    // Load template image
    if (product.template) {
      // Fix template path - ensure it starts with proper path
      // In Vite, public folder files are served from root
      const templateUrl = product.template;
      const fixedTemplateUrl = templateUrl.startsWith('/') ? templateUrl : `/${templateUrl}`;
      
      console.log('[PrintAreaAdmin] Loading template:', fixedTemplateUrl);
      
      fabric.Image.fromURL(fixedTemplateUrl, (img) => {
        console.log('[PrintAreaAdmin] Image.fromURL callback - img:', img);
        if (img && img._element) {
          console.log('[PrintAreaAdmin] Template loaded successfully, dimensions:', img.width, 'x', img.height);
          
          // Scale image to fit canvas while maintaining aspect ratio
          const scale = Math.min(800 / img.width, 800 / img.height);
          img.scale(scale);
          
          // Calculate centered position
          const scaledWidth = img.width * scale;
          const scaledHeight = img.height * scale;
          const centerX = (800 - scaledWidth) / 2;
          const centerY = (800 - scaledHeight) / 2;
          
          console.log('[PrintAreaAdmin] Image scale:', scale, 'position:', centerX, centerY);
          
          img.set({
            left: centerX,
            top: centerY,
            selectable: false,
            evented: false,
            excludeFromExport: true,
            id: 'productTemplate'
          });
          
          console.log('[PrintAreaAdmin] Adding image to canvas');
          canvas.add(img);
          canvas.sendToBack(img);
          
          console.log('[PrintAreaAdmin] Canvas objects after add:', canvas.getObjects().length);
          
          // Load existing print areas
          loadPrintAreas();
          updateGridOverlay();
          console.log('[PrintAreaAdmin] Calling canvas.renderAll()');
          canvas.renderAll();
        } else {
          console.error('[PrintAreaAdmin] Failed to load template image - img:', img);
          // Still load print areas even if template fails
          loadPrintAreas();
          updateGridOverlay();
          canvas.renderAll();
        }
      });
    } else {
      console.log('[PrintAreaAdmin] No template URL in product config');
      loadPrintAreas();
      updateGridOverlay();
    }
  };

  const loadPrintAreas = () => {
    if (!canvas || !printAreas) return;

    // Remove existing print area objects
    const existingAreas = canvas.getObjects().filter(obj => obj.type === 'printArea');
    existingAreas.forEach(area => canvas.remove(area));

    // Add print areas as editable rectangles
    Object.entries(printAreas).forEach(([key, area]) => {
      const rect = new fabric.Rect({
        left: area.x,
        top: area.y,
        width: area.width,
        height: area.height,
        fill: 'rgba(59, 130, 246, 0.2)',
        stroke: '#3b82f6',
        strokeWidth: 2,
        strokeDashArray: [5, 5],
        cornerColor: '#3b82f6',
        cornerSize: 8,
        transparentCorners: false,
        id: `printArea_${key}`,
        type: 'printArea',
        printAreaKey: key,
        printAreaName: area.name
      });

      // Add label
      const label = new fabric.Text(area.name, {
        left: area.x + 5,
        top: area.y - 25,
        fontSize: 14,
        fill: '#3b82f6',
        fontWeight: 'bold',
        selectable: false,
        evented: false,
        id: `printAreaLabel_${key}`,
        type: 'printAreaLabel'
      });

      canvas.add(rect);
      canvas.add(label);
    });

    canvas.renderAll();
  };

  const updateGridOverlay = () => {
    if (!canvas) return;

    // Remove existing grid
    const existingGrid = canvas.getObjects().filter(obj => obj.id === 'gridOverlay');
    existingGrid.forEach(grid => canvas.remove(grid));

    if (!showGrid) return;

    const gridLines = [];
    const canvasWidth = canvas.width;
    const canvasHeight = canvas.height;

    // Vertical lines
    for (let i = 0; i <= canvasWidth; i += gridSize) {
      const line = new fabric.Line([i, 0, i, canvasHeight], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        id: 'gridOverlay',
        excludeFromExport: true
      });
      gridLines.push(line);
    }

    // Horizontal lines
    for (let i = 0; i <= canvasHeight; i += gridSize) {
      const line = new fabric.Line([0, i, canvasWidth, i], {
        stroke: '#e5e7eb',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        id: 'gridOverlay',
        excludeFromExport: true
      });
      gridLines.push(line);
    }

    gridLines.forEach(line => {
      canvas.add(line);
      canvas.sendToBack(line);
    });

    canvas.renderAll();
  };

  const handleObjectModified = (e) => {
    const obj = e.target;
    if (obj.type === 'printArea') {
      const key = obj.printAreaKey;
      const newArea = {
        ...printAreas[key],
        x: Math.round(obj.left),
        y: Math.round(obj.top),
        width: Math.round(obj.width * obj.scaleX),
        height: Math.round(obj.height * obj.scaleY),
        maxWidth: Math.round(obj.width * obj.scaleX),
        maxHeight: Math.round(obj.height * obj.scaleY)
      };

      setPrintAreas(prev => ({
        ...prev,
        [key]: newArea
      }));

      // Update label position
      const label = canvas.getObjects().find(o => o.id === `printAreaLabel_${key}`);
      if (label) {
        label.set({
          left: obj.left + 5,
          top: obj.top - 25
        });
      }

      // Reset scale to prevent compound scaling
      obj.set({
        scaleX: 1,
        scaleY: 1,
        width: newArea.width,
        height: newArea.height
      });

      canvas.renderAll();
    }
  };

  const handleObjectSelected = (e) => {
    const obj = e.target;
    if (obj.type === 'printArea') {
      setSelectedPrintArea(obj.printAreaKey);
    }
  };

  const handleSelectionCleared = () => {
    setSelectedPrintArea(null);
  };

  const addNewPrintArea = () => {
    if (!newAreaName.trim() || !canvas) return;

    const key = newAreaName.toLowerCase().replace(/\s+/g, '_');
    if (printAreas[key]) {
      alert('Print area with this name already exists');
      return;
    }

    const newArea = {
      name: newAreaName,
      x: 200,
      y: 200,
      width: 200,
      height: 200,
      maxWidth: 200,
      maxHeight: 200
    };

    setPrintAreas(prev => ({
      ...prev,
      [key]: newArea
    }));

    setNewAreaName('');
    setShowNewAreaDialog(false);

    // Reload print areas to show the new one
    setTimeout(() => {
      loadPrintAreas();
    }, 100);
  };

  const deletePrintArea = (key) => {
    if (!confirm(`Are you sure you want to delete the "${printAreas[key].name}" print area?`)) {
      return;
    }

    const newPrintAreas = { ...printAreas };
    delete newPrintAreas[key];
    setPrintAreas(newPrintAreas);

    // Remove from canvas
    const rect = canvas.getObjects().find(obj => obj.id === `printArea_${key}`);
    const label = canvas.getObjects().find(obj => obj.id === `printAreaLabel_${key}`);
    
    if (rect) canvas.remove(rect);
    if (label) canvas.remove(label);
    
    canvas.renderAll();
  };

  const saveConfiguration = () => {
    if (!currentProduct || !selectedProduct) return;

    const updatedProduct = {
      ...currentProduct,
      printAreas: printAreas
    };

    onSaveConfiguration(selectedProduct, updatedProduct);
  };

  const exportConfiguration = () => {
    if (!currentProduct || !printAreas) return;

    const config = {
      product: selectedProduct,
      printAreas: printAreas,
      exportedAt: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(config, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedProduct}-print-areas.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const importConfiguration = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const config = JSON.parse(event.target.result);
        if (config.printAreas) {
          setPrintAreas(config.printAreas);
          setTimeout(() => {
            loadPrintAreas();
          }, 100);
        }
      } catch (error) {
        alert('Invalid configuration file');
      }
    };
    reader.readAsText(file);
  };

  if (!selectedProduct || !currentProduct) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
          <h2 className="text-2xl font-bold mb-4">Print Area Admin</h2>
          <p className="text-gray-600">Please select a product to configure print areas.</p>
          <button
            onClick={onClose}
            className="mt-4 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg w-full max-w-7xl" style={{ height: '90vh', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Print Area Configuration</h2>
            <p className="text-gray-600">Product: {currentProduct.name}</p>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={exportConfiguration}
              className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Download className="w-4 h-4" />
              <span>Export</span>
            </button>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Upload className="w-4 h-4" />
              <span>Import</span>
            </button>
            <button
              onClick={saveConfiguration}
              className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              <Save className="w-4 h-4" />
              <span>Save</span>
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
            >
              Close
            </button>
          </div>
        </div>

        <div className="flex overflow-hidden" style={{ flex: 1, minHeight: 0 }}>
          {/* Left Sidebar - Controls */}
          <div className="w-80 border-r p-6 overflow-y-auto flex-shrink-0">
            <div className="space-y-6">
              {/* Grid Controls */}
              <div>
                <h3 className="text-lg font-semibold mb-3">Grid & Guides</h3>
                <div className="space-y-3">
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={showGrid}
                      onChange={(e) => setShowGrid(e.target.checked)}
                      className="rounded"
                    />
                    <Grid className="w-4 h-4" />
                    <span>Show Grid</span>
                  </label>
                  
                  <label className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      checked={snapToGrid}
                      onChange={(e) => setSnapToGrid(e.target.checked)}
                      className="rounded"
                    />
                    <span>Snap to Grid</span>
                  </label>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Grid Size: {gridSize}px
                    </label>
                    <input
                      type="range"
                      min="10"
                      max="50"
                      value={gridSize}
                      onChange={(e) => setGridSize(parseInt(e.target.value))}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Print Areas List */}
              <div>
                <div className="flex justify-between items-center mb-3">
                  <h3 className="text-lg font-semibold">Print Areas</h3>
                  <button
                    onClick={() => setShowNewAreaDialog(true)}
                    className="flex items-center space-x-1 px-2 py-1 bg-green-600 text-white rounded text-sm hover:bg-green-700"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add</span>
                  </button>
                </div>
                
                <div className="space-y-2">
                  {Object.entries(printAreas).map(([key, area]) => (
                    <div
                      key={key}
                      className={`p-3 border rounded-lg ${
                        selectedPrintArea === key ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{area.name}</h4>
                          <div className="text-xs text-gray-500 mt-1">
                            <div>Position: {area.x}, {area.y}</div>
                            <div>Size: {area.width} × {area.height}</div>
                          </div>
                        </div>
                        <button
                          onClick={() => deletePrintArea(key)}
                          className="text-red-600 hover:text-red-800 p-1"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Selected Area Details */}
              {selectedPrintArea && printAreas[selectedPrintArea] && (
                <div>
                  <h3 className="text-lg font-semibold mb-3">Area Details</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Name
                      </label>
                      <input
                        type="text"
                        value={printAreas[selectedPrintArea].name}
                        onChange={(e) => {
                          setPrintAreas(prev => ({
                            ...prev,
                            [selectedPrintArea]: {
                              ...prev[selectedPrintArea],
                              name: e.target.value
                            }
                          }));
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">X</label>
                        <input
                          type="number"
                          value={printAreas[selectedPrintArea].x}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setPrintAreas(prev => ({
                              ...prev,
                              [selectedPrintArea]: {
                                ...prev[selectedPrintArea],
                                x: value
                              }
                            }));
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Y</label>
                        <input
                          type="number"
                          value={printAreas[selectedPrintArea].y}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setPrintAreas(prev => ({
                              ...prev,
                              [selectedPrintArea]: {
                                ...prev[selectedPrintArea],
                                y: value
                              }
                            }));
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Width</label>
                        <input
                          type="number"
                          value={printAreas[selectedPrintArea].width}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setPrintAreas(prev => ({
                              ...prev,
                              [selectedPrintArea]: {
                                ...prev[selectedPrintArea],
                                width: value,
                                maxWidth: value
                              }
                            }));
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Height</label>
                        <input
                          type="number"
                          value={printAreas[selectedPrintArea].height}
                          onChange={(e) => {
                            const value = parseInt(e.target.value) || 0;
                            setPrintAreas(prev => ({
                              ...prev,
                              [selectedPrintArea]: {
                                ...prev[selectedPrintArea],
                                height: value,
                                maxHeight: value
                              }
                            }));
                          }}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="p-6 overflow-auto" style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
            <div className="flex justify-between items-center mb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold">Visual Configuration</h3>
              <div className="text-sm text-gray-500">
                Drag and resize the blue rectangles to configure print areas
              </div>
            </div>
            
            <div className="border border-gray-200 rounded-lg bg-white p-4 flex-shrink-0" style={{ width: '800px', height: '800px' }}>
              <canvas ref={canvasRef} width="800" height="800" />
            </div>
          </div>
        </div>

        {/* New Area Dialog */}
        {showNewAreaDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4">Add New Print Area</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Area Name
                  </label>
                  <input
                    type="text"
                    value={newAreaName}
                    onChange={(e) => setNewAreaName(e.target.value)}
                    placeholder="e.g., Left Chest, Back, Sleeve"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={() => {
                      setShowNewAreaDialog(false);
                      setNewAreaName('');
                    }}
                    className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={addNewPrintArea}
                    disabled={!newAreaName.trim()}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    Add Area
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={importConfiguration}
          className="hidden"
        />
      </div>
    </div>
  );
};

export default PrintAreaAdmin;
