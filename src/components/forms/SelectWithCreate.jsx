import { useState } from 'react';
import { Plus, X } from 'lucide-react';
// Fixed: removed nested form - using div instead

export default function SelectWithCreate({ 
  label, 
  value, 
  onChange, 
  options = [], 
  placeholder = "Sélectionner...",
  onCreateNew,
  onRefresh,
  createLabel = "Créer nouveau",
  required = false,
  disabled = false
}) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newItemName, setNewItemName] = useState('');
  const [creating, setCreating] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    const trimmed = newItemName.trim();
    if (!trimmed) return;

    // Évite de créer un doublon si un élément du même nom existe déjà dans la liste
    const existing = options.find(o => o.label?.trim().toLowerCase() === trimmed.toLowerCase());
    if (existing) {
      onChange({ target: { value: existing.value } });
      setShowCreateModal(false);
      setNewItemName('');
      return;
    }

    setCreating(true);
    try {
      const newItem = await onCreateNew(trimmed);

      // Rafraîchir la liste des options
      if (onRefresh) {
        await onRefresh();
      }

      // Sélectionner le nouvel élément créé
      if (newItem && newItem.id) {
        onChange({ target: { value: newItem.id } });
      }

      setShowCreateModal(false);
      setNewItemName('');
    } catch (error) {
      console.error('Error creating item:', error);
      // Ne pas afficher d'alerte si l'erreur a déjà été gérée (ex: site requis)
      if (!error.message?.includes('requis')) {
        alert('Erreur lors de la création');
      }
    } finally {
      setCreating(false);
    }
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-2">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <div className="flex gap-2">
        <select
          value={value}
          onChange={onChange}
          required={required}
          disabled={disabled}
          className="flex-1 min-w-0 px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-500"
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        {onCreateNew && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-3 bg-blue-50 text-blue-600 rounded-xl hover:bg-blue-100 transition-colors flex items-center gap-2 whitespace-nowrap"
            title={createLabel}
          >
            <Plus className="h-5 w-5" />
            <span className="hidden sm:inline">Créer</span>
          </button>
        )}
      </div>

      {/* Modal de création rapide */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-900">{createLabel}</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>

            <div className="p-6">
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom
                </label>
                <input
                  type="text"
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleCreate(e);
                    }
                  }}
                  placeholder="Entrez le nom..."
                  autoFocus
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-6 py-3 border border-gray-200 rounded-xl font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={creating}
                >
                  Annuler
                </button>
                <button
                  type="button"
                  onClick={handleCreate}
                  disabled={creating || !newItemName.trim()}
                  className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl font-medium hover:shadow-lg hover:shadow-blue-500/25 transition-all disabled:opacity-50"
                >
                  {creating ? 'Création...' : 'Créer'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
