import React from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { formatMinorToMajor } from '../domain/moneyAndDate';
import { Repeat, Plus, Calendar, AlertCircle, Play, Pause, Trash2, Edit3 } from 'lucide-react';

export const RecurringView: React.FC = () => {
  const {
    recurringTemplates,
    pendingOccurrences,
    categories,
    currentCurrency,
    openRecurringModal,
    openDueOccurrencesModal,
    saveRecurringTemplate,
    deleteRecurringTemplate,
  } = useApp();
  const { showToast } = useToast();

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);

  const handleToggleStatus = async (templateId: string) => {
    const tpl = recurringTemplates.find((t) => t.id === templateId);
    if (!tpl) return;
    const newStatus = tpl.status === 'active' ? 'paused' : 'active';
    try {
      await saveRecurringTemplate({ ...tpl, status: newStatus }, tpl.id);
      showToast({
        type: 'info',
        title: `Template ${newStatus === 'active' ? 'Resumed' : 'Paused'}`,
        description: `Scheduled recurring item is now ${newStatus}.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Update Error',
        description: 'Could not change template status.',
      });
    }
  };

  const handleDelete = async (templateId: string, noteOrCatName: string) => {
    if (!window.confirm(`Are you sure you want to delete the recurring template "${noteOrCatName}"?`)) return;
    try {
      await deleteRecurringTemplate(templateId);
      showToast({
        type: 'success',
        title: 'Template Deleted',
        description: 'Recurring template permanently removed.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Error',
        description: 'Could not delete recurring template.',
      });
    }
  };

  return (
    <div>
      <PageHeader
        title="Recurring Templates"
        subtitle="Schedule repeating income & expenses with deterministic month-end handling and single-occurrence creation."
        action={
          <div style={{ display: 'flex', gap: '8px' }}>
            {pendingOccurrences.length > 0 && (
              <Button variant="secondary" onClick={openDueOccurrencesModal} leftIcon={<AlertCircle size={16} />}>
                {pendingOccurrences.length} Due Item(s)
              </Button>
            )}
            <Button variant="primary" onClick={() => openRecurringModal(null)} leftIcon={<Plus size={16} />}>
              New Template
            </Button>
          </div>
        }
      />

      {/* Pending Banner if due */}
      {pendingOccurrences.length > 0 && (
        <div
          style={{
            backgroundColor: 'rgba(234, 179, 8, 0.1)',
            border: '1px solid rgba(234, 179, 8, 0.3)',
            borderRadius: 'var(--radius-md)',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle className="w-5 h-5 text-amber-400 flex-shrink-0" />
            <div>
              <div style={{ fontWeight: 600, color: 'var(--ink-primary)', fontSize: '0.9375rem' }}>
                You have {pendingOccurrences.length} due recurring occurrence(s)!
              </div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)' }}>
                Review due transactions and generate them with a single click.
              </div>
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={openDueOccurrencesModal}>
            Review & Create
          </Button>
        </div>
      )}

      {/* PWA Background Disclaimer */}
      <div
        style={{
          backgroundColor: 'var(--primary-subtle)',
          border: '1px solid var(--primary-border)',
          borderRadius: 'var(--radius-md)',
          padding: '12px 16px',
          marginBottom: '24px',
          fontSize: '0.8125rem',
          color: 'var(--ink-secondary)',
          lineHeight: '1.5',
        }}
      >
        <span style={{ fontWeight: 600, color: 'var(--primary-brand)', display: 'block', marginBottom: '2px' }}>
          📌 PWA Background Reminder Notice
        </span>
        PWAs in mobile browser environments cannot guarantee persistent background cron execution when the app is closed. Due recurring items are verified each time you open SpendMic AI, ensuring no duplicates are created.
      </div>

      {/* Templates List */}
      {recurringTemplates.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No Recurring Templates Set"
              description="Create recurring templates for subscriptions, salary, rent, or utilities to automate due transaction prompts."
              icon={<Repeat size={32} />}
              action={
                <Button variant="primary" onClick={() => openRecurringModal(null)} leftIcon={<Plus size={16} />}>
                  Create First Template
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {recurringTemplates.map((tpl) => {
            const cat = getCategory(tpl.categoryId);
            const titleText = tpl.note || cat?.name || 'Recurring Item';
            const isPaused = tpl.status === 'paused';

            return (
              <Card key={tpl.id} className="recurring-row-card" style={{ opacity: isPaused ? 0.75 : 1 }}>
                <CardContent style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Left Info */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                      <CategoryIcon name={cat?.icon || 'Repeat'} color={cat?.color || 'var(--primary-brand)'} size={20} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink-primary)' }}>
                            {titleText}
                          </span>
                          <Badge variant={tpl.type === 'income' ? 'income' : 'expense'}>
                            {tpl.type.toUpperCase()}
                          </Badge>
                          {isPaused && <Badge variant="muted">PAUSED</Badge>}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ textTransform: 'capitalize' }}>Frequency: {tpl.frequency}</span>
                          <span>•</span>
                          <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Calendar size={12} /> Next: {tpl.nextDueDateLocal}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontSize: '1.125rem',
                            fontWeight: 700,
                            color: tpl.type === 'income' ? 'var(--positive-emerald)' : 'var(--ink-primary)',
                          }}
                        >
                          {tpl.type === 'income' ? '+' : '-'}
                          {formatMinorToMajor(tpl.amountMinor, currentCurrency.code)}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>
                          Start: {tpl.startDateLocal}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleStatus(tpl.id)}
                          title={isPaused ? 'Resume schedule' : 'Pause schedule'}
                        >
                          {isPaused ? <Play size={16} /> : <Pause size={16} />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openRecurringModal(tpl)}
                          title="Edit template"
                        >
                          <Edit3 size={16} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(tpl.id, titleText)}
                          title="Delete template"
                          style={{ color: 'var(--negative-crimson)' }}
                        >
                          <Trash2 size={16} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};
