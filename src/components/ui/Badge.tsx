import React from 'react';

export interface BadgeProps {
  variant?: 'income' | 'expense' | 'info' | 'muted' | 'warning';
  icon?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}

export const Badge: React.FC<BadgeProps> = ({
  variant = 'info',
  icon,
  children,
  className = '',
}) => {
  return (
    <span className={`badge badge-${variant} ${className}`.trim()}>
      {icon && <span style={{ display: 'inline-flex', alignItems: 'center' }}>{icon}</span>}
      <span>{children}</span>
    </span>
  );
};
