import React from 'react';
import { useApp } from '../../context/AppContext';
import { formatPeriodKeyDisplay, getCurrentPeriodKey } from '../../domain/budgetAndReport';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import { Button } from './Button';

interface MonthSelectorProps {
  style?: React.CSSProperties;
}

export const MonthSelector: React.FC<MonthSelectorProps> = ({ style }) => {
  const { selectedPeriodKey, shiftPeriodKey, setSelectedPeriodKey } = useApp();
  const currentKey = getCurrentPeriodKey();
  const isCurrentMonth = selectedPeriodKey === currentKey;

  return (
    <div
      className="month-selector-widget"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '8px',
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '4px 8px',
        boxShadow: 'var(--shadow-sm)',
        ...style,
      }}
    >
      <button
        type="button"
        onClick={() => shiftPeriodKey(-1)}
        aria-label="Previous month"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--ink-secondary)',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-subtle)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <ChevronLeft size={18} />
      </button>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.9375rem',
          fontWeight: 600,
          color: 'var(--ink-primary)',
          padding: '0 8px',
          minWidth: '130px',
          justifyContent: 'center',
        }}
      >
        <Calendar size={16} style={{ color: 'var(--primary-brand)' }} />
        <span>{formatPeriodKeyDisplay(selectedPeriodKey)}</span>
      </div>

      <button
        type="button"
        onClick={() => shiftPeriodKey(1)}
        aria-label="Next month"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '32px',
          height: '32px',
          borderRadius: 'var(--radius-sm)',
          border: 'none',
          backgroundColor: 'transparent',
          color: 'var(--ink-secondary)',
          cursor: 'pointer',
          transition: 'background-color 0.15s ease',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = 'var(--surface-subtle)')}
        onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
      >
        <ChevronRight size={18} />
      </button>

      {!isCurrentMonth && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setSelectedPeriodKey(currentKey)}
          style={{ fontSize: '0.75rem', padding: '4px 8px', marginLeft: '4px' }}
        >
          Today
        </Button>
      )}
    </div>
  );
};
