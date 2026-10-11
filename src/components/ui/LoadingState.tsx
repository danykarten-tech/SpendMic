import React from 'react';

export const LoadingSkeleton: React.FC<{ height?: string; width?: string; borderRadius?: string }> = ({
  height = '20px',
  width = '100%',
  borderRadius = 'var(--radius-sm)',
}) => {
  return (
    <div
      style={{
        height,
        width,
        borderRadius,
        backgroundColor: 'var(--surface-subtle)',
        animation: 'pulse 1.5s ease-in-out infinite',
      }}
      aria-hidden="true"
    />
  );
};

export const CardSkeleton: React.FC = () => {
  return (
    <div
      style={{
        backgroundColor: 'var(--surface-card)',
        border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)',
        padding: '24px',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
      }}
      aria-label="Loading content..."
    >
      <LoadingSkeleton height="24px" width="40%" />
      <LoadingSkeleton height="16px" width="80%" />
      <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
        <LoadingSkeleton height="36px" width="100px" />
        <LoadingSkeleton height="36px" width="100px" />
      </div>
    </div>
  );
};
