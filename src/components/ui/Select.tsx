import React from 'react';
import { ChevronDown, AlertCircle } from 'lucide-react';

export interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: SelectOption[];
  error?: string;
  helperText?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ label, options, error, helperText, id, className = '', ...props }, ref) => {
    const selectId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="form-group">
        {label && (
          <label htmlFor={selectId} className="form-label">
            {label}
            {props.required && <span style={{ color: 'var(--negative-crimson)', marginLeft: '4px' }}>*</span>}
          </label>
        )}
        <div style={{ position: 'relative', width: '100%' }}>
          <select
            ref={ref}
            id={selectId}
            className={`form-select ${className}`.trim()}
            style={{
              paddingRight: '36px',
              appearance: 'none',
              borderColor: error ? 'var(--negative-crimson)' : undefined,
            }}
            aria-invalid={!!error}
            aria-describedby={error ? `${selectId}-error` : helperText ? `${selectId}-helper` : undefined}
            {...props}
          >
            {options.map((opt) => (
              <option key={opt.value} value={opt.value} disabled={opt.disabled}>
                {opt.label}
              </option>
            ))}
          </select>
          <span
            style={{
              position: 'absolute',
              right: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: 'var(--ink-muted)',
              pointerEvents: 'none',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <ChevronDown size={16} />
          </span>
        </div>
        {error && (
          <div id={`${selectId}-error`} className="form-error-msg" role="alert">
            <AlertCircle size={14} />
            <span>{error}</span>
          </div>
        )}
        {!error && helperText && (
          <div id={`${selectId}-helper`} className="form-helper">
            {helperText}
          </div>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';
