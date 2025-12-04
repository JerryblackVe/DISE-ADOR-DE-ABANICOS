
import React, { useState, useRef, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import OrderForm from './components/OrderForm';
import AdminPanel from './components/AdminPanel';
import { generatePattern } from './services/geminiService';
import { Settings, ShoppingBag, Layers, Box, Download, Moon, Sun } from 'lucide-react';
import { DEFAULT_FAN_PATH, DEFAULT_POLYMER_IMAGE } from './constants';
import { AppView, Order, FanType, CustomFont } from './types';

// Declare fabric
declare const fabric: any;

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.EDITOR);
  const [canvas, setCanvas] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  
  // -- PERSISTENT SETTINGS --
  
  // 1. Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
      const saved = localStorage.getItem('dark_mode');
      if (saved) return JSON.parse(saved);
      // Fallback to system preference if no user setting
      if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
  });

  // 2. Custom Logo
  const [logoSrc, setLogoSrc] = useState<string>(() => {
      return localStorage.getItem('custom_logo') || '/logo.png';
  });

  // 3. Cloth Template (SVG Path)
  const [clothFanPath, setClothFanPath] = useState<string>(() => {
    return localStorage.getItem('custom_fan_template') || DEFAULT_FAN_PATH;
  });

  // 4. Polymer Template (PNG Data URL)
  const [polymerFanImage, setPolymerFanImage] = useState<string>(() => {
    return localStorage.getItem('custom_polymer_image') || DEFAULT_POLYMER_IMAGE;
  });

  // 5. Custom Fonts
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => {
    const saved = localStorage.getItem('custom_fonts');
    return saved ? JSON.parse(saved) : [];
  });

  // Load Custom Fonts into DOM
  useEffect(() => {
    customFonts.forEach(font => {
      // @ts-ignore
      const fontFace = new FontFace(font.name, `url(${font.data})`);
      fontFace.load().then((loadedFace: any) => {
        (document.fonts as any).add(loadedFace);
      }).catch((e: any) => console.error("Error loading font:", font.name, e));
    });
  }, [customFonts]);

  // Apply Dark Mode Effect
  useEffect(() => {
      if (isDarkMode) {
          document.documentElement.classList.add('dark');
      } else {
          document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('dark_mode', JSON.stringify(isDarkMode));
  }, [isDarkMode]);
  
  // -- MODE STATE --
  const [fanType, setFanType] = useState<FanType>('cloth');
  
  // -- COLORS --
  const [selectedColor, setSelectedColor] = useState<string>('#ffffff'); // Background/Blade Color
  const [ribColor, setRibColor] = useState<string>('#ffffff'); // Frame Color (Polymer only)
  
  const [orders, setOrders] = useState<Order[]>([]);

  // --- MODE SWITCHING ---
  const toggleFanType = (type: FanType) => {
      setFanType(type);
      // Set defaults as per requirements
      if (type === 'polymer') {
          // Polymer Defaults: Background White, Frame Black
          setSelectedColor('#ffffff'); 
          setRibColor('#000000'); 
      } else {
          // Cloth Default: White
          setSelectedColor('#ffffff'); 
      }
      // Clear canvas selection to avoid bugs
      if(canvas) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setSelectedObject(null);
      }
  };

  const toggleDarkMode = () => {
      setIsDarkMode(!isDarkMode);
  };

  // --- WRAPPER FOR RIB COLOR CHANGE (SYNC IMAGES) ---
  const handleRibColorChange = (newColor: string) => {
      setRibColor(newColor);
      
      // If in polymer mode, update all existing images to match this color
      if (canvas && fanType === 'polymer') {
          const objects = canvas.getObjects();
          let needsRender = false;

          objects.forEach((obj: any) => {
              if (obj.type === 'image' && obj.data?.id !== 'fan-background' && obj.data?.id !== 'fan-outline') {
                  // Apply Grayscale + Tint
                  const grayscale = new fabric.Image.filters.Grayscale();
                  const blend = new fabric.Image.filters.BlendColor({
                      color: newColor,
                      mode: 'tint',
                      alpha: 1
                  });
                  obj.filters = [grayscale, blend];
                  obj.applyFilters();
                  needsRender = true;
              }
          });

          if (needsRender) {
              canvas.renderAll();
          }
      }
  };

  // --- CANVAS HELPERS ---
  
  const addToCanvas = (obj: any) => {
    if (!canvas) return;

    // 1. Center the object on the view
    canvas.centerObject(obj);
    
    // 2. Add to canvas
    canvas.add(obj);

    // 3. Manage Z-Index Layering to ensure visibility
    // Rule: Background < Object < Outline/Frame
    const bg = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
    if (bg) canvas.sendToBack(bg);

    const outline = canvas.getObjects().find((o: any) => o.data?.id === 'fan-outline');
    if (outline) canvas.bringToFront(outline);

    // 4. Important: Update coords
    obj.setCoords();

    // 5. Select the new object
    canvas.setActiveObject(obj);
    canvas.renderAll();
  };

  // Algoritmo de eliminación de fondo blanco (Client-side)
  const removeWhiteBackground = (imageElement: HTMLImageElement): string => {
      const canvas = document.createElement('canvas');
      canvas.width = imageElement.naturalWidth || imageElement.width;
      canvas.height = imageElement.naturalHeight || imageElement.height;
      const ctx = canvas.getContext('2d');
      if(!ctx) return imageElement.src;

      ctx.drawImage(imageElement, 0, 0);
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;

      // Recorremos los píxeles (RGBA)
      for (let i = 0; i < data.length; i += 4) {
          const r = data[i];
          const g = data[i + 1];
          const b = data[i + 2];
          
          // Detectar blanco o muy claro (Umbral > 230)
          if (r > 230 && g > 230 && b > 230) {
              data[i + 3] = 0; // Alpha a 0 (Transparente)
          }
      }

      ctx.putImageData(imgData, 0, 0);
      return canvas.toDataURL('image/png');
  };

  // --- ACTIONS ---

  const handleAddText = () => {
    if (!canvas) return;
    // In Polymer mode, default text color matches the rib/frame color
    const initialColor = fanType === 'polymer' ? ribColor : '#333333';
    
    const text = new fabric.IText('Tu Texto', {
      fontFamily: 'Arial',
      fill: initialColor,
      fontSize: 40,
      fontWeight: 'bold',
      left: 100, 
      top: 100
    });
    addToCanvas(text);
  };

  const handleAddImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!canvas || !e.target.files?.[0]) return;
    
    setIsProcessing(true);
    const reader = new FileReader();
    
    reader.onload = (f) => {
      const rawSrc = f.target?.result as string;
      
      // Create a temporary HTML Image to process
      const tempImg = new Image();
      tempImg.src = rawSrc;
      tempImg.onload = () => {
          
          // 1. AUTO BACKGROUND REMOVAL
          const cleanSrc = removeWhiteBackground(tempImg);

          fabric.Image.fromURL(cleanSrc, (img: any) => {
            // Scale down if image is huge
            if (img.width > 300) {
                img.scaleToWidth(300);
            }
            
            // Reset origin
            img.set({ originX: 'center', originY: 'center' });
            
            // 2. POLYMER LOGIC: ENFORCE FRAME COLOR
            if (fanType === 'polymer') {
                const grayscale = new fabric.Image.filters.Grayscale();
                const blend = new fabric.Image.filters.BlendColor({
                    color: ribColor,
                    mode: 'tint',
                    alpha: 1
                });
                
                img.filters = [grayscale, blend];
                img.applyFilters();
            }

            addToCanvas(img);
            setIsProcessing(false);
            e.target.value = '';
          }, { crossOrigin: 'anonymous' });
      };
    };
    reader.readAsDataURL(e.target.files[0]);
  };

  const handleRemoveBackground = async () => {
    const activeObject = canvas?.getActiveObject();
    if (!canvas || !activeObject || activeObject.type !== 'image') {
        alert("Selecciona una imagen primero.");
        return;
    }
    
    setIsProcessing(true);

    try {
        const imgElement = activeObject.getElement();
        const newSrc = removeWhiteBackground(imgElement);

        activeObject.setSrc(newSrc, () => {
            canvas.renderAll();
            setIsProcessing(false);
            if(activeObject.filters && activeObject.filters.length > 0) {
                activeObject.applyFilters();
            }
            setSelectedObject({...activeObject});
        });

    } catch (error) {
        console.error("Error quitando fondo:", error);
        alert("Hubo un error al procesar la imagen.");
        setIsProcessing(false);
    }
  };

  const handleGenerateAI = async () => {
    if (!(window as any).aistudio.hasSelectedApiKey()) {
        await (window as any).aistudio.openSelectKey();
    }

    const userPrompt = window.prompt("Describe el patrón o ilustración que quieres generar:");
    if (!userPrompt || !canvas) return;

    setIsProcessing(true);
    const resultUrl = await generatePattern(userPrompt);
    
    if (resultUrl) {
      fabric.Image.fromURL(resultUrl, (img: any) => {
        if (img.width > 400) img.scaleToWidth(400);
        img.set({ originX: 'center', originY: 'center' });
        
        if (fanType === 'polymer') {
             const grayscale = new fabric.Image.filters.Grayscale();
             const blend = new fabric.Image.filters.BlendColor({
                 color: ribColor,
                 mode: 'tint',
                 alpha: 1
             });
             img.filters = [grayscale, blend];
             img.applyFilters();
        }

        addToCanvas(img);
      }, { crossOrigin: 'anonymous' });
    } else {
      alert("No se pudo generar la imagen.");
    }
    setIsProcessing(false);
  };

  const updateObject = (prop: string, value: any) => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (!activeObject) return;
    
    if (prop === 'deselect') {
        canvas.discardActiveObject();
        canvas.renderAll();
        setSelectedObject(null);
        return;
    }

    if (activeObject.type === 'image') {
        let currentFilters = activeObject.filters || [];
        const findFilterIndex = (type: string) => currentFilters.findIndex((f: any) => f.type === type);

        if (prop === 'invert-image') {
            const idx = findFilterIndex('Invert');
            if (value === true) {
                if (idx === -1) currentFilters.push(new fabric.Image.filters.Invert());
            } else {
                if (idx !== -1) currentFilters.splice(idx, 1);
            }
        } 
        else if (prop === 'image-filter-color') {
            const idx = findFilterIndex('BlendColor');
            if (idx !== -1) currentFilters.splice(idx, 1);

            if (value) {
                const blend = new fabric.Image.filters.BlendColor({
                    color: value,
                    mode: 'tint',
                    alpha: 1
                });
                currentFilters.push(blend);
            }
        } else if (!prop.includes('.')) {
             activeObject.set(prop, value);
        }

        activeObject.filters = currentFilters;
        activeObject.applyFilters();
        canvas.renderAll();
        setSelectedObject({...activeObject});
        return;
    }

    if (prop.includes('.')) {
        const [parent, child] = prop.split('.');
        if (parent === 'shadow') {
            const currentShadow = activeObject.shadow || new fabric.Shadow({ blur: 10, offsetX: 5, offsetY: 5, color: 'rgba(0,0,0,0.5)' });
            currentShadow[child] = value;
            activeObject.set('shadow', currentShadow);
        }
    } else {
        activeObject.set(prop, value);
    }
    
    canvas.renderAll();
    setSelectedObject({...activeObject}); 
  };

  const handleMatchRibColor = () => {
    if(!canvas) return;
    const activeObject = canvas.getActiveObject();
    if(!activeObject) return;

    if(activeObject.type === 'image') {
        updateObject('image-filter-color', ribColor);
    } else {
        updateObject('fill', ribColor);
    }
  };

  const deleteObject = () => {
      const activeObject = canvas?.getActiveObject();
      if(canvas && activeObject) {
          canvas.remove(activeObject);
          setSelectedObject(null);
      }
  }

  // --- SETTINGS UPDATES (ADMIN) ---
  const handleTemplateUpdate = (newData: string, type: FanType) => {
      if (type === 'cloth') {
          setClothFanPath(newData);
          localStorage.setItem('custom_fan_template', newData);
      } else {
          setPolymerFanImage(newData);
          localStorage.setItem('custom_polymer_image', newData);
      }
  };

  const handleLogoUpdate = (newLogo: string) => {
      setLogoSrc(newLogo);
      localStorage.setItem('custom_logo', newLogo);
  };

  const handleUpdateFonts = (fonts: CustomFont[]) => {
      setCustomFonts(fonts);
      localStorage.setItem('custom_fonts', JSON.stringify(fonts));
  };

  // --- ORDER FLOW ---

  const handleProceedToCheckout = () => {
    if(!canvas) return;
    const dataUrl = canvas.toDataURL({ format: 'png', quality: 1, multiplier: 2 });
    setPreviewImage(dataUrl);
    setCurrentView(AppView.CHECKOUT);
  }

  const handleOrderSubmit = (formData: any) => {
    const newOrder: Order = {
        id: Date.now().toString(),
        customer: formData,
        designThumbnail: previewImage,
        designData: canvas.toJSON(),
        quantity: formData.quantity,
        status: 'pending',
        createdAt: new Date()
    };
    setOrders([newOrder, ...orders]);
    setCurrentView(AppView.SUCCESS);
  };

  // --- DOWNLOAD PNG ---
  const handleDownloadImage = () => {
      if(!canvas) return;

      const originalBg = canvas.backgroundColor;
      canvas.backgroundColor = null;
      canvas.renderAll();

      const dataURL = canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier: 3,
          enableRetinaScaling: true
      });

      canvas.backgroundColor = originalBg;
      canvas.renderAll();

      const link = document.createElement('a');
      link.href = dataURL;
      link.download = `Abanico_Diseno_${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  // --- Z-INDEX CONTROLS ---

  const sendToBack = () => {
      const activeObject = canvas?.getActiveObject();
      if(!canvas || !activeObject) return;
      canvas.sendToBack(activeObject);
      const bg = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
      if(bg) canvas.sendToBack(bg);
      canvas.renderAll();
  };

  const bringToFront = () => {
      const activeObject = canvas?.getActiveObject();
      if(!canvas || !activeObject) return;
      canvas.bringToFront(activeObject);
      const outline = canvas.getObjects().find((o: any) => o.data?.id === 'fan-outline');
      if(outline) canvas.bringToFront(outline);
      canvas.renderAll();
  };

  // --- VIEW RENDER ---

  if (currentView === AppView.ADMIN) {
      return (
        <AdminPanel 
            orders={orders} 
            onBack={() => setCurrentView(AppView.EDITOR)} 
            onTemplateUpdate={handleTemplateUpdate}
            onLogoUpdate={handleLogoUpdate}
            customFonts={customFonts}
            onUpdateFonts={handleUpdateFonts}
        />
      );
  }

  if (currentView === AppView.CHECKOUT) {
      return <OrderForm previewImage={previewImage} onSubmit={handleOrderSubmit} onCancel={() => setCurrentView(AppView.EDITOR)} />;
  }

  if (currentView === AppView.SUCCESS) {
      return (
          <div className="min-h-screen bg-green-50 dark:bg-gray-900 flex flex-col items-center justify-center text-center p-8">
              <div className="w-20 h-20 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center text-green-600 dark:text-green-300 mb-6">
                  <ShoppingBag size={40} />
              </div>
              <h1 className="text-4xl font-serif font-bold text-gray-900 dark:text-white mb-4">¡Gracias por tu pedido!</h1>
              <p className="text-lg text-gray-600 dark:text-gray-300 mb-8 max-w-md">Hemos recibido tu diseño correctamente.</p>
              <button 
                onClick={() => setCurrentView(AppView.EDITOR)}
                className="px-8 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium"
              >
                  Crear Nuevo Diseño
              </button>
          </div>
      )
  }

  return (
    <div className="flex h-screen w-full bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans transition-colors duration-200">
      <Toolbar 
        onAddText={handleAddText}
        onAddImage={handleAddImage}
        onColorChange={setSelectedColor}
        selectedObject={selectedObject}
        onUpdateObject={updateObject}
        onDelete={deleteObject}
        onGenerateAI={handleGenerateAI}
        onRemoveBackground={handleRemoveBackground}
        isProcessing={isProcessing}
        onUndo={() => {}}
        onRedo={() => {}}
        onSendToBack={sendToBack}
        onBringToFront={bringToFront}
        backgroundColor={selectedColor}
        fanType={fanType}
        onRibColorChange={handleRibColorChange}
        ribColor={ribColor}
        onMatchRibColor={handleMatchRibColor}
        customFonts={customFonts}
      />

      <div className="flex-1 flex flex-col h-full relative">
        <header className="h-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center px-6 shadow-sm z-10 transition-colors">
           <div className="flex items-center gap-4">
              {/* LOGO SECTION - Dynamic from State */}
              <div className="h-12 w-12 rounded-full overflow-hidden border-2 border-orange-200 dark:border-orange-900 shadow-sm relative group bg-white flex items-center justify-center">
                 <img
                   src={logoSrc} 
                   alt="FP"
                   className="h-full w-full object-cover"
                   onError={(e) => {
                       (e.target as HTMLImageElement).style.display = 'none';
                       (e.target as HTMLImageElement).parentElement!.innerHTML = '<span class="text-xs font-bold text-orange-500">FP</span>';
                   }}
                 />
              </div>
              
              <div className="flex flex-col">
                  <h1 className="text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight uppercase" style={{ fontFamily: 'Inter, sans-serif' }}>
                      Diseñador de Abanicos
                  </h1>
                  <span className="text-[10px] font-bold text-orange-500 tracking-[0.2em] uppercase mt-1">
                      Fantastic Plastik
                  </span>
              </div>

              <div className="h-8 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden md:block"></div>
              
              {/* MODE SWITCHER */}
              <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg hidden md:flex">
                  <button 
                    onClick={() => toggleFanType('cloth')}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${fanType === 'cloth' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                     <Layers size={14} className="inline mr-1 mb-0.5" /> Tela
                  </button>
                  <button 
                    onClick={() => toggleFanType('polymer')}
                    className={`px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${fanType === 'polymer' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                  >
                     <Box size={14} className="inline mr-1 mb-0.5" /> Polímero
                  </button>
              </div>
           </div>
           
           <div className="flex items-center space-x-3">
               <button 
                 onClick={toggleDarkMode}
                 className="p-2 text-gray-400 hover:text-yellow-500 dark:text-gray-300 dark:hover:text-yellow-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                 title="Modo Oscuro/Claro"
               >
                   {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
               
               <button 
                 onClick={() => setCurrentView(AppView.ADMIN)}
                 className="p-2 text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors"
                 title="Configuración"
               >
                   <Settings size={20} />
               </button>
               <button
                onClick={handleDownloadImage}
                className="flex items-center px-3 py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded transition-colors"
                title="Descargar Imagen"
               >
                   <span className="text-xs font-bold mr-2">Descargar PNG</span>
                   <Download size={20} />
               </button>
               <button 
                onClick={handleProceedToCheckout}
                className="px-6 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-transform active:scale-95 text-xs uppercase tracking-wide"
               >
                  Finalizar Diseño
               </button>
           </div>
        </header>

        {/* Mobile Mode Switcher */}
        <div className="md:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex justify-center">
             <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg w-full max-w-xs">
                  <button 
                    onClick={() => toggleFanType('cloth')}
                    className={`flex-1 px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${fanType === 'cloth' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                     Tela
                  </button>
                  <button 
                    onClick={() => toggleFanType('polymer')}
                    className={`flex-1 px-4 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${fanType === 'polymer' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}
                  >
                     Polímero
                  </button>
              </div>
        </div>

        <Editor 
            onCanvasReady={setCanvas}
            onSelectionChange={setSelectedObject}
            selectedColor={selectedColor}
            fanPath={clothFanPath}
            polymerImage={polymerFanImage}
            fanType={fanType}
            ribColor={ribColor}
            isDarkMode={isDarkMode}
        />
      </div>
    </div>
  );
}

export default App;
