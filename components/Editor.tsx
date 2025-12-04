
import React, { useEffect, useRef, useState } from 'react';
import { FanType } from '../types';

// Declare fabric on window
declare const fabric: any;

interface EditorProps {
  onCanvasReady: (canvas: any) => void;
  onSelectionChange: (obj: any) => void;
  selectedColor: string; // Blade/Background Color
  fanPath: string; // The active SVG path data (For Cloth)
  polymerImage: string; // The active PNG Image data (For Polymer)
  fanType: FanType;
  ribColor: string; // New prop for polymer frame/ribs
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

  // Helper to calculate fan geometry based on current canvas size
  const getFanGeometry = (canvasWidth: number, canvasHeight: number, pathData: string) => {
    const tempPath = new fabric.Path(pathData);
    const pathWidth = tempPath.width || 560;
    const pathHeight = tempPath.height || 280;

    // Maximized scale factor to 0.95 to fill almost all space
    const scaleX = (canvasWidth * 0.95) / pathWidth;
    const scaleY = (canvasHeight * 0.95) / pathHeight;
    const scale = Math.min(scaleX, scaleY);

    const left = canvasWidth / 2;
    // To center the shape vertically: 
    const top = canvasHeight / 2 + (pathHeight * scale) / 2;

    return { scale, left, top };
  };

  const processPolymerImage = async (imgUrl: string, width: number, height: number, colorBase: string, colorFrame: string) => {
      return new Promise<{ baseImg: any, frameImg: any, clipPath: any }>((resolve) => {
          const img = new Image();
          img.crossOrigin = "Anonymous";
          img.src = imgUrl;
          img.onload = () => {
              const canvas = document.createElement('canvas');
              canvas.width = img.width;
              canvas.height = img.height;
              const ctx = canvas.getContext('2d');
              if (!ctx) return;

              ctx.drawImage(img, 0, 0);
              const imageData = ctx.getImageData(0, 0, img.width, img.height);
              const data = imageData.data;

              const baseData = ctx.createImageData(img.width, img.height);
              const frameData = ctx.createImageData(img.width, img.height);
              const maskData = ctx.createImageData(img.width, img.height);

              const hexToRgb = (hex: string) => {
                  const r = parseInt(hex.slice(1, 3), 16);
                  const g = parseInt(hex.slice(3, 5), 16);
                  const b = parseInt(hex.slice(5, 7), 16);
                  return { r, g, b };
              }
              const rgbBase = hexToRgb(colorBase);
              const rgbFrame = hexToRgb(colorFrame);

              for (let i = 0; i < data.length; i += 4) {
                  const r = data[i];
                  const g = data[i + 1];
                  const b = data[i + 2];
                  const a = data[i + 3];

                  if (a < 50) continue; 

                  if (r > 100 && r > g * 1.5 && r > b * 1.5) {
                      frameData.data[i] = rgbFrame.r;
                      frameData.data[i + 1] = rgbFrame.g;
                      frameData.data[i + 2] = rgbFrame.b;
                      frameData.data[i + 3] = a; 
                  }
                  else if (r > 100 && g > 100 && b < 100) {
                      baseData.data[i] = rgbBase.r;
                      baseData.data[i + 1] = rgbBase.g;
                      baseData.data[i + 2] = rgbBase.b;
                      baseData.data[i + 3] = a;
                      maskData.data[i] = 0;
                      maskData.data[i+1] = 0;
                      maskData.data[i+2] = 0;
                      maskData.data[i+3] = 255;
                  }
              }

              const dataToImage = (imgData: ImageData) => {
                  const tmpCanvas = document.createElement('canvas');
                  tmpCanvas.width = img.width;
                  tmpCanvas.height = img.height;
                  tmpCanvas.getContext('2d')?.putImageData(imgData, 0, 0);
                  return tmpCanvas.toDataURL();
              }

              const baseSrc = dataToImage(baseData);
              const frameSrc = dataToImage(frameData);
              
              // Maximized scale factor to 0.95
              const scaleX = (width * 0.95) / img.width;
              const scaleY = (height * 0.95) / img.height;
              const scale = Math.min(scaleX, scaleY);
              const centerOpts = {
                 originX: 'center',
                 originY: 'center',
                 left: width / 2,
                 top: height / 2,
                 scaleX: scale,
                 scaleY: scale,
                 selectable: false,
                 evented: false,
              };

              fabric.Image.fromURL(baseSrc, (bImg: any) => {
                  bImg.set({...centerOpts, data: { id: 'fan-background' }});
                  fabric.Image.fromURL(frameSrc, (fImg: any) => {
                      fImg.set({...centerOpts, data: { id: 'fan-outline' }});
                      resolve({ baseImg: bImg, frameImg: fImg, clipPath: null });
                  });
              });
          };
      });
  };

  // --- Theme Change Effect ---
  useEffect(() => {
    if (fabricRef.current) {
        // Switch canvas background color based on theme
        const bgColor = isDarkMode ? '#374151' : '#f3f4f6'; // dark:bg-gray-700 vs bg-gray-100
        fabricRef.current.setBackgroundColor(bgColor, () => {
            fabricRef.current.requestRenderAll();
        });
    }
  }, [isDarkMode]);

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
        processPolymerImage(polymerImage, width, height, selectedColor, ribColor).then(({ baseImg, frameImg }) => {
            if (!canvas) return;
            canvas.add(baseImg);
            canvas.sendToBack(baseImg);
            canvas.add(frameImg);
            canvas.requestRenderAll();
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
        if (fanType === 'polymer') {
            refObj = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
        }
        
        if (!refObj) {
            canvas.setWidth(newW);
            canvas.setHeight(newH);
            canvas.requestRenderAll();
            return;
        }

        const oldLeft = refObj.left!;
        const oldTop = refObj.top!;
        const oldScale = refObj.scaleX!; 

        let newScale = 1;
        let newLeft = newW / 2;
        let newTop = newH / 2;

        if (fanType === 'cloth') {
            const geo = getFanGeometry(newW, newH, fanPath);
            newScale = geo.scale;
            newLeft = geo.left;
            newTop = geo.top;
        } else {
             // Maximized scale factor to 0.95
             const scaleX = (newW * 0.95) / refObj.width!;
             const scaleY = (newH * 0.95) / refObj.height!;
             newScale = Math.min(scaleX, scaleY);
             newLeft = newW / 2;
             newTop = newH / 2;
        }

        const sFactor = newScale / oldScale;

        canvas.setWidth(newW);
        canvas.setHeight(newH);

        canvas.getObjects().forEach((obj: any) => {
             if (obj.data?.id === 'fan-background' && obj.type === 'rect') {
                 obj.set({ width: newW, height: newH });
                 if (obj.clipPath) {
                     const cp = obj.clipPath;
                     cp.set({
                        left: newLeft,
                        top: newTop,
                        scaleX: newScale,
                        scaleY: newScale
                     });
                     cp.setCoords();
                 }
                 return;
             }
             
             const relX = obj.left! - oldLeft;
             const relY = obj.top! - oldTop;
             
             obj.set({
                 left: newLeft + relX * sFactor,
                 top: newTop + relY * sFactor,
                 scaleX: obj.scaleX! * sFactor,
                 scaleY: obj.scaleY! * sFactor
             });
             obj.setCoords();
        });

        canvas.requestRenderAll();
    };

    // Use ResizeObserver for more robust container resizing detection
    const resizeObserver = new ResizeObserver((entries) => {
        // Fix for "ResizeObserver loop completed with undelivered notifications"
        // We wrap the resize logic in requestAnimationFrame to decouple it from the current paint cycle
        window.requestAnimationFrame(() => {
            if (!Array.isArray(entries) || !entries.length) return;
            handleResize();
        });
    });

    if (containerRef.current) {
        resizeObserver.observe(containerRef.current);
    }

    // Initial resize trigger
    setTimeout(() => handleResize(), 100);

    onCanvasReady(canvas);
    setIsReady(true);

    return () => {
      resizeObserver.disconnect();
      canvas.dispose();
      fabricRef.current = null;
    };
  }, [fanPath, fanType, polymerImage]); // isDarkMode removed from dependency to avoid full re-init

  useEffect(() => {
      if (!fabricRef.current || fanType !== 'polymer') return;
      const canvas = fabricRef.current;
      const w = canvas.width;
      const h = canvas.height;

      processPolymerImage(polymerImage, w, h, selectedColor, ribColor).then(({ baseImg, frameImg }) => {
          const objects = canvas.getObjects();
          const oldBase = objects.find((o: any) => o.data?.id === 'fan-background');
          const oldFrame = objects.find((o: any) => o.data?.id === 'fan-outline');
          
          let currentTransform = null;
          if (oldBase) {
              currentTransform = {
                  left: oldBase.left,
                  top: oldBase.top,
                  scaleX: oldBase.scaleX,
                  scaleY: oldBase.scaleY
              };
              canvas.remove(oldBase);
          }
          if (oldFrame) canvas.remove(oldFrame);

          if(currentTransform) {
              baseImg.set(currentTransform);
              frameImg.set(currentTransform);
          }

          canvas.insertAt(baseImg, 0, false);
          canvas.add(frameImg);
          canvas.bringToFront(frameImg);
          
          canvas.requestRenderAll();
      });

  }, [selectedColor, ribColor, fanType]);

  useEffect(() => {
    if (!fabricRef.current || fanType !== 'cloth') return;
    const canvas = fabricRef.current;
    const bg = canvas.getObjects().find((o: any) => o.data?.id === 'fan-background');
    if (bg) {
      bg.set('fill', selectedColor);
      canvas.requestRenderAll();
    }
  }, [selectedColor, fanType]);

  return (
    // Force full width/height on editor container
    <div className="w-full h-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center relative p-1 md:p-2 transition-colors">
      <div 
        ref={containerRef} 
        className="w-full h-full bg-white dark:bg-gray-700 shadow-xl rounded-lg overflow-hidden border border-gray-200 dark:border-gray-600 relative transition-colors"
      >
        <canvas ref={canvasRef} />
        {!isReady && <div className="absolute inset-0 flex items-center justify-center text-gray-400">Cargando Editor...</div>}
      </div>
      
      {/* Badge moved to top-right on mobile to avoid overlap with thumb controls */}
      <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 md:bottom-4 bg-black/70 dark:bg-black/90 text-white px-3 py-1 md:px-4 md:py-2 rounded-full text-[10px] md:text-xs backdrop-blur-sm pointer-events-none z-10 whitespace-nowrap">
        Área de Impresión (23cm)
      </div>
    </div>
  );
};

export default Editor;
