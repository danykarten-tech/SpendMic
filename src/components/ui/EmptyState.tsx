import React from 'react';
import { Card } from './Card';
import { Badge } from './Badge';

export interface EmptyStateProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  badgeText?: string;
  action?: React.ReactNode;
  secondaryAction?: React.ReactNode;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  badgeText,
  action,
  secondaryAction,
}) => {
  return (
    <Card
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '48px 24px',
        backgroundColor: 'var(--surface-card)',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          backgroundColor: 'var(--primary-subtle)',
          color: 'var(--primary-brand)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
        }}
      >
        {icon}
      </div>

      {badgeText && (
        <div style={{ marginBottom: '12px' }}>
          <Badge variant="muted">{badgeText}</Badge>
        </div>
      )}

      <h3
        style={{
          fontSize: '1.125rem',
          fontWeight: 600,
          color: 'var(--ink-primary)',
          marginBottom: '8px',
        }}
      >
        {title}
      </h3>

      <p
        style={{
          fontSize: '0.875rem',
          color: 'var(--ink-muted)',
          maxWidth: '420px',
          marginBottom: action || secondaryAction ? '24px' : '0',
          lineHeight: '1.5',
        }}
      >
        {description}
      </p>

      {(action || secondaryAction) && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}
        >
          {action}
          {secondaryAction}
        </div>
      )}
    </Card>
  );
};
