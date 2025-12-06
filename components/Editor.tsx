
import React, { useEffect, useRef, useState } from 'react';
import { FanType } from '../types';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';

// Declare fabric on window
declare const fabric: any;

interface EditorProps {
  onCanvasReady: (canvas: any) => void;
  onSelectionChange: (obj: any) => void;
  selectedColor: string; // Blade/Background Color
  fanPath: string; // The active SVG path data (For Cloth)
  polymerImage: string; // The active PNG Image (For Polymer)
  fanType: FanType;
  ribColor: string; // Frame/Ribs Color (Polymer)
  isDarkMode: boolean;
}

const Editor: React.FC<EditorProps> = ({ 
  onCanvasReady, 
  onSelectionChange, 
  selectedColor, 
  fanPath, 
  polymerImage,
  fanType, 
  ribColor, 
  isDarkMode
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isReady, setIsReady] = useState(false);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const saveTimeoutRef = useRef<any>(null);
  
  // Ref to store the generated Polymer Mask (Silhouette) for clipping
  const polymerMaskRef = useRef<any>(null);

  // Helper to calculate fan geometry based on current canvas size
  const getFanGeometry = (canvasWidth: number, canvasHeight: number, pathData: string) => {
    const tempPath = new fabric.Path(pathData);
    const pathWidth = tempPath.width || 560;
    const pathHeight = tempPath.height || 280;

    // Scale 0.95 for Cloth (Vectors) - Maximize size
    const scaleX = (canvasWidth * 0.95) / pathWidth;
    const scaleY = (canvasHeight * 0.95) / pathHeight;
    const scale = Math.min(scaleX, scaleY);

    const left = canvasWidth / 2;
    // To center the shape vertically: 
    const top = canvasHeight / 2 + (pathHeight * scale) / 2;

    return { scale, left, top };
  };

  // --- Zoom Functions ---
  const handleZoom = (factor: number) => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    
    let newZoom = canvas.getZoom() + factor;
    // Limits
    if (newZoom < 0.5) newZoom = 0.5;
    if (newZoom > 3) newZoom = 3;

    // Zoom to center
    canvas.zoomToPoint(new fabric.Point(canvas.getWidth() / 2, canvas.getHeight() / 2), newZoom);
    canvas.requestRenderAll();
  };

  const resetZoom = () => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      canvas.setViewportTransform([1, 0, 0, 1, 0, 0]); // Reset transform matrix
      canvas.setZoom(1);
      canvas.requestRenderAll();
  };

  // --- Theme Change Effect ---
  useEffect(() => {
    if (fabricRef.current) {
        // Switch canvas background color based on theme
        const bgColor = isDarkMode ? '#374151' : '#f3f4f6'; 
        fabricRef.current.setBackgroundColor(bgColor, () => {
            fabricRef.current.requestRenderAll();
        });
    }
  }, [isDarkMode]);

  // --- PERSISTENCE HELPERS ---
  const saveDesign = () => {
      if (!fabricRef.current) return;
      const canvas = fabricRef.current;
      
      // Filter out background and outline, save only user content
      const json = canvas.toDatalessJSON(['id', 'data', 'selectable', 'evented']);
      json.objects = json.objects.filter((obj: any) => 
          obj.data?.id !== 'fan-background' && obj.data?.id !== 'fan-outline'
      );

      const key = `saved_design_${fanType}`;
      localStorage.setItem(key, JSON.stringify(json));
  };

  const debouncedSave = () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
      saveTimeoutRef.current = setTimeout(() => {
          saveDesign();
      }, 500); // Save after 500ms of inactivity
  };

  const loadUserDesign = (canvas: any) => {
      const key = `saved_design_${fanType}`;
      const saved = localStorage.getItem(key);
      if (saved) {
          try {
              const json = JSON.parse(saved);
              if (json.objects && json.objects.length > 0) {
                  fabric.util.enlivenObjects(json.objects, (objs: any[]) => {
                      objs.forEach((obj) => {
                          canvas.add(obj);
                          // Clipping is re-applied in 'object:added' event
                      });
                      canvas.requestRenderAll();
                  });
              }
          } catch (e) {
              console.error("Error loading saved design", e);
          }
      }
  };

  // Function to process PNG pixels and split into Frame, Background AND MASK
  const processPolymerImage = (base64Img: string): Promise<{ frameImg: any, bgImg: any, maskImg: any }> => {
      return new Promise((resolve, reject) => {
          const img = new Image();
          img.crossOrigin = 'anonymous';
          img.src = base64Img;
          img.onload = () => {
              // Use natural dimensions to ensure pixel accuracy
              const w = img.naturalWidth || img.width;
              const h = img.naturalHeight || img.height;

              const canvas = document.createElement('canvas');
              canvas.width = w;
              canvas.height = h;
              const ctx = canvas.getContext('2d');
              if(!ctx) {
                  reject("No context");
                  return;
              }
              
              ctx.drawImage(img, 0, 0);
              const imgData = ctx.getImageData(0, 0, w, h);
              const totalPixels = imgData.data.length;

              // Buffer for Frame
              const frameData = new Uint8ClampedArray(totalPixels);
              // Buffer for Background
              const bgData = new Uint8ClampedArray(totalPixels);
              // Buffer for CLIPPING MASK (Silhouette)
              const maskData = new Uint8ClampedArray(totalPixels);

              for(let i=0; i < totalPixels; i+=4) {
                  const r = imgData.data[i];
                  const g = imgData.data[i+1];
                  const b = imgData.data[i+2];
                  const a = imgData.data[i+3];

                  if (a < 50) continue; // Skip transparent pixels

                  // Generate Mask: Any visible pixel becomes opaque black
                  maskData[i] = 0; maskData[i+1] = 0; maskData[i+2] = 0; maskData[i+3] = 255;

                  // Frame vs Background Logic (Improved Tolerance)
                  // Redish or Darkish pixels = Frame
                  // Everything else = Background
                  const isRed = (r > g + 20) && (r > b + 20); // Lowered tolerance
                  const isDark = (r < 80 && g < 80 && b < 80); // Increased dark threshold

                  if (isRed || isDark) {
                      // It's the Frame/Ribs
                      frameData[i] = r; frameData[i+1] = g; frameData[i+2] = b; frameData[i+3] = a;
                  } else {
                      // It's the Background (Wings)
                      bgData[i] = r; bgData[i+1] = g; bgData[i+2] = b; bgData[i+3] = a;
                  }
              }

              // Create fabric Images from buffers
              const createFabImg = (data: Uint8ClampedArray) => {
                   const c = document.createElement('canvas');
                   c.width = w;
                   c.height = h;
                   c.getContext('2d')?.putImageData(new ImageData(data, w, h), 0, 0);
                   return new fabric.Image(c);
              };

              const frameObj = createFabImg(frameData);
              const bgObj = createFabImg(bgData);
              const maskObj = createFabImg(maskData);

              resolve({ frameImg: frameObj, bgImg: bgObj, maskImg: maskObj });
          }
          img.onerror = () => {
              setIsImageLoading(false); 
              reject("Error loading image");
          }
      });
  };

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    if (fabricRef.current) {
        fabricRef.current.dispose();
    }

    const width = containerRef.current.offsetWidth;
    const height = containerRef.current.offsetHeight;

    // Determine initial background color
    const initialBgColor = isDarkMode ? '#374151' : '#f3f4f6';

    const canvas = new fabric.Canvas(canvasRef.current, {
      width: width,
      height: height,
      backgroundColor: initialBgColor, 
      preserveObjectStacking: true,
      selection: true,
      controlsAboveOverlay: true, 
    });

    fabricRef.current = canvas;

    // --- ZOOM & PAN LOGIC ---
    canvas.on('mouse:wheel', (opt: any) => {
      const delta = opt.e.deltaY;
      let zoom = canvas.getZoom();
      zoom *= 0.999 ** delta;
      if (zoom > 3) zoom = 3;
      if (zoom < 0.5) zoom = 0.5;
      canvas.zoomToPoint({ x: opt.e.offsetX, y: opt.e.offsetY }, zoom);
      opt.e.preventDefault();
      opt.e.stopPropagation();
    });

    let isDragging = false;
    let lastPosX = 0;
    let lastPosY = 0;

    canvas.on('mouse:down', (opt: any) => {
        if (opt.e.button === 1) {
            isDragging = true;
            canvas.selection = false;
            lastPosX = opt.e.clientX;
            lastPosY = opt.e.clientY;
            canvas.defaultCursor = 'grabbing'; 
            opt.e.preventDefault();
        }
    });

    canvas.on('mouse:move', (opt: any) => {
        if (isDragging) {
            const vpt = canvas.viewportTransform;
            vpt[4] += opt.e.clientX - lastPosX;
            vpt[5] += opt.e.clientY - lastPosY;
            canvas.requestRenderAll();
            lastPosX = opt.e.clientX;
            lastPosY = opt.e.clientY;
            opt.e.preventDefault();
        }
    });

    canvas.on('mouse:up', () => {
        if (isDragging) {
            canvas.setViewportTransform(canvas.viewportTransform);
            isDragging = false;
            canvas.selection = true;
            canvas.defaultCursor = 'default';
        }
    });

    // --- KEYBOARD DELETE ---
    const handleKeyDown = (e: KeyboardEvent) => {
        if (!fabricRef.current) return;
        const canvas = fabricRef.current;
        if (e.key === 'Delete' || e.key === 'Backspace') {
            const activeElement = document.activeElement as HTMLElement;
            if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) return;
            const activeObj = canvas.getActiveObject();
            if (activeObj && !activeObj.isEditing) {
                const activeObjects = canvas.getActiveObjects();
                if (activeObjects.length) {
                    canvas.discardActiveObject();
                    activeObjects.forEach((obj: any) => canvas.remove(obj));
                    canvas.requestRenderAll();
                    onSelectionChange(null);
                }
            }
        }
    };
    window.addEventListener('keydown', handleKeyDown);

    // --- PERSISTENCE LISTENERS ---
    canvas.on('object:modified', debouncedSave);
    canvas.on('object:added', (e: any) => {
        if (e.target?.data?.id !== 'fan-background' && e.target?.data?.id !== 'fan-outline') {
            debouncedSave();
        }
    });
    canvas.on('object:removed', debouncedSave);


    // --- RENDER LOGIC ---
    if (fanType === 'cloth') {
        const geo = getFanGeometry(width, height, fanPath);

        const fanClipPath = new fabric.Path(fanPath, {
            absolutePositioned: true,
            originX: 'center',
            originY: 'bottom',
            left: geo.left,
            top: geo.top,
            scaleX: geo.scale,
            scaleY: geo.scale,
            selectable: false,
            evented: false
        });

        const bgRect = new fabric.Rect({
          left: 0,
          top: 0,
          width: width,
          height: height,
          fill: selectedColor,
          selectable: false,
          evented: false,
          clipPath: fanClipPath,
          data: { id: 'fan-background' }
        });
        canvas.add(bgRect);
        canvas.sendToBack(bgRect);

        const outline = new fabric.Path(fanPath, {
          fill: 'transparent',
          stroke: 'rgba(0,0,0,0.2)',
          strokeWidth: 2,
          strokeDashArray: [5, 5], 
          selectable: false,
          evented: false,
          originX: 'center',
          originY: 'bottom',
          left: geo.left,
          top: geo.top,
          scaleX: geo.scale,
          scaleY: geo.scale,
          data: { id: 'fan-outline' }
        });
        canvas.add(outline);
        canvas.bringToFront(outline);
        
        loadUserDesign(canvas);

    } else {
        // --- POLYMER MODE ---
        if (polymerImage) {
            setIsImageLoading(true);
            processPolymerImage(polymerImage).then(({ frameImg, bgImg, maskImg }) => {
                if (!fabricRef.current) return;
                
                const currentW = canvas.getWidth();
                const currentH = canvas.getHeight();
                
                const imgW = frameImg.width || 100;
                const imgH = frameImg.height || 100;
                
                // Scale 0.75 for Polymer - Safe margin
                const scaleX = (currentW * 0.75) / imgW;
                const scaleY = (currentH * 0.75) / imgH;
                const scale = Math.min(scaleX, scaleY);

                // Setup geometry properties for all layers
                const commonProps = {
                    originX: 'center',
                    originY: 'center',
                    scaleX: scale,
                    scaleY: scale,
                    selectable: false,
                    evented: false,
                    absolutePositioned: true // CRITICAL for clipping
                };

                // 1. Background
                bgImg.set({ ...commonProps, data: { id: 'fan-background' } });
                
                const bgBlend = new fabric.Image.filters.BlendColor({
                    color: selectedColor, mode: 'tint', alpha: 1
                });
                bgImg.filters = [new fabric.Image.filters.Grayscale(), bgBlend];
                bgImg.applyFilters();
                
                canvas.add(bgImg);
                canvas.centerObject(bgImg);
                canvas.sendToBack(bgImg);

                // 2. Frame
                frameImg.set({ ...commonProps, data: { id: 'fan-outline' } });
                
                const frameBlend = new fabric.Image.filters.BlendColor({
                    color: ribColor, mode: 'tint', alpha: 1
                });
                frameImg.filters = [new fabric.Image.filters.Grayscale(), frameBlend];
                frameImg.applyFilters();

                canvas.add(frameImg);
                canvas.centerObject(frameImg);
                canvas.bringToFront(frameImg);

                // 3. Store Mask for User Objects
                maskImg.set({ ...commonProps });
                // Note: We don't center maskImg yet, we wait for 'object:added' or resize
                polymerMaskRef.current = maskImg;
                
                setIsImageLoading(false);
                canvas.requestRenderAll();
                loadUserDesign(canvas);
                
            }).catch(e => {
                console.error(e);
                setIsImageLoading(false);
            });
        }
    }

    // --- APPLY CLIPPING TO NEW OBJECTS ---
    canvas.on('object:added', (e: any) => {
       const obj = e.target;
       if (!obj || !canvas) return;
       if (obj.data?.id === 'fan-background' || obj.data?.id === 'fan-outline' || obj.type === 'selection') return;

       if (fanType === 'cloth') {
           if (!obj.clipPath) {
              const currentW = canvas.width;
              const currentH = canvas.height;
              const currentGeo = getFanGeometry(currentW!, currentH!, fanPath);
              
              obj.clipPath = new fabric.Path(fanPath, {
                 absolutePositioned: true,
                 originX: 'center',
                 originY: 'bottom',
                 left: currentGeo.left,
                 top: currentGeo.top,
                 scaleX: currentGeo.scale,
                 scaleY: currentGeo.scale,
              });
           }
       } else if (fanType === 'polymer') {
           // Apply Polymer Mask (Silhouette)
           if (polymerMaskRef.current) {
               // Find the background object to sync coordinates perfectly
               const bg = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
               
               if (bg) {
                   // Ensure the mask matches the background EXACTLY
                   polymerMaskRef.current.clone((cloned: any) => {
                       cloned.set({
                           left: bg.left,
                           top: bg.top,
                           scaleX: bg.scaleX,
                           scaleY: bg.scaleY,
                           absolutePositioned: true, // CRITICAL: Makes mask static relative to canvas
                           originX: 'center',
                           originY: 'center'
                       });
                       obj.clipPath = cloned;
                       canvas.requestRenderAll();
                   });
               }
           }
       }
    });

    canvas.on('selection:created', (e: any) => onSelectionChange(e.selected[0]));
    canvas.on('selection:updated', (e: any) => onSelectionChange(e.selected[0]));
    canvas.on('selection:cleared', () => onSelectionChange(null));

    // --- RESIZE LOGIC ---
    const handleResize = () => {
        if(!containerRef.current || !fabricRef.current) return;
        
        const newW = containerRef.current.offsetWidth;
        const newH = containerRef.current.offsetHeight;
        const canvas = fabricRef.current;
        
        canvas.setWidth(newW);
        canvas.setHeight(newH);
        
        let refObj = canvas.getObjects().find((o: any) => o.data?.id === 'fan-outline');
        if (!refObj) refObj = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
        
        if (!refObj) {
            canvas.requestRenderAll();
            return;
        }

        const oldScale = refObj.scaleX!; 
        let newScale = 1;

        if (fanType === 'cloth') {
            const geo = getFanGeometry(newW, newH, fanPath);
            newScale = geo.scale;
            
            canvas.getObjects().forEach((obj: any) => {
                // Resize Background/Outline
                if (obj.data?.id === 'fan-background' || obj.data?.id === 'fan-outline') {
                     if (obj.data?.id === 'fan-background') obj.set({ width: newW, height: newH });
                     if (obj.data?.id === 'fan-outline') obj.set({ left: geo.left, top: geo.top, scaleX: geo.scale, scaleY: geo.scale });
                     
                     if (obj.clipPath) {
                         obj.clipPath.set({ left: geo.left, top: geo.top, scaleX: geo.scale, scaleY: geo.scale });
                         obj.clipPath.setCoords();
                     }
                     return;
                }
                
                // Resize User Objects ClipPaths
                if (obj.clipPath) {
                    obj.clipPath.set({ left: geo.left, top: geo.top, scaleX: geo.scale, scaleY: geo.scale });
                    obj.clipPath.setCoords();
                }
            });

        } else {
             // Polymer Resizing
             const imgW = refObj.width!;
             const imgH = refObj.height!;
             const scaleX = (newW * 0.75) / imgW;
             const scaleY = (newH * 0.75) / imgH;
             newScale = Math.min(scaleX, scaleY);
             
             // Update Reference Mask dimensions logic is handled in object loop below
             
             canvas.getObjects().forEach((obj: any) => {
                 // Background/Frame
                 if (obj.data?.id === 'fan-background' || obj.data?.id === 'fan-outline') {
                     obj.set({ scaleX: newScale, scaleY: newScale });
                     canvas.centerObject(obj);
                     obj.setCoords();
                 }
                 // User Objects ClipPaths
                 else if (obj.clipPath) {
                     obj.clipPath.set({ scaleX: newScale, scaleY: newScale });
                     obj.clipPath.left = newW / 2;
                     obj.clipPath.top = newH / 2;
                     obj.clipPath.setCoords();
                 }
             });
        }

        canvas.requestRenderAll();
    };

    const resizeObserver = new ResizeObserver((entries) => {
        window.requestAnimationFrame(() => {
            if (!Array.isArray(entries) || !entries.length) return;
            handleResize();
        });
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    setTimeout(() => handleResize(), 200);

    onCanvasReady(canvas);
    setIsReady(true);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [fanPath, fanType, polymerImage]); 

  // Update Polymer Rib Colors
  useEffect(() => {
      if (!fabricRef.current || fanType !== 'polymer') return;
      const canvas = fabricRef.current;
      const frame = canvas.getObjects().find((o: any) => o.data?.id === 'fan-outline');
      if (frame) {
          const grayscale = new fabric.Image.filters.Grayscale();
          const blend = new fabric.Image.filters.BlendColor({ color: ribColor, mode: 'tint', alpha: 1 });
          frame.filters = [grayscale, blend];
          frame.applyFilters();
          canvas.requestRenderAll();
      }
  }, [ribColor, fanType]);

  // Update Background Colors
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const bg = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
    if (bg) {
        if (fanType === 'cloth') {
             bg.set('fill', selectedColor);
        } else {
             const grayscale = new fabric.Image.filters.Grayscale();
             const blend = new fabric.Image.filters.BlendColor({ color: selectedColor, mode: 'tint', alpha: 1 });
            bg.filters = [grayscale, blend];
            bg.applyFilters();
        }
      canvas.requestRenderAll();
    }
  }, [selectedColor, fanType]);

  return (
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative p-1 md:p-2 transition-colors">
      <div 
        ref={containerRef} 
        className="w-full h-full bg-white dark:bg-gray-700 shadow-xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 relative transition-colors"
      >
        <canvas ref={canvasRef} />
        
        {(!isReady || isImageLoading) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/80 dark:bg-gray-800/80 z-20 backdrop-blur-sm">
                <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mb-2"></div>
                <div className="text-gray-600 dark:text-gray-300 font-medium">
                    {isImageLoading ? 'Cargando plantilla...' : 'Cargando Editor...'}
                </div>
            </div>
        )}

        {fanType === 'cloth' && isReady && (
            <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-black/40 backdrop-blur-md pointer-events-none">
                <h2 className="text-4xl md:text-5xl font-serif font-bold text-white drop-shadow-lg text-center px-4">Próximamente</h2>
                <p className="text-lg md:text-xl text-white/90 mt-2 font-light tracking-wide text-center px-4">Abanicos de tela estampada</p>
            </div>
        )}
        
        <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
            <button onClick={() => handleZoom(0.1)} className="p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Acercar">
                <ZoomIn size={20} />
            </button>
            <button onClick={() => resetZoom()} className="p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Restablecer">
                <RotateCcw size={20} />
            </button>
            <button onClick={() => handleZoom(-0.1)} className="p-2 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 rounded-full shadow-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors" title="Alejar">
                <ZoomOut size={20} />
            </button>
        </div>

      </div>
      
      <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 pointer-events-none z-10 w-full text-center px-4">
        <p className="text-lg md:text-2xl font-serif font-bold text-gray-400/80 dark:text-gray-500/80 uppercase tracking-widest drop-shadow-sm">
            Diseña tu abanico ideal
        </p>
      </div>
    </div>
  );
};

export default Editor;
