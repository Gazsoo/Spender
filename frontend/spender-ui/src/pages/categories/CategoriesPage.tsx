import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useCategories';
import type { Category } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import CategoryForm from '../../components/forms/CategoryForm';

const iconBtn = 'p-1.5 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors';

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories();

  const createMutation = useCreateCategory();
  const updateMutation = useUpdateCategory();
  const deleteMutation = useDeleteCategory();

  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing]       = useState<Category | null>(null);

  return (
    <div>
      <PageHeader
        title="Categories"
        subtitle={`${categories.length} total`}
        action={<Button onClick={() => setShowCreate(true)}><Plus size={14} /> Add category</Button>}
      />

      <Card>
        {isLoading ? (
          <p className="text-sm text-gray-400 py-2">Loading…</p>
        ) : categories.length === 0 ? (
          <p className="text-sm text-gray-400 py-2">No categories yet.</p>
        ) : (
          <div className="flex flex-col">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-3 py-2.5 border-b border-gray-100 last:border-0 group">
                <span className="w-6 h-6 rounded-full shrink-0" style={{ background: c.color ?? undefined }} />
                <span className="flex-1 text-sm text-gray-900">{c.name}</span>
                <span className="text-xs text-gray-400 font-mono">{c.color}</span>
                <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className={iconBtn} onClick={() => setEditing(c)} title="Edit"><Pencil size={13} /></button>
                  <button
                    className={`${iconBtn} hover:!text-red-500`}
                    onClick={() => deleteMutation.mutate(c.id)}
                    disabled={deleteMutation.isPending}
                    title="Delete"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {showCreate && (
        <Modal title="Add category" onClose={() => setShowCreate(false)}>
          <CategoryForm
            isPending={createMutation.isPending}
            onCancel={() => setShowCreate(false)}
            onSubmit={data => createMutation.mutate(data, { onSuccess: () => setShowCreate(false) })}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit category" onClose={() => setEditing(null)}>
          <CategoryForm
            initial={editing}
            isPending={updateMutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={data => updateMutation.mutate(
              { id: editing.id, data },
              { onSuccess: () => setEditing(null) },
            )}
          />
        </Modal>
      )}
    </div>
  );
}
