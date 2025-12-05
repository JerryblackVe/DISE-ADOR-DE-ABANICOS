
import React, { useState, useRef, useEffect } from 'react';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import OrderForm from './components/OrderForm';
import AdminPanel from './components/AdminPanel';
import { generatePattern } from './services/geminiService';
import { Settings, ShoppingBag, Layers, Box, Download, Moon, Sun, Edit3, Check } from 'lucide-react';
import { DEFAULT_FAN_PATH, POLYMER_MODELS, DEFAULT_LOGO, DEFAULT_CLOTH_SVG_URL, SOCIAL_WHATSAPP_ICON, SOCIAL_INSTAGRAM_ICON } from './constants';
import { AppView, Order, FanType, CustomFont } from './types';
import HelpTooltip from './components/HelpTooltip';

// Declare fabric
declare const fabric: any;

// Helper: Image Compressor to prevent localStorage quota exceeded errors
const compressImage = (base64Str: string, maxWidth: number, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx?.drawImage(img, 0, 0, width, height);
            
            resolve(canvas.toDataURL('image/png', quality));
        };
        img.onerror = () => resolve(base64Str); // Fallback
    });
};

function App() {
  const [currentView, setCurrentView] = useState<AppView>(AppView.EDITOR);
  const [canvas, setCanvas] = useState<any>(null);
  const [selectedObject, setSelectedObject] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [previewImage, setPreviewImage] = useState<string>('');
  
  // -- MOBILE UI STATE --
  const [isMobileToolsOpen, setIsMobileToolsOpen] = useState(false);
  
  // -- PERSISTENT SETTINGS --
  
  // 1. Dark Mode
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
      try {
        const saved = localStorage.getItem('dark_mode');
        if (saved) return JSON.parse(saved);
      } catch (e) { console.error("Error reading dark mode", e); }
      
      if (typeof window !== 'undefined' && window.matchMedia) {
          return window.matchMedia('(prefers-color-scheme: dark)').matches;
      }
      return false;
  });

  // 2. Custom Logo
  const [logoSrc, setLogoSrc] = useState<string>(() => {
      return localStorage.getItem('custom_logo') || DEFAULT_LOGO;
  });

  // 3. Cloth Template (SVG Path)
  const [clothFanPath, setClothFanPath] = useState<string>(() => {
    return localStorage.getItem('custom_fan_template') || DEFAULT_FAN_PATH;
  });

  // 4. Polymer Template (PNG Image) - Active Image Data
  const [polymerFanImage, setPolymerFanImage] = useState<string>('');
  
  // New State for Selected Polymer Model ID
  const [selectedPolymerId, setSelectedPolymerId] = useState<string>(POLYMER_MODELS[0].id);

  // 5. Custom Fonts
  const [customFonts, setCustomFonts] = useState<CustomFont[]>(() => {
    try {
        const saved = localStorage.getItem('custom_fonts');
        return saved ? JSON.parse(saved) : [];
    } catch (e) { return []; }
  });

  // INITIALIZATION: Fetch Default Cloth SVG
  useEffect(() => {
    // 1. Cloth
    const savedTemplate = localStorage.getItem('custom_fan_template');
    const isOldDefault = savedTemplate && savedTemplate.startsWith("M -280");
    
    if (!savedTemplate || isOldDefault) {
        console.log("Fetching updated Cloth SVG...");
        fetch(`${DEFAULT_CLOTH_SVG_URL}?t=${Date.now()}`)
            .then(res => res.text())
            .then(svgText => {
                if (!svgText.includes('<svg') && !svgText.includes('<path')) return;
                const parser = new DOMParser();
                const doc = parser.parseFromString(svgText, "image/svg+xml");
                const pathElement = doc.querySelector('path');
                const pathData = pathElement?.getAttribute('d');
                if (pathData) {
                    setClothFanPath(pathData);
                    localStorage.setItem('custom_fan_template', pathData);
                }
            })
            .catch(e => console.error("Error fetching cloth SVG:", e));
    }
  }, []);

  // POLYMER MODEL LOADER
  const loadPolymerModel = async (modelId: string) => {
    setIsProcessing(true);
    try {
        const model = POLYMER_MODELS.find(m => m.id === modelId) || POLYMER_MODELS[0];
        console.log("Loading Polymer Model:", model.name);
        
        const response = await fetch(`${model.url}?t=${Date.now()}`);
        const blob = await response.blob();
        
        const reader = new FileReader();
        reader.onloadend = () => {
            const base64data = reader.result as string;
            setPolymerFanImage(base64data);
            setIsProcessing(false);
        };
        reader.readAsDataURL(blob);
    } catch (e) {
        console.error("Error fetching polymer model:", e);
        setIsProcessing(false);
    }
  };

  // Initial Polymer Load or Model Change
  useEffect(() => {
     loadPolymerModel(selectedPolymerId);
  }, [selectedPolymerId]);


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
      if (type === 'polymer') {
          // Polymer Defaults
          setSelectedColor('#ffffff'); 
          setRibColor('#000000'); 
      } else {
          // Cloth Default
          setSelectedColor('#ffffff'); 
      }
      if(canvas) {
          canvas.discardActiveObject();
          canvas.requestRenderAll();
          setSelectedObject(null);
      }
  };

  const handlePolymerModelChange = (id: string) => {
      setSelectedPolymerId(id);
      // Trigger loader via effect
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
      
      const tempImg = new Image();
      tempImg.src = rawSrc;
      tempImg.onload = () => {
          
          const cleanSrc = removeWhiteBackground(tempImg);

          fabric.Image.fromURL(cleanSrc, (img: any) => {
            if (img.width > 300) {
                img.scaleToWidth(300);
            }
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
        alert("Hubo un error al procesar el imagen.");
        setIsProcessing(false);
    }
  };

  const handleGenerateAI = async () => {
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
      alert("No se pudo generar la imagen. Verifica que la API KEY esté configurada en Vercel.");
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
  const handleTemplateUpdate = async (newData: string, type: FanType) => {
      try {
          if (type === 'cloth') {
              setClothFanPath(newData);
              localStorage.setItem('custom_fan_template', newData);
          } else {
              const compressed = await compressImage(newData, 1024);
              setPolymerFanImage(compressed);
              // We don't save polymer override in this mode since we use presets,
              // but keeping it for compatibility if needed.
          }
      } catch (e) {
          console.error("Storage error:", e);
          alert("Error al guardar la plantilla.");
      }
  };

  const handleLogoUpdate = async (newLogo: string) => {
      try {
          const compressedLogo = await compressImage(newLogo, 200);
          setLogoSrc(compressedLogo);
          localStorage.setItem('custom_logo', compressedLogo);
      } catch (e) {
          console.error("Storage error:", e);
          alert("Error: El logo es demasiado grande.");
      }
  };

  const handleUpdateFonts = (fonts: CustomFont[]) => {
      try {
        setCustomFonts(fonts);
        localStorage.setItem('custom_fonts', JSON.stringify(fonts));
      } catch (e) {
        alert("Error: Las fuentes son demasiado pesadas.");
      }
  };

  const handleExportConfig = () => {
      const config = {
          custom_logo: logoSrc,
          custom_fan_template: clothFanPath,
          custom_fonts: customFonts,
          admin_password: localStorage.getItem('admin_password') || 'Valeria.1'
      };
      
      const blob = new Blob([JSON.stringify(config)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `config_abanicos_${Date.now()}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  };

  const handleImportConfig = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const config = JSON.parse(event.target?.result as string);
              if(config.custom_logo) setLogoSrc(config.custom_logo);
              if(config.custom_fan_template) setClothFanPath(config.custom_fan_template);
              if(config.custom_fonts) setCustomFonts(config.custom_fonts);
              if(config.admin_password) localStorage.setItem('admin_password', config.admin_password);
              
              localStorage.setItem('custom_logo', config.custom_logo || DEFAULT_LOGO);
              
              alert("Configuración importada exitosamente. La página se recargará.");
              window.location.reload();
          } catch(err) {
              alert("Error al importar el archivo de configuración.");
          }
      };
      reader.readAsText(file);
  };

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

  if (currentView === AppView.ADMIN) {
      return (
        <AdminPanel 
            orders={orders} 
            onBack={() => setCurrentView(AppView.EDITOR)} 
            onTemplateUpdate={handleTemplateUpdate}
            onLogoUpdate={handleLogoUpdate}
            customFonts={customFonts}
            onUpdateFonts={handleUpdateFonts}
            onExportConfig={handleExportConfig}
            onImportConfig={handleImportConfig}
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
    <div className="flex flex-col md:flex-row h-[100dvh] w-full bg-gray-50 dark:bg-gray-900 overflow-hidden font-sans transition-colors duration-200">
      
      {/* TOOLBAR WRAPPER */}
      <div className={`
          fixed bottom-0 left-0 w-full h-[45vh] z-40 bg-white dark:bg-gray-800 shadow-[0_-4px_20px_rgba(0,0,0,0.15)] rounded-t-2xl transition-transform duration-300 ease-out
          md:relative md:translate-y-0 md:w-80 md:h-full md:order-1 md:shadow-xl md:rounded-none md:z-30
          ${isMobileToolsOpen ? 'translate-y-0' : 'translate-y-[110%]'}
      `}>
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
            onClose={() => setIsMobileToolsOpen(false)}
        />
      </div>
      
      {/* MOBILE FAB */}
      <div className={`
          md:hidden fixed bottom-6 left-6 z-30 transition-transform duration-300
          ${isMobileToolsOpen ? 'translate-y-[200%]' : 'translate-y-0'}
      `}>
          <button 
            onClick={() => setIsMobileToolsOpen(true)}
            className="flex items-center justify-center w-14 h-14 bg-indigo-600 text-white rounded-full shadow-lg hover:bg-indigo-700 active:scale-95 transition-all"
            title="Abrir Herramientas"
          >
             <Edit3 size={24} />
          </button>
      </div>

      <div className="flex-1 flex flex-col h-full relative order-2 min-w-0">
        
        {/* HEADER */}
        <header className="h-auto min-h-[4rem] bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 flex flex-wrap gap-2 justify-between items-center px-3 py-2 md:px-6 shadow-sm z-20 transition-colors shrink-0">
           
           {/* LEFT: Logo & Title */}
           <div className="flex items-center gap-2 md:gap-4 overflow-hidden min-w-0">
              <div className="h-9 w-9 md:h-12 md:w-12 rounded-full overflow-hidden border-2 border-orange-200 dark:border-orange-900 shadow-sm relative group bg-white flex items-center justify-center shrink-0">
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
              
              <div className="flex flex-col min-w-0">
                  <h1 className="text-sm md:text-xl font-black text-gray-900 dark:text-white leading-none tracking-tight uppercase truncate" style={{ fontFamily: 'Inter, sans-serif' }}>
                      <span className="hidden sm:inline">Diseñador de Abanicos</span>
                      <span className="sm:hidden">Diseñador</span>
                  </h1>
                  <span className="text-[10px] md:text-[10px] font-bold text-orange-500 tracking-[0.2em] uppercase mt-0.5 truncate">
                      Fantastic Plastik
                  </span>
              </div>

              <div className="h-6 w-px bg-gray-200 dark:bg-gray-700 mx-2 hidden lg:block"></div>
              
              {/* MODE SWITCHER (Desktop) */}
              <div className="hidden lg:flex flex-col gap-1">
                  <div className="flex bg-gray-100 dark:bg-gray-700 p-1 rounded-lg items-center">
                      <button 
                        onClick={() => toggleFanType('cloth')}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${fanType === 'cloth' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                      >
                        <Layers size={14} className="inline mr-1 mb-0.5" /> Tela
                      </button>
                      <button 
                        onClick={() => toggleFanType('polymer')}
                        className={`px-3 py-1.5 text-xs font-bold uppercase tracking-wide rounded-md transition-all ${fanType === 'polymer' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                      >
                        <Box size={14} className="inline mr-1 mb-0.5" /> Polímero
                      </button>
                      <HelpTooltip text="Elige entre abanico de tela tradicional o estructura rígida de polímero." />
                  </div>
                  
                  {/* POLYMER MODEL SELECTOR */}
                  {fanType === 'polymer' && (
                      <div className="flex gap-2 animate-fadeIn mt-1">
                          {POLYMER_MODELS.map(model => (
                              <button
                                key={model.id}
                                onClick={() => handlePolymerModelChange(model.id)}
                                className={`
                                  flex-1 px-3 py-2 text-xs rounded-lg border flex items-center justify-center gap-2 transition-all transform hover:scale-105 active:scale-95
                                  ${selectedPolymerId === model.id 
                                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-md font-bold' 
                                    : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                                  }
                                `}
                              >
                                  {selectedPolymerId === model.id && <Check size={12} strokeWidth={3} />}
                                  {model.name}
                              </button>
                          ))}
                          <HelpTooltip text="Selecciona la forma de las varillas: Recta o Redondeada." />
                      </div>
                  )}
              </div>
           </div>
           
           {/* RIGHT: Actions */}
           <div className="flex items-center gap-1 md:gap-3">
               <button onClick={toggleDarkMode} className="p-1.5 md:p-2 text-gray-400 hover:text-yellow-500 dark:text-gray-300 dark:hover:text-yellow-400 transition-colors rounded-full hover:bg-gray-100 dark:hover:bg-gray-700">
                   {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
               </button>
               
               <button onClick={() => setCurrentView(AppView.ADMIN)} className="p-1.5 md:p-2 text-gray-400 hover:text-gray-700 dark:text-gray-300 dark:hover:text-white transition-colors">
                   <Settings size={20} />
               </button>
               
               <button onClick={handleDownloadImage} className="flex items-center justify-center p-1.5 md:px-3 md:py-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-gray-700 rounded transition-colors" title="Descargar Diseño">
                   <span className="hidden md:inline text-xs font-bold mr-2">Descargar Diseño</span>
                   <Download size={20} />
               </button>
               
               <button onClick={handleProceedToCheckout} className="ml-1 px-3 md:px-6 py-2 bg-gray-900 hover:bg-gray-800 dark:bg-indigo-600 dark:hover:bg-indigo-700 text-white rounded-lg font-bold shadow-md transition-transform active:scale-95 text-[10px] md:text-xs uppercase tracking-wide whitespace-nowrap">
                  Finalizar <span className="hidden md:inline">Diseño</span>
               </button>
           </div>
        </header>

        {/* Mobile Mode Switcher (Visible only on small screens) */}
        <div className="lg:hidden bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 py-2 px-2 flex flex-col items-center shrink-0 z-10 gap-2">
             <div className="flex bg-gray-100 dark:bg-gray-700 p-0.5 rounded-lg w-full max-w-sm items-center">
                  <button onClick={() => toggleFanType('cloth')} className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded transition-all ${fanType === 'cloth' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>Tela</button>
                  <button onClick={() => toggleFanType('polymer')} className={`flex-1 px-2 py-1.5 text-[10px] font-bold uppercase tracking-wide rounded transition-all ${fanType === 'polymer' ? 'bg-white dark:bg-gray-600 shadow text-indigo-600 dark:text-indigo-300' : 'text-gray-500 dark:text-gray-400'}`}>Polímero</button>
                  <HelpTooltip text="Cambia entre abanico de tela o polímero." />
              </div>
              
              {/* Mobile Polymer Sub-selector */}
              {fanType === 'polymer' && (
                  <div className="flex gap-2 w-full max-w-sm items-center">
                      {POLYMER_MODELS.map(model => (
                          <button
                            key={model.id}
                            onClick={() => handlePolymerModelChange(model.id)}
                            className={`flex-1 px-2 py-2 text-[10px] rounded-lg border flex items-center justify-center gap-1 transition-all ${selectedPolymerId === model.id ? 'bg-indigo-600 text-white border-indigo-600 font-bold shadow' : 'bg-white border-gray-200 text-gray-500 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-400'}`}
                          >
                             {selectedPolymerId === model.id && <Check size={10} strokeWidth={3} />}
                             {model.name}
                          </button>
                      ))}
                      <HelpTooltip text="Elige la forma de la punta." />
                  </div>
              )}
        </div>

        {/* MAIN CANVAS AREA */}
        <div className="flex-1 relative overflow-hidden bg-gray-100 dark:bg-gray-900 flex flex-col">
            <div className="absolute top-4 left-4 z-30 flex flex-col gap-2 pointer-events-none md:pointer-events-auto">
               <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider bg-white/90 dark:bg-gray-800/90 px-2 py-1 rounded-md backdrop-blur-sm shadow-sm border border-gray-100 dark:border-gray-700 pointer-events-auto">
                 Si necesitas ayuda contáctanos por nuestras redes sociales
               </span>
               <div className="flex gap-2 pointer-events-auto">
                  <a href="https://wa.me/541164038489" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                     <img src={SOCIAL_WHATSAPP_ICON} alt="WhatsApp" className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" />
                  </a>
                  <a href="https://www.instagram.com/fantastic.plastik" target="_blank" rel="noopener noreferrer" className="hover:scale-110 transition-transform">
                     <img src={SOCIAL_INSTAGRAM_ICON} alt="Instagram" className="w-10 h-10 md:w-12 md:h-12 drop-shadow-md" />
                  </a>
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
    </div>
  );
}

export default App;
