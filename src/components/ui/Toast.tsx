import React, { createContext, useContext, useState, useCallback } from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertCircle, X } from 'lucide-react';
import { ToastMessage } from '../../domain/types';

interface ToastContextType {
  showToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (toast: Omit<ToastMessage, 'id'>) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { ...toast, id };
      setToasts((prev) => [...prev, newToast]);

      const duration = toast.durationMs ?? 4000;
      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, removeToast }}>
      {children}
      <div
        aria-live="polite"
        style={{
          position: 'fixed',
          bottom: '80px', // above bottom navbar on mobile
          right: '20px',
          left: '20px',
          maxWidth: '400px',
          marginLeft: 'auto',
          zIndex: 2000,
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          pointerEvents: 'none',
        }}
      >
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

const ToastItem: React.FC<{ toast: ToastMessage; onClose: () => void }> = ({ toast, onClose }) => {
  const icons = {
    info: <Info size={18} style={{ color: 'var(--primary-brand)' }} />,
    success: <CheckCircle2 size={18} style={{ color: 'var(--positive-emerald)' }} />,
    warning: <AlertTriangle size={18} style={{ color: 'var(--warning-amber)' }} />,
    error: <AlertCircle size={18} style={{ color: 'var(--negative-crimson)' }} />,
  };

  const borderColors = {
    info: 'var(--primary-border)',
    success: 'var(--positive-border)',
    warning: 'var(--warning-border)',
    error: 'var(--negative-border)',
  };

  return (
    <div
      style={{
        pointerEvents: 'auto',
        backgroundColor: 'var(--surface-card)',
        border: `1px solid ${borderColors[toast.type]}`,
        borderRadius: 'var(--radius-md)',
        boxShadow: 'var(--shadow-lg)',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        animation: 'slideUp 0.2s ease-out',
      }}
      role="alert"
    >
      <div style={{ marginTop: '2px' }}>{icons[toast.type]}</div>
      <div style={{ flex: 1 }}>
        <h4 style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--ink-primary)' }}>
          {toast.title}
        </h4>
        {toast.description && (
          <p style={{ fontSize: '0.8125rem', color: 'var(--ink-secondary)', marginTop: '2px' }}>
            {toast.description}
          </p>
        )}
      </div>
      <button
        onClick={onClose}
        aria-label="Dismiss toast"
        style={{
          color: 'var(--ink-muted)',
          padding: '2px',
          display: 'flex',
          alignItems: 'center',
          borderRadius: '4px',
        }}
      >
        <X size={16} />
      </button>
    </div>
  );
};
