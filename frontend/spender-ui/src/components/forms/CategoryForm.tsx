import { useState } from 'react';
import type { Category } from '../../types';
import Button from '../ui/Button';
import styles from './Form.module.css';

const PRESET_COLORS = ['#6366f1','#ec4899','#f59e0b','#22c55e','#14b8a6','#3b82f6','#ef4444','#8b5cf6','#f97316','#95a5a6'];

interface CategoryFormProps {
  initial?: Category;
  onSubmit: (data: { name: string; color: string }) => void;
  onCancel: () => void;
  isPending: boolean;
}

export default function CategoryForm({ initial, onSubmit, onCancel, isPending }: CategoryFormProps) {
  const [name, setName]   = useState(initial?.name ?? '');
  const [color, setColor] = useState(initial?.color ?? PRESET_COLORS[0]);
  const [error, setError] = useState('');

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    setError('');
    onSubmit({ name: name.trim(), color });
  }

  return (
    <form onSubmit={handleSubmit} className={styles.form}>
      {error && <p className={styles.error}>{error}</p>}

      <div className={styles.field}>
        <label>Name</label>
        <input
          type="text"
          placeholder="e.g. Groceries"
          value={name}
          onChange={e => setName(e.target.value)}
        />
      </div>

      <div className={styles.field}>
        <label>Color</label>
        <div className={styles.colorGrid}>
          {PRESET_COLORS.map(c => (
            <button
              key={c}
              type="button"
              className={`${styles.swatch} ${color === c ? styles.swatchActive : ''}`}
              style={{ background: c }}
              onClick={() => setColor(c)}
            />
          ))}
        </div>
      </div>

      <div className={styles.actions}>
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" disabled={isPending}>
          {isPending ? 'Saving…' : initial ? 'Update' : 'Add category'}
        </Button>
      </div>
    </form>
  );
}
