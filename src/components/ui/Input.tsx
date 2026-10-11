import React from 'react';
import { AlertCircle } from 'lucide-react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, id, className = '', ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={inputId} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--negative-crimson)', marginLeft: '4px' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          {leftIcon && (
            <span
              style={{
                position: 'absolute',
                left: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
                pointerEvents: 'none',
              }}
            >
              {leftIcon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={`form-input ${className}`.trim()}
            style={{
              paddingLeft: leftIcon ? '40px' : undefined,
              paddingRight: rightIcon ? '40px' : undefined,
              borderColor: error ? 'var(--negative-crimson)' : undefined,
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined}
            {...props}
          />
          {rightIcon && (
            <span
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--ink-muted)',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              {rightIcon}
            </span>
          )}
        </div>
        {error && (
          <div id={`${inputId}-error`} className="form-error-msg" role="alert">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        {!error && helperText && (
          <div id={`${inputId}-helper`} className="form-helper">
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';
