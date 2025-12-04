
import React, { useRef, useState, useEffect } from 'react';
import { 
  Type, Image as ImageIcon, Palette, Trash2, 
  Undo, Redo, Layers, PaintBucket,
  AlertCircle, Upload,
  ArrowUpFromLine, ArrowDownToLine,
  Grid, Pipette, Zap
} from 'lucide-react';
import { AVAILABLE_FONTS, COMMON_COLORS, FLUO_COLORS } from '../constants';
import { FanType, CustomFont } from '../types';

interface ToolbarProps {
  onAddText: () => void;
  onAddImage: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onColorChange: (color: string) => void;
  selectedObject: any;
  onUpdateObject: (prop: string, value: any) => void;
  onDelete: () => void;
  onGenerateAI: () => void;
  onRemoveBackground: () => void;
  isProcessing: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onSendToBack: () => void;
  onBringToFront: () => void;
  backgroundColor: string;
  fanType: FanType;
  onRibColorChange: (color: string) => void;
  ribColor: string;
  onMatchRibColor: () => void;
  customFonts?: CustomFont[];
}

// Internal component to enforce "Select -> Apply" workflow
const ActionColorPicker = ({ label, initialColor, onApply }: { label?: string, initialColor: string, onApply: (c: string) => void }) => {
    const [color, setColor] = useState(initialColor);

    useEffect(() => {
        setColor(initialColor || '#000000');
    }, [initialColor]);

    return (
        <div className="mb-2">
            {label && <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">{label}</label>}
            <div className="flex items-center gap-2">
                <div className="relative w-9 h-9 rounded border border-gray-300 dark:border-gray-600 shadow-sm overflow-hidden flex-shrink-0" style={{ backgroundColor: color }}>
                    <input 
                        type="color" 
                        value={color} 
                        onChange={(e) => setColor(e.target.value)}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                </div>
                <button 
                    onClick={() => onApply(color)}
                    className="px-3 py-1.5 bg-gray-800 dark:bg-gray-700 text-white text-xs font-bold rounded hover:bg-gray-700 dark:hover:bg-gray-600 transition-colors flex-1"
                >
                    Aplicar
                </button>
            </div>
        </div>
    );
};

// Helper component for Color Grid
const ColorGrid = ({ colors, selected, onSelect }: { colors: string[], selected: string, onSelect: (c: string) => void }) => (
    <div className="grid grid-cols-6 gap-2">
        {colors.map(color => (
            <button
                key={color}
                className={`w-6 h-6 rounded-full border shadow-sm hover:scale-110 transition-transform ${selected === color ? 'ring-2 ring-offset-1 ring-gray-400 dark:ring-gray-500 scale-110' : 'border-gray-200 dark:border-gray-600'}`}
                style={{ backgroundColor: color }}
                onClick={() => onSelect(color)}
                title={color}
            />
        ))}
    </div>
);

const Toolbar: React.FC<ToolbarProps> = ({
  onAddText,
  onAddImage,
  onColorChange,
  selectedObject,
  onUpdateObject,
  onDelete,
  onGenerateAI,
  onRemoveBackground,
  isProcessing,
  onUndo,
  onRedo,
  onSendToBack,
  onBringToFront,
  backgroundColor,
  fanType,
  onRibColorChange,
  ribColor,
  onMatchRibColor,
  customFonts = []
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const fontFileInputRef = useRef<HTMLInputElement>(null);

  // Still allow one-off upload for quick testing, though Persist in Admin is preferred
  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      // @ts-ignore
      const fontFace = new FontFace('CustomFontTemp', `url(${event.target?.result})`);
      fontFace.load().then((loadedFace: any) => {
        (document.fonts as any).add(loadedFace);
        onUpdateObject('fontFamily', 'CustomFontTemp');
      });
    };
    reader.readAsDataURL(file);
  };

  const getFilterColor = () => {
    if (selectedObject?.filters) {
        const filter = selectedObject.filters.find((f: any) => f.type === 'BlendColor');
        return filter?.color || '#000000';
    }
    return '#000000';
  };

  const hasInvertFilter = () => {
      if (selectedObject?.filters) {
          return selectedObject.filters.some((f: any) => f.type === 'Invert');
      }
      return false;
  }

  // Combine default fonts with custom uploaded fonts
  const allFonts = [...AVAILABLE_FONTS, ...customFonts.map(f => f.name)];

  return (
    <div className="w-full md:w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col h-full overflow-y-auto shadow-xl z-20 transition-colors">
      <div className="p-4 border-b border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-serif font-bold text-gray-900 dark:text-white">Diseñador</h2>
        <p className="text-xs text-gray-500 dark:text-gray-400">
            {fanType === 'cloth' ? 'Personalizador Fantastic Plastik' : 'Abanico Polímero (10 Alas)'}
        </p>
      </div>

      <div className="flex-1 p-4 space-y-6">
        
        {/* History Controls */}
        <div className="flex justify-center space-x-4 mb-4">
             <button onClick={onUndo} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="Deshacer">
                <Undo size={20} className="text-gray-600 dark:text-gray-300" />
             </button>
             <button onClick={onRedo} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full" title="Rehacer">
                <Redo size={20} className="text-gray-600 dark:text-gray-300" />
             </button>
        </div>

        {/* Global Tools (Add Items) */}
        {!selectedObject && (
          <div className="space-y-4 animate-fadeIn">
            {/* Background Color Section */}
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                <Palette size={16} /> {fanType === 'polymer' ? 'Color de Alas (Fondo)' : 'Color de Tela'}
              </h3>
              
              <ColorGrid 
                colors={COMMON_COLORS} 
                selected={backgroundColor} 
                onSelect={onColorChange} 
              />
              
              {fanType === 'polymer' && (
                  <div className="mt-3">
                      <h5 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-2 flex items-center">
                          <Zap size={10} className="mr-1"/> Colores Flúor
                      </h5>
                      <ColorGrid 
                        colors={FLUO_COLORS} 
                        selected={backgroundColor} 
                        onSelect={onColorChange} 
                      />
                  </div>
              )}
            </div>

            {/* Polymer Specific: Frame/Rib Color */}
            {fanType === 'polymer' && (
                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                    <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
                        <Grid size={16} /> Color de Marco
                    </h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">Bordes y estructura superior</p>
                    
                    <ColorGrid 
                        colors={COMMON_COLORS} 
                        selected={ribColor} 
                        onSelect={onRibColorChange} 
                    />

                    <div className="mt-3">
                        <h5 className="text-[10px] uppercase font-bold text-gray-400 dark:text-gray-500 mb-2 flex items-center">
                            <Zap size={10} className="mr-1"/> Colores Flúor
                        </h5>
                        <ColorGrid 
                          colors={FLUO_COLORS} 
                          selected={ribColor} 
                          onSelect={onRibColorChange} 
                        />
                    </div>
                </div>
            )}

            <hr className="border-gray-100 dark:border-gray-700" />

            <div className="grid grid-cols-2 gap-3">
              <button 
                onClick={onAddText}
                className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-700 hover:border-indigo-200 transition-colors group"
              >
                <Type className="mb-2 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Añadir Texto</span>
              </button>

              <button 
                onClick={() => fileInputRef.current?.click()}
                className="flex flex-col items-center justify-center p-4 border border-gray-200 dark:border-gray-600 rounded-xl hover:bg-indigo-50 dark:hover:bg-gray-700 hover:border-indigo-200 transition-colors group"
              >
                <ImageIcon className="mb-2 text-gray-500 dark:text-gray-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-300" />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200">Subir Imagen</span>
                <input 
                  type="file" 
                  ref={fileInputRef} 
                  className="hidden" 
                  accept="image/*"
                  onChange={onAddImage}
                />
              </button>
            </div>
          </div>
        )}

        {/* Context Tools (Selected Object) */}
        {selectedObject && (
          <div className="space-y-4 animate-fadeIn">
            <div className="flex justify-between items-center pb-2 border-b border-gray-100 dark:border-gray-700">
               <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Editar Selección</h3>
               <button onClick={() => onUpdateObject('deselect', null)} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline">Cerrar</button>
            </div>

            {fanType === 'polymer' && (
                <button 
                    onClick={onMatchRibColor}
                    className="w-full mb-3 py-2 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 rounded text-xs font-bold flex items-center justify-center hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-colors"
                >
                    <Pipette size={14} className="mr-2"/> Igualar a Color de Marco
                </button>
            )}

            <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 border border-gray-200 dark:border-gray-600">
               <div className="flex items-center text-xs font-bold text-gray-700 dark:text-gray-200 mb-2">
                 <Layers size={14} className="mr-2"/> Orden de Capas
               </div>
               <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-3 leading-tight">
                 ¿Un objeto tapa a otro? Organiza la prioridad visual aquí.
               </p>
               <div className="grid grid-cols-2 gap-2">
                  <button 
                    onClick={onSendToBack} 
                    className="flex flex-col items-center justify-center p-2 text-xs bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm text-gray-800 dark:text-gray-200"
                  >
                      <ArrowDownToLine size={16} className="mb-1 text-gray-600 dark:text-gray-300"/> 
                      <span className="text-center font-medium">Enviar al Fondo</span>
                      <span className="text-[9px] text-gray-400 mt-0.5">(Debajo de todo)</span>
                  </button>
                  <button 
                    onClick={onBringToFront} 
                    className="flex flex-col items-center justify-center p-2 text-xs bg-white dark:bg-gray-800 rounded border border-gray-300 dark:border-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors shadow-sm text-gray-800 dark:text-gray-200"
                  >
                      <ArrowUpFromLine size={16} className="mb-1 text-gray-600 dark:text-gray-300"/> 
                      <span className="text-center font-medium">Traer al Frente</span>
                      <span className="text-[9px] text-gray-400 mt-0.5">(Encima de todo)</span>
                  </button>
               </div>
            </div>

            {selectedObject.type === 'i-text' && (
              <div className="space-y-3">
                 <div>
                    <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Fuente</label>
                    <select 
                      className="w-full p-2 border border-gray-200 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded text-sm"
                      value={selectedObject.fontFamily}
                      onChange={(e) => onUpdateObject('fontFamily', e.target.value)}
                    >
                      {allFonts.map(f => <option key={f} value={f}>{f}</option>)}
                      <option value="CustomFontTemp">Propia (Temp)...</option>
                    </select>
                    <div className="mt-1">
                        <button onClick={() => fontFileInputRef.current?.click()} className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center">
                            <Upload size={10} className="mr-1"/> Subir fuente rapida (.ttf)
                        </button>
                        <input type="file" ref={fontFileInputRef} className="hidden" accept=".ttf,.otf" onChange={handleFontUpload} />
                    </div>
                 </div>

                 <div className="space-y-3">
                    <ActionColorPicker 
                        label="Color de Texto"
                        initialColor={selectedObject.fill as string}
                        onApply={(c) => onUpdateObject('fill', c)}
                    />
                    
                    <div>
                        <ActionColorPicker 
                            label="Color de Borde"
                            initialColor={selectedObject.stroke || '#000000'}
                            onApply={(c) => onUpdateObject('stroke', c)}
                        />
                        <div className="mt-1 flex items-center">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mr-2 w-12">Grosor:</label>
                            <input 
                                type="number" 
                                value={selectedObject.strokeWidth || 0} 
                                onChange={(e) => onUpdateObject('strokeWidth', parseInt(e.target.value))} 
                                className="w-16 text-xs p-1 border dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white" 
                                min="0"
                            />
                        </div>
                    </div>
                 </div>
                 
                 <div>
                     <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Sombra</label>
                     <div className="flex items-center space-x-2">
                        <input type="color" onChange={(e) => onUpdateObject('shadow.color', e.target.value)} className="h-6 w-6"/>
                        <input type="range" min="0" max="20" onChange={(e) => onUpdateObject('shadow.blur', parseInt(e.target.value))} className="flex-1 accent-indigo-600"/>
                     </div>
                 </div>
              </div>
            )}

            {selectedObject.type === 'image' && (
               <div className="space-y-4">
                  <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                    <h4 className="text-xs font-bold text-blue-800 dark:text-blue-300 mb-2">Herramientas IA</h4>
                    <button 
                        onClick={onRemoveBackground}
                        disabled={isProcessing}
                        className="w-full flex items-center justify-center p-2 bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-800 rounded text-blue-700 dark:text-blue-300 text-xs hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors"
                    >
                        {isProcessing ? 'Procesando...' : 'Quitar Fondo'}
                    </button>
                  </div>

                  <div>
                    <h4 className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 flex items-center">
                        <PaintBucket size={12} className="mr-1"/> Color y Opacidad
                    </h4>
                    
                    <div className="space-y-3 p-3 border border-gray-100 dark:border-gray-600 rounded-lg">
                        
                        <div className="bg-yellow-50 dark:bg-yellow-900/30 p-2 rounded border border-yellow-100 dark:border-yellow-800 mb-2">
                            <div className="text-[10px] text-yellow-800 dark:text-yellow-200 flex items-start leading-tight">
                                <AlertCircle size={10} className="mr-1 mt-0.5 flex-shrink-0" />
                                Si tu logo es negro, primero dale click a "Invertir / Negativo" para poder colorearlo.
                            </div>
                        </div>

                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs text-gray-500 dark:text-gray-400">Invertir Colores</label>
                            <button 
                                onClick={() => onUpdateObject('invert-image', !hasInvertFilter())}
                                className={`px-3 py-1 text-xs rounded border ${hasInvertFilter() ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-500'}`}
                            >
                                {hasInvertFilter() ? 'Activado' : 'Invertir'}
                            </button>
                        </div>

                        <div>
                            <ActionColorPicker 
                                label="Teñir Imagen (Color Overlay)"
                                initialColor={getFilterColor()}
                                onApply={(c) => onUpdateObject('image-filter-color', c)}
                            />
                            
                            <button 
                                onClick={() => onUpdateObject('image-filter-color', '')}
                                className="text-xs text-red-500 hover:text-red-700 dark:hover:text-red-400 underline mt-1"
                                title="Quitar filtro de color"
                            >
                                Restaurar color original
                            </button>
                        </div>

                        <div className="pt-2 border-t border-gray-100 dark:border-gray-700 mt-2">
                            <label className="text-xs text-gray-500 dark:text-gray-400 mb-1 block">Opacidad</label>
                            <input 
                                type="range" 
                                min="0" 
                                max="1" 
                                step="0.1" 
                                value={selectedObject.opacity || 1} 
                                onChange={(e) => onUpdateObject('opacity', parseFloat(e.target.value))}
                                className="w-full accent-indigo-600"
                            />
                        </div>
                    </div>
                  </div>
               </div>
            )}

            <button 
                onClick={onDelete}
                className="w-full mt-6 flex items-center justify-center p-3 text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg transition-colors font-medium text-sm"
            >
                <Trash2 size={16} className="mr-2" /> Eliminar Elemento
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Toolbar;
