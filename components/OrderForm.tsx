
import React, { useState } from 'react';
import { ArrowLeft, CheckCircle } from 'lucide-react';

interface OrderFormProps {
  previewImage: string;
  onSubmit: (data: any) => void;
  onCancel: () => void;
}

const OrderForm: React.FC<OrderFormProps> = ({ previewImage, onSubmit, onCancel }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    quantity: 50
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
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
            <div className="bg-gray-50 dark:bg-gray-800 p-4 md:p-6 rounded-2xl border border-gray-100 dark:border-gray-700">
              <img src={previewImage} alt="Diseño final" className="w-full h-auto rounded-lg shadow-sm bg-white mb-6" />
              <div className="space-y-4 text-sm md:text-base">
                <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Modelo Base</span>
                    <span className="font-medium text-gray-900 dark:text-white">Abanico Clásico 23cm</span>
                </div>
                 <div className="flex justify-between items-center">
                    <span className="text-gray-600 dark:text-gray-300">Material</span>
                    <span className="font-medium text-gray-900 dark:text-white">Tela Poliéster Premium</span>
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
                </div>

                <button 
                  type="submit"
                  className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 dark:bg-indigo-500 dark:hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg hover:shadow-xl transition-all flex items-center justify-center text-lg"
                >
                  <CheckCircle className="mr-2" /> Confirmar Pedido
                </button>
             </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OrderForm;
