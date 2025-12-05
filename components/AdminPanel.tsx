
import React, { useState } from 'react';
import { Order, FanType, CustomFont } from '../types';
import { Download, Upload, AlertCircle, FileType, Layers, Box, Image as ImageIcon, Briefcase, Type, Lock, Trash2, Save, FileJson, ToggleLeft, ToggleRight } from 'lucide-react';

interface AdminPanelProps {
  orders: Order[];
  onBack: () => void;
  onTemplateUpdate: (data: string, type: FanType) => void;
  onLogoUpdate: (data: string) => void;
  customFonts?: CustomFont[];
  onUpdateFonts?: (fonts: CustomFont[]) => void;
  onExportConfig: () => void; 
  onImportConfig: (e: React.ChangeEvent<HTMLInputElement>) => void; 
  enabledModes?: { cloth: boolean, polymer: boolean };
  onUpdateModes?: (modes: { cloth: boolean, polymer: boolean }) => void;
}

const AdminPanel: React.FC<AdminPanelProps> = ({ 
    orders, 
    onBack, 
    onTemplateUpdate, 
    onLogoUpdate, 
    customFonts = [], 
    onUpdateFonts,
    onExportConfig,
    onImportConfig,
    enabledModes = { cloth: true, polymer: true },
    onUpdateModes
}) => {
  const [activeTab, setActiveTab] = useState<'orders' | 'template' | 'settings' | 'fonts' | 'security'>('orders');
  // CHANGE: Default to 'polymer'
  const [targetTemplate, setTargetTemplate] = useState<FanType>('polymer'); 
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // -- SECURITY --
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [storedPassword, setStoredPassword] = useState(() => localStorage.getItem('admin_password') || 'Valeria.1');
  const [newPassword, setNewPassword] = useState('');

  const handleLogin = (e: React.FormEvent) => {
      e.preventDefault();
      if (passwordInput === storedPassword) {
          setIsAuthenticated(true);
      } else {
          setErrorMsg("Contraseña incorrecta");
      }
  };

  const handleChangePassword = () => {
      if (newPassword.length < 4) {
          alert("La contraseña debe tener al menos 4 caracteres");
          return;
      }
      setStoredPassword(newPassword);
      localStorage.setItem('admin_password', newPassword);
      setNewPassword('');
      alert("Contraseña actualizada correctamente");
  };

  const downloadProductionFile = (order: Order) => {
    const link = document.createElement('a');
    link.href = order.designThumbnail;
    link.download = `ORDEN_${order.id}_PRODUCCION.png`;
    link.click();
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExt = file.name.split('.').pop()?.toLowerCase();

    // 1. CLOTH MODE (SVG)
    if (targetTemplate === 'cloth') {
        if (fileExt !== 'svg') {
            setErrorMsg('Para abanicos de tela, el archivo debe ser .SVG');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const content = event.target?.result as string;
                const parser = new DOMParser();
                const doc = parser.parseFromString(content, "image/svg+xml");
                const pathElement = doc.querySelector('path');
                const finalPath = pathElement?.getAttribute('d');

                if (finalPath) {
                    onTemplateUpdate(finalPath, 'cloth');
                    setErrorMsg(null);
                    alert(`Plantilla de TELA actualizada correctamente.`);
                } else {
                    setErrorMsg(`No se pudo encontrar un elemento <path> válido en el archivo SVG.`);
                }
            } catch (err) {
                setErrorMsg('Error al procesar el archivo SVG.');
            }
        };
        reader.readAsText(file);
    } 
    // 2. POLYMER MODE (PNG)
    else {
        if (fileExt !== 'png') {
            setErrorMsg('Para abanicos de polímero, el archivo debe ser .PNG');
            return;
        }

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            if (result) {
                onTemplateUpdate(result, 'polymer');
                setErrorMsg(null);
                alert(`Plantilla de POLÍMERO actualizada correctamente.`);
            } else {
                setErrorMsg('Error al leer el archivo PNG.');
            }
        };
        reader.readAsDataURL(file); 
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          const result = event.target?.result as string;
          if(result) {
              onLogoUpdate(result);
              alert("Logo actualizado correctamente.");
          }
      };
      reader.readAsDataURL(file);
  }

  const handleFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if(!file) return;

      const fontName = prompt("Ingresa el nombre para esta fuente (ej: 'MiFuente'):", file.name.split('.')[0]);
      if(!fontName) return;

      const reader = new FileReader();
      reader.onload = (event) => {
          const result = event.target?.result as string;
          if(result && onUpdateFonts) {
              const newFont: CustomFont = { name: fontName, data: result };
              onUpdateFonts([...customFonts, newFont]);
              alert("Fuente agregada correctamente. Se aplicará al recargar o al usarla en el editor.");
          }
      };
      reader.readAsDataURL(file);
  };

  const handleDeleteFont = (fontName: string) => {
      if(confirm(`¿Eliminar fuente ${fontName}?`) && onUpdateFonts) {
          onUpdateFonts(customFonts.filter(f => f.name !== fontName));
      }
  };

  // -- LOGIN SCREEN --
  if (!isAuthenticated) {
      return (
          <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-800 p-8 rounded-xl shadow-lg max-w-md w-full border border-gray-200 dark:border-gray-700">
                  <div className="flex justify-center mb-6 text-indigo-600 dark:text-indigo-400">
                      <Lock size={48} />
                  </div>
                  <h2 className="text-2xl font-bold text-center text-gray-900 dark:text-white mb-6">Acceso Restringido</h2>
                  
                  <form onSubmit={handleLogin} className="space-y-4">
                      <div>
                          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Contraseña de Administrador</label>
                          <input 
                              type="password" 
                              value={passwordInput}
                              onChange={(e) => { setPasswordInput(e.target.value); setErrorMsg(null); }}
                              className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
                              placeholder="••••••"
                          />
                      </div>
                      
                      {errorMsg && <p className="text-red-500 text-sm text-center">{errorMsg}</p>}

                      <button type="submit" className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold">
                          Entrar
                      </button>
                      <button type="button" onClick={onBack} className="w-full py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200">
                          Volver
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 transition-colors">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
             <h1 className="text-3xl font-serif font-bold text-gray-900 dark:text-white">Admin - Fantastic Plastik</h1>
             <p className="text-gray-500 dark:text-gray-400">Gestión de pedidos y configuración</p>
          </div>
          <button onClick={onBack} className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium">
            &larr; Volver al Editor
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm overflow-hidden transition-colors">
          <div className="border-b border-gray-200 dark:border-gray-700 flex overflow-x-auto">
            <button 
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${activeTab === 'orders' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveTab('orders')}
            >
              Pedidos ({orders.length})
            </button>
            <button 
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${activeTab === 'template' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveTab('template')}
            >
              Plantillas
            </button>
            <button 
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${activeTab === 'settings' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveTab('settings')}
            >
              Configuración General
            </button>
            <button 
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${activeTab === 'fonts' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveTab('fonts')}
            >
              Fuentes
            </button>
            <button 
              className={`px-6 py-4 font-medium text-sm whitespace-nowrap ${activeTab === 'security' ? 'border-b-2 border-indigo-600 text-indigo-600 dark:text-indigo-400 dark:border-indigo-400' : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'}`}
              onClick={() => setActiveTab('security')}
            >
              Seguridad
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'orders' && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-xs text-gray-500 dark:text-gray-400 uppercase bg-gray-50 dark:bg-gray-700">
                      <th className="p-4 rounded-tl-lg">ID / Fecha</th>
                      <th className="p-4">Cliente</th>
                      <th className="p-4">Diseño</th>
                      <th className="p-4">Cantidad</th>
                      <th className="p-4 rounded-tr-lg">Acciones</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                    {orders.map(order => (
                      <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        <td className="p-4">
                          <span className="font-mono text-xs font-bold text-gray-700 dark:text-gray-300">#{order.id.slice(0,6)}</span>
                          <div className="text-xs text-gray-400">{order.createdAt.toLocaleDateString()}</div>
                        </td>
                        <td className="p-4">
                          <div className="font-medium text-gray-900 dark:text-white">{order.customer.name}</div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{order.customer.email}</div>
                        </td>
                        <td className="p-4">
                          <img src={order.designThumbnail} alt="Preview" className="w-24 h-16 object-contain border border-gray-200 dark:border-gray-600 bg-white rounded" />
                        </td>
                        <td className="p-4 font-medium text-gray-900 dark:text-white">
                          {order.quantity} u.
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => downloadProductionFile(order)}
                            className="flex items-center px-3 py-2 bg-indigo-50 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-lg text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-800"
                          >
                            <Download size={14} className="mr-2"/> Archivo Fab.
                          </button>
                        </td>
                      </tr>
                    ))}
                    {orders.length === 0 && (
                      <tr>
                        <td colSpan={5} className="p-8 text-center text-gray-400">No hay pedidos pendientes.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            )}
            
            {activeTab === 'template' && (
              <div className="max-w-2xl mx-auto py-8 text-center">
                <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-full flex items-center justify-center mx-auto mb-4">
                    <FileType size={32} />
                </div>
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Actualizar Plantillas Base</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-8">
                    Selecciona el tipo de abanico y sube el archivo correspondiente.
                </p>
                
                <div className="flex justify-center space-x-4 mb-8">
                    {/* REORDERED: POLYMER FIRST */}
                    <button 
                         onClick={() => setTargetTemplate('polymer')}
                         className={`flex items-center px-4 py-3 rounded-lg border transition-all ${targetTemplate === 'polymer' ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                    >
                        <Box size={20} className="mr-2" />
                        <div className="text-left">
                            <div className="font-bold text-sm">Abanico Polímero</div>
                            <div className="text-[10px] opacity-70">Requiere archivo PNG</div>
                        </div>
                    </button>

                    <button 
                        onClick={() => setTargetTemplate('cloth')}
                        className={`flex items-center px-4 py-3 rounded-lg border transition-all ${targetTemplate === 'cloth' ? 'bg-indigo-50 dark:bg-indigo-900 border-indigo-500 text-indigo-700 dark:text-indigo-300 ring-2 ring-indigo-200 dark:ring-indigo-700' : 'bg-white dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-600'}`}
                    >
                        <Layers size={20} className="mr-2" />
                        <div className="text-left">
                            <div className="font-bold text-sm">Abanico de Tela</div>
                            <div className="text-[10px] opacity-70">Requiere archivo SVG</div>
                        </div>
                    </button>
                </div>

                <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-8 text-center">
                    {errorMsg && (
                        <div className="mb-6 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-center justify-center animate-pulse">
                            <AlertCircle size={16} className="mr-2" /> {errorMsg}
                        </div>
                    )}

                    <label className="inline-block px-8 py-4 bg-gray-900 dark:bg-indigo-600 text-white rounded-lg cursor-pointer hover:bg-gray-800 dark:hover:bg-indigo-700 transition-colors shadow-lg transform hover:scale-105">
                    <input 
                        type="file" 
                        className="hidden" 
                        accept={targetTemplate === 'cloth' ? ".svg" : ".png"} 
                        onChange={handleFileUpload}
                    />
                    <span className="flex items-center gap-2 font-medium">
                        <Upload size={20} /> 
                        {targetTemplate === 'cloth' ? "Subir SVG" : "Subir PNG"}
                    </span>
                    </label>
                </div>
              </div>
            )}
            
            {activeTab === 'settings' && (
                <div className="max-w-2xl mx-auto py-8">
                    {/* LOGO SECTION */}
                    <div className="text-center mb-12 border-b border-gray-100 dark:border-gray-700 pb-12">
                        <div className="w-16 h-16 bg-purple-50 dark:bg-purple-900 text-purple-600 dark:text-purple-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Briefcase size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Identidad del Negocio</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Sube el logo de tu empresa para personalizar la aplicación.
                        </p>

                        <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-xl p-6 text-center">
                            <label className="inline-block px-8 py-3 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm">
                                <input 
                                    type="file" 
                                    className="hidden" 
                                    accept="image/*" 
                                    onChange={handleLogoUpload}
                                />
                                <span className="flex items-center gap-2 font-medium text-sm">
                                    <Upload size={18} /> 
                                    Subir Logo (PNG/JPG)
                                </span>
                            </label>
                        </div>
                    </div>

                    {/* ENABLE/DISABLE MODES SECTION */}
                    <div className="text-center">
                         <div className="w-16 h-16 bg-teal-50 dark:bg-teal-900 text-teal-600 dark:text-teal-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <ToggleLeft size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Visibilidad de Productos</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                            Activa o desactiva las secciones disponibles en el editor. (Recuerda exportar la configuración para aplicar a otros dispositivos).
                        </p>
                        
                        <div className="grid md:grid-cols-2 gap-4">
                            <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${enabledModes.cloth ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-70'}`}>
                                <div className="flex items-center gap-3">
                                    <Layers className={enabledModes.cloth ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">Sección Tela</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Editor de abanicos de tela</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onUpdateModes && onUpdateModes({...enabledModes, cloth: !enabledModes.cloth})}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabledModes.cloth ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabledModes.cloth ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>

                            <div className={`p-4 rounded-xl border flex items-center justify-between transition-all ${enabledModes.polymer ? 'bg-indigo-50 border-indigo-200 dark:bg-indigo-900/30 dark:border-indigo-800' : 'bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700 opacity-70'}`}>
                                <div className="flex items-center gap-3">
                                    <Box className={enabledModes.polymer ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-400'} />
                                    <div className="text-left">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">Sección Polímero</div>
                                        <div className="text-xs text-gray-500 dark:text-gray-400">Editor de abanicos rígidos</div>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => onUpdateModes && onUpdateModes({...enabledModes, polymer: !enabledModes.polymer})}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${enabledModes.polymer ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${enabledModes.polymer ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Other tabs omitted for brevity but remain unchanged */}
            {activeTab === 'fonts' && (
                <div className="max-w-xl mx-auto py-8">
                    <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-orange-50 dark:bg-orange-900 text-orange-600 dark:text-orange-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Type size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Gestión de Fuentes</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Sube fuentes personalizadas (.ttf) para usar en el editor.
                        </p>
                    </div>

                    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden mb-6">
                        <div className="p-4 bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600 flex justify-between items-center">
                            <span className="font-bold text-gray-700 dark:text-gray-200">Fuentes Instaladas ({customFonts.length})</span>
                            <label className="text-xs bg-indigo-600 text-white px-3 py-1.5 rounded cursor-pointer hover:bg-indigo-700 flex items-center">
                                <Upload size={12} className="mr-1"/> Agregar Fuente
                                <input type="file" className="hidden" accept=".ttf,.otf" onChange={handleFontUpload} />
                            </label>
                        </div>
                        <div className="p-4 max-h-60 overflow-y-auto">
                            {customFonts.length === 0 ? (
                                <p className="text-center text-gray-400 text-sm py-4">No hay fuentes personalizadas.</p>
                            ) : (
                                <ul className="space-y-2">
                                    {customFonts.map((font, idx) => (
                                        <li key={idx} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                                            <span className="font-medium text-gray-800 dark:text-gray-200">{font.name}</span>
                                            <button 
                                                onClick={() => handleDeleteFont(font.name)}
                                                className="text-red-500 hover:text-red-700"
                                                title="Eliminar fuente"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'security' && (
                <div className="max-w-2xl mx-auto py-8">
                     <div className="text-center mb-8">
                        <div className="w-16 h-16 bg-red-50 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Lock size={32} />
                        </div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Seguridad y Respaldo</h3>
                    </div>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Password Change */}
                        <div className="bg-gray-50 dark:bg-gray-700 p-6 rounded-xl border border-gray-200 dark:border-gray-600">
                            <h4 className="font-bold text-gray-900 dark:text-white mb-4">Cambiar Contraseña</h4>
                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Nueva Contraseña</label>
                            <input 
                                type="password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                className="w-full p-3 border border-gray-300 dark:border-gray-600 rounded mb-4 dark:bg-gray-800 dark:text-white"
                                placeholder="Mínimo 4 caracteres"
                            />
                            <button 
                                onClick={handleChangePassword}
                                className="w-full py-2 bg-gray-900 dark:bg-indigo-600 text-white rounded font-bold hover:bg-gray-800 dark:hover:bg-indigo-700"
                            >
                                Actualizar
                            </button>
                        </div>

                        {/* Config Transfer */}
                        <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
                            <h4 className="font-bold text-blue-900 dark:text-blue-100 mb-4 flex items-center gap-2">
                                <FileJson size={18} /> Transferir Configuración
                            </h4>
                            <p className="text-xs text-blue-700 dark:text-blue-300 mb-4">
                                Como esta app no tiene servidor central, las configuraciones se guardan en el dispositivo. 
                                Usa esto para copiar tu configuración (logo, plantillas) a tu celular.
                            </p>
                            
                            <div className="space-y-3">
                                <button 
                                    onClick={onExportConfig}
                                    className="w-full py-2 bg-white dark:bg-gray-800 border border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-200 rounded font-bold hover:bg-blue-100 flex items-center justify-center gap-2"
                                >
                                    <Save size={16} /> Exportar Configuración
                                </button>
                                
                                <label className="w-full py-2 bg-blue-600 text-white rounded font-bold hover:bg-blue-700 cursor-pointer flex items-center justify-center gap-2 shadow-sm">
                                    <input 
                                        type="file" 
                                        accept=".json" 
                                        className="hidden" 
                                        onChange={onImportConfig}
                                    />
                                    <Upload size={16} /> Importar Configuración
                                </label>
                            </div>
                        </div>
                    </div>
                </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
