import React, { useState, useMemo } from 'react';
import { PageHeader } from '../components/ui/PageHeader';
import { EmptyState } from '../components/ui/EmptyState';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Badge } from '../components/ui/Badge';
import { CategoryIcon } from '../components/ui/CategoryIcon';
import { useApp } from '../context/AppContext';
import { formatMinorToMajor, formatDateLocalDisplay, getTransactionDisplayTime } from '../domain/moneyAndDate';
import { resolveTransactionCategory } from '../domain/categoriesData';
import { Receipt, Search, PlusCircle, XCircle, Calendar, Clock } from 'lucide-react';
import { Transaction } from '../domain/types';

export const TransactionsView: React.FC = () => {
  const {
    transactions,
    categories,
    currentCurrency,
    openAddModal,
    openTransactionDetails,
    transactionFilters,
    setTransactionFilters,
  } = useApp();

  // Filters State
  const [searchQuery, setSearchQuery] = useState<string>(transactionFilters.searchQuery || '');
  const [typeFilter, setTypeFilter] = useState<string>(transactionFilters.type || 'all');
  const [categoryFilter, setCategoryFilter] = useState<string>(transactionFilters.categoryId || 'all');
  const [monthFilter, setMonthFilter] = useState<string>(transactionFilters.month || '');

  React.useEffect(() => {
    setSearchQuery(transactionFilters.searchQuery || '');
    setTypeFilter(transactionFilters.type || 'all');
    setCategoryFilter(transactionFilters.categoryId || 'all');
    setMonthFilter(transactionFilters.month || '');
  }, [transactionFilters]);

  const isFilterActive = searchQuery || typeFilter !== 'all' || categoryFilter !== 'all' || monthFilter;

  const handleClearFilters = () => {
    setSearchQuery('');
    setTypeFilter('all');
    setCategoryFilter('all');
    setMonthFilter('');
    setTransactionFilters({});
  };

  // Filter and group transactions
  const filteredTransactions = useMemo(() => {
    const catMap = new Map(categories.map((c) => [c.id, c]));

    return transactions.filter((tx) => {
      if (typeFilter !== 'all' && tx.type !== typeFilter) return false;
      if (categoryFilter !== 'all' && tx.categoryId !== categoryFilter) return false;
      if (monthFilter && !tx.dateLocal.startsWith(monthFilter)) return false;

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const catName = catMap.get(tx.categoryId)?.name || '';
        const noteText = (tx.note || '').toLowerCase();
        const matches = noteText.includes(query) || catName.toLowerCase().includes(query);
        if (!matches) return false;
      }

      return true;
    });
  }, [transactions, categories, searchQuery, typeFilter, categoryFilter, monthFilter]);

  // Group filtered transactions by local date (newest date first)
  const groupedTransactions = useMemo(() => {
    const groups: { dateLocal: string; dateDisplay: string; items: Transaction[] }[] = [];
    const dateMap = new Map<string, Transaction[]>();

    for (const tx of filteredTransactions) {
      if (!dateMap.has(tx.dateLocal)) {
        dateMap.set(tx.dateLocal, []);
      }
      dateMap.get(tx.dateLocal)!.push(tx);
    }

    const sortedDates = Array.from(dateMap.keys()).sort((a, b) => b.localeCompare(a));
    for (const dateLocal of sortedDates) {
      groups.push({
        dateLocal,
        dateDisplay: formatDateLocalDisplay(dateLocal),
        items: dateMap.get(dateLocal)!,
      });
    }

    return groups;
  }, [filteredTransactions]);

  const categoryOptions = [
    { value: 'all', label: 'All Categories' },
    ...categories
      .filter((c) => !c.isArchived)
      .map((c) => ({ value: c.id, label: `${c.name} (${c.type})` })),
  ];

  return (
    <div>
      <PageHeader
        title="Transactions Ledger"
        subtitle="Full history of your local offline financial transactions."
        badgeText={`${filteredTransactions.length} Records`}
        action={
          <Button variant="primary" onClick={() => openAddModal()} leftIcon={<PlusCircle size={16} />}>
            Add Transaction
          </Button>
        }
      />

      {/* Search & Filter Controls Bar */}
      <div
        className="tx-filter-bar-mobile"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
          gap: '12px',
          marginBottom: '24px',
          backgroundColor: 'var(--surface-card)',
          padding: '16px',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-color)',
        }}
      >
        <Input
          placeholder="Search note or category..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          leftIcon={<Search size={16} />}
        />

        <Select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          options={[
            { value: 'all', label: 'All Types' },
            { value: 'expense', label: 'Expenses Only' },
            { value: 'income', label: 'Income Only' },
          ]}
        />

        <Select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          options={categoryOptions}
        />

        <Input
          type="month"
          value={monthFilter}
          onChange={(e) => setMonthFilter(e.target.value)}
          leftIcon={<Calendar size={16} />}
        />
      </div>

      {isFilterActive && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <span style={{ fontSize: '0.875rem', color: 'var(--ink-muted)' }}>
            Showing {filteredTransactions.length} matching transaction(s)
          </span>
          <Button variant="ghost" size="sm" onClick={handleClearFilters} leftIcon={<XCircle size={14} />}>
            Clear Filters
          </Button>
        </div>
      )}

      {/* Transactions List Grouped by Local Date */}
      {groupedTransactions.length === 0 ? (
        <EmptyState
          icon={<Receipt size={28} />}
          title={isFilterActive ? 'No matching transactions' : 'No transactions recorded yet'}
          description={
            isFilterActive
              ? 'Try adjusting your search query or filter options to view records.'
              : 'Add your first income or expense transaction manually.'
          }
          action={
            isFilterActive ? (
              <Button variant="secondary" onClick={handleClearFilters}>
                Clear Filters
              </Button>
            ) : (
              <Button variant="primary" onClick={() => openAddModal()} leftIcon={<PlusCircle size={16} />}>
                Add Transaction
              </Button>
            )
          }
        />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {groupedTransactions.map((group) => (
            <div key={group.dateLocal}>
              {/* Date Group Header */}
              <div
                style={{
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: 'var(--ink-muted)',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <span>{group.dateDisplay}</span>
                <span style={{ fontSize: '0.75rem', fontWeight: 400 }}>({group.dateLocal})</span>
              </div>

              {/* Transactions in this date group */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {group.items.map((tx) => {
                  const cat = resolveTransactionCategory(tx.categoryId, categories, tx.note, tx.type);
                  const isIncome = tx.type === 'income';

                  return (
                    <div
                      key={tx.id}
                      onClick={() => openTransactionDetails(tx)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '14px 16px',
                        backgroundColor: 'var(--surface-card)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--radius-md)',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                      }}
                      className="card-interactive tx-row-item"
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: isIncome ? 'var(--positive-bg)' : `${cat?.color || '#176B87'}15`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          <CategoryIcon name={cat?.icon || 'Tag'} color={isIncome ? 'var(--positive-emerald)' : cat?.color} size={20} />
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: 600, fontSize: '0.9375rem', color: 'var(--ink-primary)' }}>
                              {cat?.name || 'Uncategorized'}
                            </span>
                            <Badge variant={isIncome ? 'income' : 'expense'}>
                              {isIncome ? 'Income' : 'Expense'}
                            </Badge>
                          </div>
                          {tx.note && (
                            <div style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
                              {tx.note}
                            </div>
                          )}
                        </div>
                      </div>

                      <div style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            fontWeight: 700,
                            fontSize: '1rem',
                            color: isIncome ? 'var(--positive-emerald)' : 'var(--negative-crimson)',
                          }}
                        >
                          {isIncome ? '+' : '-'}{formatMinorToMajor(tx.amountMinor, tx.currency || currentCurrency.code)}
                        </div>
                        {getTransactionDisplayTime(tx) && (
                          <div
                            style={{
                              fontSize: '0.75rem',
                              color: 'var(--ink-muted)',
                              marginTop: '2px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'flex-end',
                              gap: '3px',
                            }}
                          >
                            <Clock size={11} />
                            <span>{getTransactionDisplayTime(tx)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
