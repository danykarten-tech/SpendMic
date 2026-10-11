import React from 'react';

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
}

export const Card: React.FC<CardProps> = ({
  interactive = false,
  children,
  className = '',
  ...props
}) => {
  const interactiveClass = interactive ? 'card-interactive' : '';
  return (
    <div className={`card ${interactiveClass} ${className}`.trim()} {...props}>
      {children}
    </div>
  );
};

export const CardHeader: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`card-header ${className}`} style={{ marginBottom: '12px' }} {...props}>
    {children}
  </div>
);

export const CardTitle: React.FC<React.HTMLAttributes<HTMLHeadingElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <h3 className={`card-title ${className}`} style={{ fontSize: '1.125rem', fontWeight: 600, color: 'var(--ink-primary)' }} {...props}>
    {children}
  </h3>
);

export const CardDescription: React.FC<React.HTMLAttributes<HTMLParagraphElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <p className={`card-description ${className}`} style={{ fontSize: '0.875rem', color: 'var(--ink-muted)', marginTop: '4px' }} {...props}>
    {children}
  </p>
);

export const CardContent: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div className={`card-content ${className}`} {...props}>
    {children}
  </div>
);

export const CardFooter: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({
  children,
  className = '',
  ...props
}) => (
  <div
    className={`card-footer ${className}`}
    style={{
      marginTop: '16px',
      paddingTop: '16px',
      borderTop: '1px solid var(--border-color)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
    }}
    {...props}
  >
    {children}
  </div>
);
