import { useState } from 'react';
import { Pencil, Trash2, Plus } from 'lucide-react';
import { useCategories, useCreateCategory, useUpdateCategory, useDeleteCategory } from '../../hooks/useCategories';
import type { Category } from '../../types';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import Card from '../../components/ui/Card';
import PageHeader from '../../components/ui/PageHeader';
import CategoryForm from '../../components/forms/CategoryForm';
import styles from './CategoriesPage.module.css';

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
        action={
          <Button onClick={() => setShowCreate(true)}>
            <Plus size={14} /> Add category
          </Button>
        }
      />

      <Card>
        {isLoading ? (
          <p className={styles.empty}>Loading…</p>
        ) : categories.length === 0 ? (
          <p className={styles.empty}>No categories yet.</p>
        ) : (
          <div className={styles.list}>
            {categories.map(c => (
              <div key={c.id} className={styles.row}>
                <span className={styles.swatch} style={{ background: c.color ?? undefined }} />
                <span className={styles.name}>{c.name}</span>
                <span className={styles.color}>{c.color}</span>
                <div className={styles.actions}>
                  <button className={styles.iconBtn} onClick={() => setEditing(c)} title="Edit">
                    <Pencil size={13} />
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.danger}`}
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
            onSubmit={data => {
              createMutation.mutate(data, { onSuccess: () => setShowCreate(false) });
            }}
          />
        </Modal>
      )}

      {editing && (
        <Modal title="Edit category" onClose={() => setEditing(null)}>
          <CategoryForm
            initial={editing}
            isPending={updateMutation.isPending}
            onCancel={() => setEditing(null)}
            onSubmit={data => {
              updateMutation.mutate(
                { id: editing.id, data },
                { onSuccess: () => setEditing(null) }
              );
            }}
          />
        </Modal>
      )}
    </div>
  );
}
