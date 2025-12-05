
import React, { useEffect, useRef, useState } from 'react';
import { FanType } from '../types';

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

  // Helper to calculate fan geometry based on current canvas size
  const getFanGeometry = (canvasWidth: number, canvasHeight: number, pathData: string) => {
    const tempPath = new fabric.Path(pathData);
    const pathWidth = tempPath.width || 560;
    const pathHeight = tempPath.height || 280;

    // Scale 0.9 for Cloth (Vectors)
    const scaleX = (canvasWidth * 0.9) / pathWidth;
    const scaleY = (canvasHeight * 0.9) / pathHeight;
    const scale = Math.min(scaleX, scaleY);

    const left = canvasWidth / 2;
    // To center the shape vertically: 
    const top = canvasHeight / 2 + (pathHeight * scale) / 2;

    return { scale, left, top };
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

  // Function to process PNG pixels and split into Frame (Red) and Background (Yellow)
  const processPolymerImage = (base64Img: string): Promise<{ frameImg: any, bgImg: any }> => {
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

              // Buffer for Frame (Red parts)
              const frameData = new Uint8ClampedArray(totalPixels);
              // Buffer for Background (Yellow parts)
              const bgData = new Uint8ClampedArray(totalPixels);

              for(let i=0; i < totalPixels; i+=4) {
                  const r = imgData.data[i];
                  const g = imgData.data[i+1];
                  const b = imgData.data[i+2];
                  const a = imgData.data[i+3];

                  if (a < 50) continue; // Skip transparent pixels

                  // ROBUST LOGIC:
                  // Instead of checking specific yellow, we check if it's RED.
                  // If it's RED -> Frame.
                  // If it's NOT RED (and visible) -> Background.
                  
                  // Red detection: Red is significantly higher than Green and Blue
                  const isRed = (r > g + 20) && (r > b + 20);

                  if (isRed) {
                      // Copy to Frame buffer
                      frameData[i] = r; frameData[i+1] = g; frameData[i+2] = b; frameData[i+3] = a;
                  } else {
                      // Catch-all for everything else (Yellow, borders, shadows) -> Background
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

              resolve({ frameImg: frameObj, bgImg: bgObj });
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

    } else {
        // --- POLYMER PNG LOGIC ---
        if (!polymerImage) return;

        setIsImageLoading(true);

        processPolymerImage(polymerImage).then(({ frameImg, bgImg }) => {
            if (!fabricRef.current) return; // Guard if unmounted
            
            // Get CURRENT canvas dimensions (Logical)
            const currentW = canvas.getWidth();
            const currentH = canvas.getHeight();
            const centerX = currentW / 2;
            const centerY = currentH / 2;
            
            // Calculate scale to fit (0.75 for Safety Margin)
            const imgW = frameImg.width || 100;
            const imgH = frameImg.height || 100;
            
            const scaleX = (currentW * 0.75) / imgW;
            const scaleY = (currentH * 0.75) / imgH;
            const scale = Math.min(scaleX, scaleY);

            // Configure Background (The Yellow part)
            bgImg.set({
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                data: { id: 'fan-background' }
            });
            
            // Apply initial color to background
            const bgBlend = new fabric.Image.filters.BlendColor({
                color: selectedColor,
                mode: 'tint',
                alpha: 1
            });
            const grayscale = new fabric.Image.filters.Grayscale();
            bgImg.filters = [grayscale, bgBlend];
            bgImg.applyFilters();
            
            canvas.add(bgImg);
            canvas.centerObject(bgImg); // Native centering
            canvas.sendToBack(bgImg);

            // Configure Frame (The Red part)
            frameImg.set({
                originX: 'center',
                originY: 'center',
                scaleX: scale,
                scaleY: scale,
                selectable: false,
                evented: false,
                data: { id: 'fan-outline' }
            });

            // Apply initial color to frame
            const frameBlend = new fabric.Image.filters.BlendColor({
                color: ribColor,
                mode: 'tint',
                alpha: 1
            });
            frameImg.filters = [grayscale, frameBlend];
            frameImg.applyFilters();

            canvas.add(frameImg);
            canvas.centerObject(frameImg); // Native centering
            canvas.bringToFront(frameImg);
            
            setIsImageLoading(false);
            canvas.requestRenderAll();
            
        }).catch(e => {
            console.error(e);
            setIsImageLoading(false);
        });
    }

    canvas.on('object:added', (e: any) => {
       const obj = e.target;
       if (!obj || !canvas) return;
       
       if (fanType === 'cloth') {
           if (!obj.clipPath && obj.data?.id !== 'fan-background' && obj.data?.id !== 'fan-outline' && obj.type !== 'selection') {
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
       }
    });

    canvas.on('selection:created', (e: any) => onSelectionChange(e.selected[0]));
    canvas.on('selection:updated', (e: any) => onSelectionChange(e.selected[0]));
    canvas.on('selection:cleared', () => onSelectionChange(null));

    const handleResize = () => {
        if(!containerRef.current || !fabricRef.current) return;
        
        const newW = containerRef.current.offsetWidth;
        const newH = containerRef.current.offsetHeight;
        const canvas = fabricRef.current;
        
        let refObj = canvas.getObjects().find((o: any) => o.data?.id === 'fan-outline');
        if (!refObj) refObj = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
        
        canvas.setWidth(newW);
        canvas.setHeight(newH);
        
        if (!refObj) {
            canvas.requestRenderAll();
            return;
        }

        const oldScale = refObj.scaleX!; 
        let newScale = 1;

        if (fanType === 'cloth') {
            const geo = getFanGeometry(newW, newH, fanPath);
            newScale = geo.scale;
            
            // Re-apply to all objects
            canvas.getObjects().forEach((obj: any) => {
                // Background & Outline handled by Geometry
                if (obj.data?.id === 'fan-background') {
                     obj.set({ width: newW, height: newH });
                     if (obj.clipPath) {
                         obj.clipPath.set({ left: geo.left, top: geo.top, scaleX: geo.scale, scaleY: geo.scale });
                         obj.clipPath.setCoords();
                     }
                     return;
                }
                if (obj.data?.id === 'fan-outline') {
                    obj.set({ left: geo.left, top: geo.top, scaleX: geo.scale, scaleY: geo.scale });
                    obj.setCoords();
                    return;
                }
                
                // For user content
                const sFactor = newScale / oldScale;
                // Simple centering adjustment relative to center delta? 
                // A full world transform is complex, usually easiest to just center fan and let user move items.
                // But let's try to maintain relative position to CENTER.
                
                // For this request, simply recentering the fan is priority.
                if (obj.clipPath) {
                    obj.clipPath.set({ left: geo.left, top: geo.top, scaleX: geo.scale, scaleY: geo.scale });
                    obj.clipPath.setCoords();
                }
            });

        } else {
             // Polymer (Image) resizing
             const imgW = refObj.width!;
             const imgH = refObj.height!;
             const scaleX = (newW * 0.75) / imgW;
             const scaleY = (newH * 0.75) / imgH;
             newScale = Math.min(scaleX, scaleY);
             
             canvas.getObjects().forEach((obj: any) => {
                 if (obj.data?.id === 'fan-background' || obj.data?.id === 'fan-outline') {
                     obj.set({ scaleX: newScale, scaleY: newScale });
                     canvas.centerObject(obj);
                     obj.setCoords();
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

    // Initial resize trigger
    setTimeout(() => handleResize(), 200);

    onCanvasReady(canvas);
    setIsReady(true);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [fanPath, fanType, polymerImage]); 

  // Update Polymer Rib Colors (Frame)
  useEffect(() => {
      if (!fabricRef.current || fanType !== 'polymer') return;
      const canvas = fabricRef.current;
      const frame = canvas.getObjects().find((o: any) => o.data?.id === 'fan-outline');
      
      if (frame) {
          const grayscale = new fabric.Image.filters.Grayscale();
          const blend = new fabric.Image.filters.BlendColor({
              color: ribColor,
              mode: 'tint',
              alpha: 1
          });
          frame.filters = [grayscale, blend];
          frame.applyFilters();
          canvas.requestRenderAll();
      }
  }, [ribColor, fanType]);

  // Update Background Colors (Cloth & Polymer)
  useEffect(() => {
    if (!fabricRef.current) return;
    const canvas = fabricRef.current;
    const bg = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
    if (bg) {
        if (fanType === 'cloth') {
             bg.set('fill', selectedColor);
        } else {
             // Polymer Background Image
             const grayscale = new fabric.Image.filters.Grayscale();
             const blend = new fabric.Image.filters.BlendColor({
                color: selectedColor,
                mode: 'tint',
                alpha: 1
            });
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
      </div>
      
      <div className="absolute top-2 right-2 md:top-auto md:right-auto md:bottom-4 md:left-1/2 md:transform md:-translate-x-1/2 bg-black/70 dark:bg-black/90 text-white px-3 py-1 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs backdrop-blur-sm pointer-events-none z-10 whitespace-nowrap">
        Área de Impresión (23cm)
      </div>
    </div>
  );
};

export default Editor;
