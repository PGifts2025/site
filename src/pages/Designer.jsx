
import React, { useState, useRef, useEffect } from 'react';
import * as fabric from 'fabric';
import { jsPDF } from 'jspdf';
import { createClient } from '@supabase/supabase-js';
import { supabaseConfig, isMockAuth } from '../config/supabase';
import { createMockSupabase } from '../utils/mockAuth';
import productsConfig from '../config/products.json';
import { 
  Upload, 
  Download, 
  RotateCcw, 
  RotateCw, 
  Trash2, 
  Move, 
  Square, 
  Circle, 
  Type, 
  Palette,
  User,
  LogIn,
  LogOut,
  Eye,
  EyeOff,
  Save,
  FileImage,
  FileText
} from 'lucide-react';

// Initialize Supabase or mock auth
const supabase = isMockAuth 
  ? createMockSupabase() 
  : createClient(supabaseConfig.url, supabaseConfig.anonKey);

const Designer = () => {
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);
  const [canvas, setCanvas] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState('tshirt');
  const [selectedColor, setSelectedColor] = useState('#ffffff');
  const [printArea, setPrintArea] = useState('front');
  const [user, setUser] = useState(null);
  const [showAuth, setShowAuth] = useState(false);
  const [authMode, setAuthMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [watermarkVisible, setWatermarkVisible] = useState(true);
  const [templateLoaded, setTemplateLoaded] = useState(false);

  // Get current product configuration
  const currentProduct = productsConfig[selectedProduct];
  const currentPrintArea = currentProduct?.printAreas[printArea] || Object.values(currentProduct?.printAreas || {})[0];

  // Initialize canvas
  useEffect(() => {
    if (canvasRef.current && !canvas) {
      const fabricCanvas = new fabric.Canvas(canvasRef.current, {
        width: 800,
        height: 800,
        backgroundColor: '#f8f9fa'
      });

      setCanvas(fabricCanvas);

      return () => {
        fabricCanvas.dispose();
      };
    }
  }, [canvas]);

  // Load product template when product or color changes
  useEffect(() => {
    if (canvas && currentProduct) {
      loadProductTemplate();
    }
  }, [canvas, selectedProduct, selectedColor]);

  // Update print area when selection changes
  useEffect(() => {
    if (canvas && currentPrintArea) {
      updatePrintAreaOverlay();
    }
  }, [canvas, printArea, selectedProduct]);

  const loadProductTemplate = async () => {
    if (!canvas || !currentProduct) return;

    setTemplateLoaded(false);
    
    try {
      // Clear canvas
      canvas.clear();
      
      // Load template image
      const templateUrl = currentProduct.template;
      
      fabric.Image.fromURL(templateUrl, (img) => {
        if (img) {
          // Scale image to fit canvas
          img.scaleToWidth(800);
          img.scaleToHeight(800);
          img.set({
            left: 0,
            top: 0,
            selectable: false,
            evented: false,
            excludeFromExport: false
          });
          
          canvas.add(img);
          canvas.sendToBack(img);
          
          // Apply color tint if needed (for products that support color changes)
          if (selectedColor !== '#ffffff' && currentProduct.colors.includes(selectedColor)) {
            img.set('fill', selectedColor);
          }
          
          setTemplateLoaded(true);
          updatePrintAreaOverlay();
          canvas.renderAll();
        }
      }, {
        crossOrigin: 'anonymous'
      });
      
    } catch (error) {
      console.error('Error loading template:', error);
      setTemplateLoaded(true); // Still allow design even if template fails
    }
  };

  const updatePrintAreaOverlay = () => {
    if (!canvas || !currentPrintArea) return;

    // Remove existing print area overlay
    const existingOverlay = canvas.getObjects().find(obj => obj.id === 'printAreaOverlay');
    if (existingOverlay) {
      canvas.remove(existingOverlay);
    }

    // Create print area overlay
    const overlay = new fabric.Rect({
      left: currentPrintArea.x,
      top: currentPrintArea.y,
      width: currentPrintArea.width,
      height: currentPrintArea.height,
      fill: 'rgba(0, 123, 255, 0.1)',
      stroke: '#007bff',
      strokeWidth: 2,
      strokeDashArray: [5, 5],
      selectable: false,
      evented: false,
      excludeFromExport: true,
      id: 'printAreaOverlay'
    });

    canvas.add(overlay);
    
    // Move overlay to front by removing and re-adding it
    try {
      canvas.remove(overlay);
      canvas.add(overlay);
    } catch (error) {
      console.warn('Could not move overlay to front:', error);
    }
    
    canvas.renderAll();
  };

  // Check user authentication
  useEffect(() => {
    const checkUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking user:', error);
      }
    };

    checkUser();

    // Fixed: In Supabase v2, onAuthStateChange returns the subscription directly
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user || null);
      if (event === 'SIGNED_IN') {
        setShowAuth(false);
      }
    });

    return () => {
      if (subscription && typeof subscription.unsubscribe === 'function') {
        subscription.unsubscribe();
      }
    };
  }, []);

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (authMode === 'login') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        alert('Check your email for the confirmation link!');
      }
    } catch (error) {
      alert(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const addText = () => {
    if (!canvas || !currentPrintArea) return;

    const text = new fabric.IText('Your Text Here', {
      left: currentPrintArea.x + currentPrintArea.width / 2,
      top: currentPrintArea.y + currentPrintArea.height / 2,
      fontFamily: 'Arial',
      fontSize: 24,
      fill: '#000000',
      originX: 'center',
      originY: 'center'
    });

    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  };

  const addShape = (shapeType) => {
    if (!canvas || !currentPrintArea) return;

    let shape;
    const centerX = currentPrintArea.x + currentPrintArea.width / 2;
    const centerY = currentPrintArea.y + currentPrintArea.height / 2;

    if (shapeType === 'rectangle') {
      shape = new fabric.Rect({
        left: centerX,
        top: centerY,
        width: 100,
        height: 60,
        fill: '#ff0000',
        originX: 'center',
        originY: 'center'
      });
    } else if (shapeType === 'circle') {
      shape = new fabric.Circle({
        left: centerX,
        top: centerY,
        radius: 50,
        fill: '#00ff00',
        originX: 'center',
        originY: 'center'
      });
    }

    if (shape) {
      canvas.add(shape);
      canvas.setActiveObject(shape);
      canvas.renderAll();
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (!file || !canvas || !currentPrintArea) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      fabric.Image.fromURL(event.target.result, (img) => {
        // Scale image to fit within print area
        const maxWidth = currentPrintArea.maxWidth || currentPrintArea.width;
        const maxHeight = currentPrintArea.maxHeight || currentPrintArea.height;
        
        if (img.width > maxWidth || img.height > maxHeight) {
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          const scale = Math.min(scaleX, scaleY);
          img.scale(scale);
        }

        img.set({
          left: currentPrintArea.x + currentPrintArea.width / 2,
          top: currentPrintArea.y + currentPrintArea.height / 2,
          originX: 'center',
          originY: 'center'
        });

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
      });
    };
    reader.readAsDataURL(file);
  };

  const deleteSelected = () => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    activeObjects.forEach(obj => {
      if (obj.id !== 'printAreaOverlay') {
        canvas.remove(obj);
      }
    });
    canvas.discardActiveObject();
    canvas.renderAll();
  };

  const rotateSelected = (direction) => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.id !== 'printAreaOverlay') {
      const currentAngle = activeObject.angle || 0;
      activeObject.rotate(currentAngle + (direction === 'left' ? -15 : 15));
      canvas.renderAll();
    }
  };

  const exportDesign = () => {
    if (!canvas) return;

    // Hide print area overlay for export
    const overlay = canvas.getObjects().find(obj => obj.id === 'printAreaOverlay');
    if (overlay) {
      overlay.set('visible', false);
    }

    // Hide watermark if needed
    const watermark = canvas.getObjects().find(obj => obj.id === 'watermark');
    if (watermark && !watermarkVisible) {
      watermark.set('visible', false);
    }

    canvas.renderAll();

    // Export as image
    const dataURL = canvas.toDataURL({
      format: 'png',
      quality: 1,
      multiplier: 1
    });

    // Create download link
    const link = document.createElement('a');
    link.download = `${currentProduct.name.toLowerCase().replace(/\s+/g, '-')}-design.png`;
    link.href = dataURL;
    link.click();

    // Restore overlay visibility
    if (overlay) {
      overlay.set('visible', true);
    }
    if (watermark) {
      watermark.set('visible', watermarkVisible);
    }
    canvas.renderAll();
  };

  const exportPDF = () => {
    if (!canvas) return;

    // Hide overlays for export
    const overlay = canvas.getObjects().find(obj => obj.id === 'printAreaOverlay');
    if (overlay) overlay.set('visible', false);

    const watermark = canvas.getObjects().find(obj => obj.id === 'watermark');
    if (watermark && !watermarkVisible) watermark.set('visible', false);

    canvas.renderAll();

    // Create PDF
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const imgData = canvas.toDataURL('image/png');
    pdf.addImage(imgData, 'PNG', 10, 10, 190, 190);
    pdf.save(`${currentProduct.name.toLowerCase().replace(/\s+/g, '-')}-design.pdf`);

    // Restore visibility
    if (overlay) overlay.set('visible', true);
    if (watermark) watermark.set('visible', watermarkVisible);
    canvas.renderAll();
  };

  const saveDesign = async () => {
    if (!canvas || !user) {
      alert('Please sign in to save your design');
      return;
    }

    try {
      const designData = {
        canvas_data: JSON.stringify(canvas.toJSON()),
        product_type: selectedProduct,
        product_color: selectedColor,
        print_area: printArea,
        user_id: user.id,
        created_at: new Date().toISOString()
      };

      const { error } = await supabase
        .from('designs')
        .insert([designData]);

      if (error) throw error;
      alert('Design saved successfully!');
    } catch (error) {
      console.error('Error saving design:', error);
      alert('Error saving design. Please try again.');
    }
  };

  // Get available print areas for current product
  const availablePrintAreas = currentProduct ? Object.keys(currentProduct.printAreas) : [];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-gray-900">Design Studio</h1>
            
            <div className="flex items-center space-x-4">
              {user ? (
                <div className="flex items-center space-x-2">
                  <User className="w-5 h-5" />
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <button
                    onClick={handleSignOut}
                    className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sign Out</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuth(true)}
                  className="flex items-center space-x-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  <LogIn className="w-4 h-4" />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar - Product Selection */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Product
                  </label>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {Object.entries(productsConfig).map(([key, product]) => (
                      <option key={key} value={key}>
                        {product.name} - ${product.basePrice}
                      </option>
                    ))}
                  </select>
                </div>

                {currentProduct && currentProduct.colors.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Color
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {currentProduct.colors.map((color) => (
                        <button
                          key={color}
                          onClick={() => setSelectedColor(color)}
                          className={`w-8 h-8 rounded-full border-2 ${
                            selectedColor === color ? 'border-blue-500' : 'border-gray-300'
                          }`}
                          style={{ backgroundColor: color }}
                          title={color}
                        />
                      ))}
                    </div>
                  </div>
                )}

                {availablePrintAreas.length > 1 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Print Area
                    </label>
                    <select
                      value={printArea}
                      onChange={(e) => setPrintArea(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {availablePrintAreas.map((area) => (
                        <option key={area} value={area}>
                          {currentProduct.printAreas[area].name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Center - Canvas */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold">Design Canvas</h3>
                <div className="text-sm text-gray-500">
                  {templateLoaded ? 'Template Loaded' : 'Loading Template...'}
                </div>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <canvas ref={canvasRef} />
              </div>
            </div>
          </div>

          {/* Right Sidebar - Tools */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm p-6">
              <h3 className="text-lg font-semibold mb-4">Tools</h3>
              
              <div className="space-y-4">
                {/* Add Elements */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Add Elements</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={addText}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                    >
                      <Type className="w-4 h-4" />
                      <span>Text</span>
                    </button>
                    
                    <button
                      onClick={() => addShape('rectangle')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm"
                    >
                      <Square className="w-4 h-4" />
                      <span>Rect</span>
                    </button>
                    
                    <button
                      onClick={() => addShape('circle')}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 text-sm"
                    >
                      <Circle className="w-4 h-4" />
                      <span>Circle</span>
                    </button>
                    
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="flex items-center justify-center space-x-1 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Image</span>
                    </button>
                  </div>
                  
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                </div>

                {/* Transform Tools */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Transform</h4>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      onClick={() => rotateSelected('left')}
                      className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      <RotateCcw className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={() => rotateSelected('right')}
                      className="flex items-center justify-center px-3 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                    >
                      <RotateCw className="w-4 h-4" />
                    </button>
                    
                    <button
                      onClick={deleteSelected}
                      className="flex items-center justify-center px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Export Tools */}
                <div>
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Export</h4>
                  <div className="space-y-2">
                    <button
                      onClick={exportDesign}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      <FileImage className="w-4 h-4" />
                      <span>Export PNG</span>
                    </button>
                    
                    <button
                      onClick={exportPDF}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                    >
                      <FileText className="w-4 h-4" />
                      <span>Export PDF</span>
                    </button>
                    
                    <button
                      onClick={saveDesign}
                      className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                    >
                      <Save className="w-4 h-4" />
                      <span>Save Design</span>
                    </button>
                  </div>
                </div>

                {/* Watermark Toggle */}
                <div>
                  <button
                    onClick={() => setWatermarkVisible(!watermarkVisible)}
                    className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                  >
                    {watermarkVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                    <span>{watermarkVisible ? 'Hide' : 'Show'} Watermark</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Modal */}
      {showAuth && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-8 max-w-md w-full mx-4">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold">
                {authMode === 'login' ? 'Sign In' : 'Sign Up'}
              </h2>
              <button
                onClick={() => setShowAuth(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                ×
              </button>
            </div>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading ? 'Loading...' : (authMode === 'login' ? 'Sign In' : 'Sign Up')}
              </button>
            </form>

            <div className="mt-4 text-center">
              <button
                onClick={() => setAuthMode(authMode === 'login' ? 'signup' : 'login')}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {authMode === 'login' 
                  ? "Don't have an account? Sign up" 
                  : "Already have an account? Sign in"
                }
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Designer;
