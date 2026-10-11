import React, { useState } from 'react';
import { Dialog } from '../ui/Dialog';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { CategoryIcon } from '../ui/CategoryIcon';
import { useApp } from '../../context/AppContext';
import { useToast } from '../ui/Toast';
import { Category, TransactionType } from '../../domain/types';
import { Plus, Edit2, Archive, CheckCircle2, ShieldAlert } from 'lucide-react';

const ICON_CHOICES = [
  'Utensils', 'ShoppingBag', 'Car', 'Home', 'Zap', 'HeartPulse',
  'GraduationCap', 'Film', 'Smile', 'Plane', 'Heart', 'CreditCard',
  'Briefcase', 'Building', 'Award', 'TrendingUp', 'Gift', 'RotateCcw',
  'DollarSign', 'Tag', 'MoreHorizontal'
];

const COLOR_CHOICES = [
  '#E07A5F', '#2A9D8F', '#457B9D', '#1D3557', '#F4A261', '#E76F51',
  '#D62828', '#003049', '#6A4C93', '#8338EC', '#3A86FF', '#FF006E',
  '#21845A', '#176B87', '#D97706', '#10B981', '#EC4899', '#3B82F6', '#64748B'
];

export const CategoriesManagerModal: React.FC = () => {
  const {
    isCategoryManagerOpen,
    closeCategoryManager,
    categories,
    saveCategory,
    archiveCategory,
    checkCategoryTransactionCount,
  } = useApp();
  const { showToast } = useToast();

  const [activeTab, setActiveTab] = useState<TransactionType>('expense');
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [isAddingNew, setIsAddingNew] = useState<boolean>(false);

  // Form State
  const [name, setName] = useState<string>('');
  const [icon, setIcon] = useState<string>('Tag');
  const [color, setColor] = useState<string>('#176B87');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Reassignment Dialog State
  const [reassignCategory, setReassignCategory] = useState<Category | null>(null);
  const [targetCategoryId, setTargetCategoryId] = useState<string>('');
  const [affectedTxCount, setAffectedTxCount] = useState<number>(0);
  const [isArchiving, setIsArchiving] = useState<boolean>(false);

  const filteredCategories = categories.filter((c) => c.type === activeTab);

  const handleOpenAddForm = () => {
    setEditingCategory(null);
    setName('');
    setIcon(activeTab === 'income' ? 'DollarSign' : 'Tag');
    setColor(activeTab === 'income' ? '#21845A' : '#176B87');
    setIsAddingNew(true);
  };

  const handleOpenEditForm = (cat: Category) => {
    setEditingCategory(cat);
    setName(cat.name);
    setIcon(cat.icon);
    setColor(cat.color);
    setIsAddingNew(true);
  };

  const handleSaveForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast({ type: 'error', title: 'Category Name Required' });
      return;
    }

    setIsSubmitting(true);
    try {
      await saveCategory(
        {
          name: name.trim(),
          type: activeTab,
          icon,
          color,
          isBuiltIn: editingCategory ? editingCategory.isBuiltIn : false,
          isArchived: editingCategory ? editingCategory.isArchived : false,
        },
        editingCategory ? editingCategory.id : undefined
      );

      showToast({
        type: 'success',
        title: editingCategory ? 'Category Updated' : 'Category Created',
        description: `Saved category "${name}".`,
      });

      setIsAddingNew(false);
      setEditingCategory(null);
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Save Failed',
        description: err instanceof Error ? err.message : 'Storage error.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInitiateArchive = async (cat: Category) => {
    const txCount = await checkCategoryTransactionCount(cat.id);
    if (txCount > 0) {
      // Prompt reassign
      const remainingCats = categories.filter((c) => c.type === cat.type && c.id !== cat.id && !c.isArchived);
      setReassignCategory(cat);
      setAffectedTxCount(txCount);
      setTargetCategoryId(remainingCats.length > 0 ? remainingCats[0].id : '');
    } else {
      // Archive directly
      try {
        await archiveCategory(cat.id);
        showToast({
          type: 'success',
          title: 'Category Archived',
          description: `Category "${cat.name}" has been archived.`,
        });
      } catch (err) {
        showToast({ type: 'error', title: 'Archive Failed' });
      }
    }
  };

  const handleConfirmReassignAndArchive = async () => {
    if (!reassignCategory) return;
    setIsArchiving(true);
    try {
      await archiveCategory(reassignCategory.id, targetCategoryId || undefined);
      showToast({
        type: 'success',
        title: 'Category Archived',
        description: `Reassigned ${affectedTxCount} transaction(s) and archived "${reassignCategory.name}".`,
      });
      setReassignCategory(null);
    } catch (err) {
      showToast({ type: 'error', title: 'Archive Reassign Failed' });
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <>
      <Dialog
        isOpen={isCategoryManagerOpen && !isAddingNew && !reassignCategory}
        onClose={closeCategoryManager}
        title="Categories Manager"
        subtitle="Organize and customize built-in and custom expense/income categories."
        footer={
          <Button variant="primary" onClick={handleOpenAddForm} leftIcon={<Plus size={16} />}>
            Add Custom Category
          </Button>
        }
      >
        {/* Type Filter Tabs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '20px' }}>
          <button
            onClick={() => setActiveTab('expense')}
            className={`btn ${activeTab === 'expense' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ justifyContent: 'center' }}
          >
            Expense Categories ({categories.filter((c) => c.type === 'expense').length})
          </button>
          <button
            onClick={() => setActiveTab('income')}
            className={`btn ${activeTab === 'income' ? 'btn-primary' : 'btn-secondary'}`}
            style={{
              justifyContent: 'center',
              backgroundColor: activeTab === 'income' ? 'var(--positive-emerald)' : undefined,
              borderColor: activeTab === 'income' ? 'var(--positive-emerald)' : undefined,
            }}
          >
            Income Categories ({categories.filter((c) => c.type === 'income').length})
          </button>
        </div>

        {/* Categories List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '50vh', overflowY: 'auto' }}>
          {filteredCategories.map((cat) => (
            <div
              key={cat.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px 16px',
                backgroundColor: 'var(--surface-card)',
                border: '1px solid var(--border-color)',
                borderRadius: 'var(--radius-sm)',
                opacity: cat.isArchived ? 0.6 : 1,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    backgroundColor: `${cat.color}15`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CategoryIcon name={cat.icon} color={cat.color} size={20} />
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                    {cat.name}
                  </div>
                  <div style={{ display: 'flex', gap: '6px', marginTop: '2px' }}>
                    {cat.isBuiltIn && <Badge variant="muted">Built-in</Badge>}
                    {cat.isArchived && <Badge variant="expense">Archived</Badge>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                <button
                  onClick={() => handleOpenEditForm(cat)}
                  aria-label="Edit category"
                  style={{ padding: '6px', color: 'var(--ink-muted)' }}
                  title="Edit Category"
                >
                  <Edit2 size={16} />
                </button>

                {!cat.isArchived && (
                  <button
                    onClick={() => handleInitiateArchive(cat)}
                    aria-label="Archive category"
                    style={{ padding: '6px', color: 'var(--ink-muted)' }}
                    title="Archive Category"
                  >
                    <Archive size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </Dialog>

      {/* Add / Edit Category Dialog */}
      <Dialog
        isOpen={isAddingNew}
        onClose={() => setIsAddingNew(false)}
        title={editingCategory ? 'Edit Category' : `Add ${activeTab === 'income' ? 'Income' : 'Expense'} Category`}
        footer={
          <>
            <Button variant="ghost" onClick={() => setIsAddingNew(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleSaveForm}
              isLoading={isSubmitting}
              leftIcon={<CheckCircle2 size={16} />}
            >
              Save Category
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveForm}>
          <Input
            label="Category Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Subscriptions, Pet Care"
            required
            autoFocus
          />

          {/* Icon Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Select Icon</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {ICON_CHOICES.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  onClick={() => setIcon(ic)}
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: 'var(--radius-sm)',
                    border: icon === ic ? '2px solid var(--primary-brand)' : '1px solid var(--border-color)',
                    backgroundColor: icon === ic ? 'var(--primary-subtle)' : 'var(--surface-card)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <CategoryIcon name={ic} size={18} color={icon === ic ? 'var(--primary-brand)' : 'var(--ink-muted)'} />
                </button>
              ))}
            </div>
          </div>

          {/* Color Selector */}
          <div style={{ marginBottom: '16px' }}>
            <label className="form-label" style={{ marginBottom: '8px' }}>Select Color</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {COLOR_CHOICES.map((col) => (
                <button
                  key={col}
                  type="button"
                  onClick={() => setColor(col)}
                  style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    backgroundColor: col,
                    border: color === col ? '3px solid var(--ink-primary)' : 'none',
                  }}
                />
              ))}
            </div>
          </div>
        </form>
      </Dialog>

      {/* Reassign Transactions Dialog when Archiving */}
      {reassignCategory && (
        <Dialog
          isOpen={!!reassignCategory}
          onClose={() => setReassignCategory(null)}
          title="Reassign Category Transactions?"
          subtitle={`"${reassignCategory.name}" is referenced by ${affectedTxCount} transaction(s).`}
          footer={
            <>
              <Button variant="ghost" onClick={() => setReassignCategory(null)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={handleConfirmReassignAndArchive}
                isLoading={isArchiving}
                leftIcon={<ShieldAlert size={16} />}
              >
                Reassign & Archive
              </Button>
            </>
          }
        >
          <div style={{ fontSize: '0.875rem', color: 'var(--ink-secondary)', lineHeight: '1.5' }}>
            <p style={{ marginBottom: '16px' }}>
              To ensure historical financial records remain clean and valid, select a replacement category to receive these {affectedTxCount} records before archiving:
            </p>

            <Select
              label="Reassign To Category"
              value={targetCategoryId}
              onChange={(e) => setTargetCategoryId(e.target.value)}
              options={categories
                .filter((c) => c.type === reassignCategory.type && c.id !== reassignCategory.id && !c.isArchived)
                .map((c) => ({ value: c.id, label: c.name }))}
            />
          </div>
        </Dialog>
      )}
    </>
  );
};
