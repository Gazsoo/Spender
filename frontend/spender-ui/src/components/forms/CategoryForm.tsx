import { useState } from 'react';
import type { Category } from '../../types';
import Button from '../ui/Button';

const PRESET_COLORS = ['#6366f1','#ec4899','#f59e0b','#22c55e','#14b8a6','#3b82f6','#ef4444','#8b5cf6','#f97316','#95a5a6'];

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (data: { name: string; color: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function CategoryForm({ initial, onSubmit, onCancel, isPending }: CategoryFormProps) {
  const [name,  setName]  = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setError('');
    onSubmit({ name: name.trim(), color });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-4">
      {error && (
        <p className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-xl px-3 py-2">{error}</p>
      )}

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Name</label>
        <input
          type="text"
          placeholder="e.g. Groceries"
          value={name}
          onChange={e => setName(e.target.value)}
          className="w-full text-sm bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-gray-900 outline-none focus:border-amber-500 transition-colors"
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Color</label>
        <div className="flex gap-2 flex-wrap">
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              onClick={() => setColor(c)}
              style={{ background: c }}
              className={`w-7 h-7 rounded-full transition-all outline-2 outline-offset-2 ${
                color === c ? 'outline outline-gray-900' : 'outline-transparent'
              }`}
            />
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-2 mt-1">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : initial ? 'Update' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}
