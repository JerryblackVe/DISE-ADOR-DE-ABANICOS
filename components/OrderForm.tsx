
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle, Loader, AlertTriangle } from 'lucide-react';
import emailjs from '@emailjs/browser';
import { OrderFormProps } from '../types';
import { EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY } from '../constants';

// Helper to compress image specifically for EmailJS limits (max 50KB for params)
const compressForEmail = (base64Str: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.src = base64Str;
        img.onload = () => {
            const canvas = document.createElement('canvas');
            // Aggressive resize for thumbnail email
            const maxWidth = 300; 
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            // Fill white background for JPEG transparency handling
            if (ctx) {
                ctx.fillStyle = '#FFFFFF';
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);
            }
            
            // Export as Low Quality JPEG to fit in ~40-50KB text limit
            resolve(canvas.toDataURL('image/jpeg', 0.3));
        };
        img.onerror = () => resolve(''); 
    });
};

const OrderForm: React.FC<OrderFormProps> = ({ previewImage, designDetails, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    quantity: 50,
    notes: ''
  });
  
  const [isSending, setIsSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSending(true);

    if (!EMAILJS_SERVICE_ID || !EMAILJS_TEMPLATE_ID || !EMAILJS_PUBLIC_KEY) {
        alert("Error de configuración: Faltan las credenciales de EmailJS en constants.ts");
        setIsSending(false);
        return;
    }

    if ((EMAILJS_TEMPLATE_ID as string) === 'INSERT_TEMPLATE_ID_HERE') {
        alert("Error: Debes configurar el ID de la plantilla de EmailJS en constants.ts");
        setIsSending(false);
        return;
    }

    try {
        // Compress image for email transport
        const compressedImage = await compressForEmail(previewImage);
        
        // Check approximate size (Base64 length * 0.75 = bytes)
        const sizeInBytes = compressedImage.length * 0.75;
        const sizeInKb = sizeInBytes / 1024;
        console.log(`Email Image Size: ~${sizeInKb.toFixed(2)} KB`);

        const templateParams = {
            time: new Date().toLocaleString(),
            modelo_base: designDetails.modelName,
            material: designDetails.material,
            cantidad_abanicos: formData.quantity,
            resumen_diseno: designDetails.colors,
            nombre_completo: formData.name,
            email: formData.email,
            telefono: formData.phone,
            direccion_envio: formData.address,
            notas: formData.notes || 'Sin notas adicionales',
            design_image: sizeInKb < 50 ? compressedImage : 'Imagen demasiado grande para envío automático.' 
        };

        await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, templateParams, EMAILJS_PUBLIC_KEY);
        
        console.log('Email sent successfully');
        onSubmit(formData);
        
    } catch (error: any) {
        console.error('Email failed:', error);
        
        // If error is 413 (Too Large), try sending without image
        if (error.status === 413 || (error.text && error.text.includes('Variables size limit'))) {
             const confirmSend = window.confirm("La imagen del diseño es muy pesada para enviarla por correo automático. ¿Deseas enviar el pedido solo con los datos de texto?");
             if (confirmSend) {
                 try {
                     const paramsNoImg = {
                        ...formData,
                        time: new Date().toLocaleString(),
                        modelo_base: designDetails.modelName,
                        material: designDetails.material,
                        cantidad_abanicos: formData.quantity,
                        resumen_diseno: designDetails.colors,
                        nombre_completo: formData.name,
                        direccion_envio: formData.address,
                        design_image: "Imagen no adjunta (Excede límite de tamaño)"
                     };
                     await emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, paramsNoImg, EMAILJS_PUBLIC_KEY);
                     onSubmit(formData);
                     return;
                 } catch (retryError) {
                     alert("Error al reintentar envío.");
                 }
             }
        } else {
            alert(`Hubo un error al enviar el pedido: ${error.text || 'Error desconocido'}. Por favor contáctanos por WhatsApp.`);
        }
    } finally {
        setIsSending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-white dark:bg-gray-900 z-50 overflow-y-auto transition-colors">
      <div className="max-w-4xl mx-auto px-4 py-6 md:py-12 pb-24">
        <button onClick={onCancel} className="flex items-center text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white mb-6 md:mb-8 p-2">
          <ArrowLeft size={24} className="mr-2" /> Volver al Editor
        </button>

        <div className="grid md:grid-cols-2 gap-8 md:gap-12">
          {/* Summary */}
          <div>
            <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Resumen del Diseño</h2>
            <div className="bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700 sticky top-4">
              <img src={previewImage} alt="Diseño final" className="w-full h-auto rounded-lg shadow-sm bg-white mb-6 border dark:border-gray-600" />
              <div className="space-y-4 text-sm md:text-base">
                <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                    <span className="text-gray-600 dark:text-gray-300">Modelo</span>
                    <span className="font-medium text-gray-900 dark:text-white">{designDetails.modelName}</span>
                </div>
                 <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2">
                    <span className="text-gray-600 dark:text-gray-300">Material</span>
                    <span className="font-medium text-gray-900 dark:text-white">{designDetails.material}</span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 pt-2">
                    {designDetails.colors}
                </div>
                <div className="bg-blue-50 dark:bg-blue-900/20 p-3 rounded-lg flex items-start gap-2 text-xs text-blue-700 dark:text-blue-300">
                    <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                    <span>La imagen en el correo será una miniatura de referencia. Descarga el diseño en alta calidad antes de cerrar.</span>
                </div>
              </div>
            </div>
          </div>

          {/* Form */}
          <div>
             <h2 className="text-xl md:text-2xl font-serif font-bold text-gray-900 dark:text-white mb-4 md:mb-6">Finalizar Pedido</h2>
             <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Cantidad de Abanicos</label>
                  <input 
                    type="number" 
                    min="10" 
                    required
                    value={formData.quantity}
                    onChange={e => setFormData({...formData, quantity: parseInt(e.target.value)})}
                    className="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none text-lg"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Pedido mínimo: 10 unidades</p>
                </div>

                <div className="space-y-4">
                   <h3 className="font-medium text-gray-900 dark:text-white border-b dark:border-gray-700 pb-2">Datos de Envío</h3>
                   <input 
                    type="text" 
                    placeholder="Nombre Completo"
                    required
                    value={formData.name}
                    onChange={e => setFormData({...formData, name: e.target.value})}
                    className="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                   <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                     <input 
                        type="email" 
                        placeholder="Email"
                        required
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                        className="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                      <input 
                        type="tel" 
                        placeholder="Teléfono"
                        required
                        value={formData.phone}
                        onChange={e => setFormData({...formData, phone: e.target.value})}
                        className="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                   </div>
                   <textarea 
                     placeholder="Dirección de entrega completa"
                     required
                     rows={3}
                     value={formData.address}
                     onChange={e => setFormData({...formData, address: e.target.value})}
                     className="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                   <textarea 
                     placeholder="Notas adicionales (opcional)"
                     rows={2}
                     value={formData.notes}
                     onChange={e => setFormData({...formData, notes: e.target.value})}
                     className="w-full p-3 md:p-4 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none"
                   />
                </div>

                <button 
                  type="submit"
                  disabled={isSending}
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg disabled:opacity-70 disabled:cursor-not-allowed"
                >
                  {isSending ? (
                      <>
                        <Loader className="mr-2 animate-spin" /> Enviando Pedido...
                      </>
                  ) : (
                      <>
                        <CheckCircle className="mr-2" /> Confirmar Pedido
                      </>
                  )}
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
