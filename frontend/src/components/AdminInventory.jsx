import React, { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { toastSuccess, toastError } from '../utils/toastHelper';
import { useAuth } from '../context/AuthContext';
import { AlertTriangle, Plus } from 'lucide-react';
import { getAPIUrl } from '../config/api';

const localDataMap = {
  's1': { image: '/cinema_combo_premium.png' },
  's2': { image: '/cinema_popcorn_classic.png' },
  's3': { image: '/cinema_soda_fountain.png' },
  's4': { image: '/cinema_combo_personal.png' },
  's5': { image: '/cinema_hot_dog.png' },
  's6': { image: '/cinema_combo_nachos.png' },
  's7': { image: '/cinema_combo_pareja.png' },
  's8': { image: '/cinema_chocolate.png' }
};

const PRODUCT_ORDER = ['s1', 's7', 's6', 's4', 's2', 's5', 's3', 's8'];

export default function AdminInventory() {
  const { token } = useAuth();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [threshold, setThreshold] = useState(20);

  const fetchProducts = async () => {
    try {
      const res = await axios.get(getAPIUrl('/api/products'));
      const sortedProducts = res.data.data.sort((a, b) => {
        const posA = PRODUCT_ORDER.indexOf(a.id);
        const posB = PRODUCT_ORDER.indexOf(b.id);
        return (posA === -1 ? 999 : posA) - (posB === -1 ? 999 : posB);
      });
      setProducts(sortedProducts);
    } catch (err) {
      toastError('Error al cargar el inventario');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Función para actualizar en backend (Optimistic UI ya aplicada localmente)
  const syncWithServer = async (id, field, value) => {
    try {
      await axios.put(
        getAPIUrl(`/api/products/${id}`),
        { [field]: value },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toastSuccess('Inventario actualizado');
    } catch (err) {
      toastError(err.response?.data?.message || 'Error al guardar. Revise la conexión.');
      fetchProducts(); // Revertir en caso de error
    }
  };

  // Manejador local y trigger de debounce manual
  const handleEdit = (id, field, value) => {
    // 1. Actualización optimista
    setProducts(prev =>
      prev.map(p => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const handleBlur = (id, field, value) => {
    const numValue = field === 'price' ? parseFloat(value) : parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) {
      toastError('Valor inválido');
      fetchProducts();
      return;
    }
    syncWithServer(id, field, numValue);
  };

  const handleQuickAdd = async (id, currentStock, amount) => {
    const newStock = parseInt(currentStock, 10) + amount;
    // Update local immediately
    setProducts(prev => prev.map(p => p.id === id ? { ...p, stock: newStock } : p));
    // Sync to server
    await syncWithServer(id, 'stock', newStock);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-8 h-8 rounded-full border-4 border-slate-600 border-t-emerald-500 animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-700/50 rounded-3xl p-8 shadow-[0_8px_30px_rgb(0,0,0,0.12)] mt-6 animate-fade-in">
      <div className="mb-8 flex flex-col lg:flex-row lg:justify-between lg:items-center gap-4">
        <div>
          <h2 className="text-2xl font-display font-bold text-white tracking-tight">Inventario de Dulcería</h2>
          <p className="text-slate-400 text-sm mt-1">Edita directamente sobre la tabla. Los cambios se guardan automáticamente.</p>
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4">
          <div className="flex items-center gap-2 bg-slate-950/50 border border-slate-700/50 px-4 py-2 rounded-xl shadow-inner">
            <span className="text-xs font-semibold text-slate-400 whitespace-nowrap uppercase tracking-wider">Umbral Alerta:</span>
            <input
              type="number"
              min="0"
              value={threshold}
              onChange={(e) => setThreshold(Math.max(0, parseInt(e.target.value, 10) || 0))}
              className="w-16 bg-slate-900/80 border border-slate-600 rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-center font-bold"
            />
          </div>
          {(() => {
            const outOfStockCount = products.filter(p => p.stock === 0).length;
            const lowStockCount = products.filter(p => p.stock > 0 && p.stock < threshold).length;
            const totalAlerts = outOfStockCount + lowStockCount;

            if (totalAlerts === 0) return null;

            if (outOfStockCount > 0) {
              return (
                <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-red-500/10 border border-red-500/30 shadow-[0_0_15px_rgba(239,68,68,0.2)] animate-pulse">
                  <AlertTriangle className="w-5 h-5 text-red-500" />
                  <span className="text-red-500 text-xs font-black uppercase tracking-tight">
                    {outOfStockCount} Agotado(s) | {lowStockCount} Bajo Umbral
                  </span>
                </div>
              );
            }

            return (
              <div className="flex items-center gap-3 px-4 py-2 rounded-xl bg-amber-500/10 border border-amber-500/30 shadow-[0_0_15px_rgba(245,158,11,0.2)] animate-pulse">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                <span className="text-amber-500 text-xs font-black uppercase tracking-tight">
                  {lowStockCount} Producto(s) Bajo Umbral
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-700/50">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-800/80 text-slate-300 uppercase text-xs font-bold tracking-wider">
            <tr>
              <th className="px-4 py-4 min-w-[250px]">Producto</th>
              <th className="px-4 py-4 w-[1%] whitespace-nowrap">Precio (Bs.)</th>
              <th className="px-4 py-4 w-[1%] whitespace-nowrap">Stock Actual</th>
              <th className="px-4 py-4 text-right w-[1%] whitespace-nowrap">Reposición Rápida</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {products.map(product => {
              const isOutOfStock = product.stock === 0;
              const isLowStock = product.stock > 0 && product.stock < threshold;
              
              let rowClass = 'transition-colors hover:bg-slate-800/30';
              if (isOutOfStock) {
                rowClass += ' bg-red-500/10';
              } else if (isLowStock) {
                rowClass += ' bg-amber-500/10';
              }

              return (
                <tr 
                  key={product.id} 
                  className={rowClass}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-xl border border-slate-700 bg-slate-900 flex items-center justify-center shrink-0 overflow-hidden shadow-inner">
                        <img 
                          src={localDataMap[product.id]?.image || '/cinema_combo_premium.png'} 
                          alt={product.name} 
                          className="w-full h-full object-contain hover:scale-110 transition-transform duration-300"
                        />
                      </div>
                      <div className="font-bold text-white flex flex-col gap-1">
                        <span>{product.name}</span>
                        <div className="flex items-center gap-2">
                          {isOutOfStock && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3 animate-bounce" />
                              Agotado
                            </span>
                          )}
                          {isLowStock && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold">
                              <AlertTriangle className="w-3 h-3" />
                              Bajo Umbral
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 w-[1%] whitespace-nowrap">
                    <div className="relative w-28">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 text-sm font-bold">Bs.</span>
                      <input
                        type="number"
                        min="0"
                        step="0.1"
                        value={product.price}
                        onChange={(e) => handleEdit(product.id, 'price', e.target.value)}
                        onBlur={(e) => handleBlur(product.id, 'price', e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 text-white rounded-lg pl-9 pr-2 py-2 text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors shadow-inner"
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 w-[1%] whitespace-nowrap">
                    <div className="w-24">
                      <input
                        type="number"
                        min="0"
                        step="1"
                        value={product.stock}
                        onChange={(e) => handleEdit(product.id, 'stock', e.target.value)}
                        onBlur={(e) => handleBlur(product.id, 'stock', e.target.value)}
                        className={`w-full bg-slate-950 border text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 transition-colors ${
                          isOutOfStock 
                            ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500' 
                            : isLowStock
                              ? 'border-amber-500/50 focus:border-amber-500 focus:ring-amber-500'
                              : 'border-slate-700 focus:border-blue-500 focus:ring-blue-500'
                        }`}
                      />
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right w-[1%] whitespace-nowrap">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => handleQuickAdd(product.id, product.stock, 10)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all uppercase tracking-wider"
                      >
                        <Plus className="w-3.5 h-3.5" /> 10
                      </button>
                      <button
                        onClick={() => handleQuickAdd(product.id, product.stock, 50)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold text-xs bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 hover:border-emerald-500/40 shadow-sm hover:shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all uppercase tracking-wider"
                      >
                        <Plus className="w-3.5 h-3.5" /> 50
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {products.length === 0 && !loading && (
          <div className="p-8 text-center text-slate-500">
            No hay productos registrados en la base de datos.
          </div>
        )}
      </div>
    </div>
  );
}
