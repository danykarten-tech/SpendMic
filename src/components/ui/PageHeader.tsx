import React from 'react';
import { Badge } from './Badge';

export interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badgeText?: string;
  badgeVariant?: 'income' | 'expense' | 'info' | 'muted';
  action?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  badgeText,
  badgeVariant = 'info',
  action,
}) => {
  return (
    <div
      className="page-header-container"
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        marginBottom: '24px',
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '16px',
          flexWrap: 'wrap',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <h1 className="page-header-title" style={{ fontSize: '1.75rem', fontWeight: 700, color: 'var(--ink-primary)', letterSpacing: '-0.02em' }}>
            {title}
          </h1>
          {badgeText && <Badge variant={badgeVariant}>{badgeText}</Badge>}
        </div>

        {action && <div>{action}</div>}
      </div>

      {subtitle && (
        <p className="page-header-subtitle" style={{ fontSize: '0.9375rem', color: 'var(--ink-muted)', maxWidth: '600px', lineHeight: '1.5' }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
