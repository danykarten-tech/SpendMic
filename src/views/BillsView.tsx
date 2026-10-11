import React, { useState } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { EmptyState } from '../components/ui/EmptyState';
import { useApp } from '../context/AppContext';
import { useToast } from '../components/ui/Toast';
import { formatMinorToMajor, formatDateLocalDisplay } from '../domain/moneyAndDate';
import { calculateBillStatus } from '../domain/recurringAndBills';
import { CalendarCheck, Plus, CheckCircle2, AlertTriangle, Clock, Trash2, Edit3 } from 'lucide-react';

export const BillsView: React.FC = () => {
  const { bills, categories, currentCurrency, openBillModal, markBillPaid, deleteBill } = useApp();
  const { showToast } = useToast();
  const [processingId, setProcessingId] = useState<string | null>(null);

  const getCategory = (catId: string) => categories.find((c) => c.id === catId);

  const handleMarkPaid = async (billId: string, billName: string) => {
    setProcessingId(billId);
    try {
      await markBillPaid(billId, true);
      showToast({
        type: 'success',
        title: 'Bill Paid',
        description: `Marked "${billName}" as paid and recorded matching expense.`,
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Payment Error',
        description: err instanceof Error ? err.message : 'Could not mark bill paid.',
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDelete = async (billId: string, billName: string) => {
    if (!window.confirm(`Delete bill "${billName}"?`)) return;
    try {
      await deleteBill(billId);
      showToast({
        type: 'success',
        title: 'Bill Removed',
        description: 'Bill record deleted.',
      });
    } catch (err) {
      showToast({
        type: 'error',
        title: 'Delete Error',
        description: 'Could not delete bill.',
      });
    }
  };

  const overdueCount = bills.filter((b) => !b.isPaid && calculateBillStatus(b).status === 'overdue').length;
  const unpaidCount = bills.filter((b) => !b.isPaid).length;
  const paidCount = bills.filter((b) => b.isPaid).length;

  return (
    <div>
      <PageHeader
        title="Bill Tracker"
        subtitle="Keep track of recurring and one-off bills, monitor due dates, and record payments directly."
        action={
          <Button variant="primary" onClick={() => openBillModal(null)} leftIcon={<Plus size={16} />}>
            Add Bill
          </Button>
        }
      />

      {/* Overview Stat Cards */}
      <div
        className="stats-grid-responsive"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}
      >
        <Card style={{ backgroundColor: 'var(--surface-card)' }}>
          <CardContent style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', backgroundColor: 'rgba(239, 68, 68, 0.1)', color: 'var(--negative-crimson)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-primary)' }}>{overdueCount}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>Overdue Bills</div>
            </div>
          </CardContent>
        </Card>

        <Card style={{ backgroundColor: 'var(--surface-card)' }}>
          <CardContent style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--primary-subtle)', color: 'var(--primary-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-primary)' }}>{unpaidCount}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>Total Pending</div>
            </div>
          </CardContent>
        </Card>

        <Card className="stats-grid-span2" style={{ backgroundColor: 'var(--surface-card)' }}>
          <CardContent style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '40px', height: '40px', borderRadius: 'var(--radius-sm)', backgroundColor: 'var(--positive-subtle)', color: 'var(--positive-emerald)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <CheckCircle2 size={20} />
            </div>
            <div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--ink-primary)' }}>{paidCount}</div>
              <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)' }}>Paid Bills</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Bill List */}
      {bills.length === 0 ? (
        <Card>
          <CardContent>
            <EmptyState
              title="No Bills Recorded"
              description="Add your upcoming bills like rent, credit cards, or utility payments to stay ahead of due dates."
              icon={<CalendarCheck size={32} />}
              action={
                <Button variant="primary" onClick={() => openBillModal(null)} leftIcon={<Plus size={16} />}>
                  Add Your First Bill
                </Button>
              }
            />
          </CardContent>
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {bills.map((bill) => {
            const cat = getCategory(bill.categoryId);
            const statusRes = calculateBillStatus(bill);

            let statusBadge = <Badge variant="info">{statusRes.label}</Badge>;
            if (bill.isPaid) {
              statusBadge = <Badge variant="income">{statusRes.label}</Badge>;
            } else if (statusRes.status === 'overdue') {
              statusBadge = <Badge variant="expense">{statusRes.label}</Badge>;
            } else if (statusRes.daysDiff === 0) {
              statusBadge = <Badge variant="warning">{statusRes.label}</Badge>;
            }

            return (
              <Card key={bill.id} className="bill-row-card" style={{ opacity: bill.isPaid ? 0.75 : 1 }}>
                <CardContent style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
                    {/* Left Details */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: '220px' }}>
                      <CategoryIcon name={cat?.icon || 'CalendarCheck'} color={cat?.color || 'var(--primary-brand)'} size={20} />
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                          <span style={{ fontWeight: 600, fontSize: '1rem', color: 'var(--ink-primary)' }}>
                            {bill.name}
                          </span>
                          {statusBadge}
                        </div>
                        <div style={{ fontSize: '0.8125rem', color: 'var(--ink-muted)', marginTop: '2px' }}>
                          Category: {cat?.name || 'General'} • Due: {formatDateLocalDisplay(bill.dueDateLocal)}
                        </div>
                      </div>
                    </div>

                    {/* Right Amount & Actions */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.125rem', fontWeight: 700, color: 'var(--ink-primary)' }}>
                          {formatMinorToMajor(bill.amountMinor, currentCurrency.code)}
                        </div>
                        {bill.note && <div style={{ fontSize: '0.75rem', color: 'var(--ink-muted)' }}>{bill.note}</div>}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {!bill.isPaid && (
                          <Button
                            variant="primary"
                            size="sm"
                            onClick={() => handleMarkPaid(bill.id, bill.name)}
                            isLoading={processingId === bill.id}
                            leftIcon={<CheckCircle2 size={14} />}
                          >
                            Mark Paid
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" onClick={() => openBillModal(bill)} title="Edit bill">
                          <Edit3 size={16} />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDelete(bill.id, bill.name)} title="Delete bill" style={{ color: 'var(--negative-crimson)' }}>
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
