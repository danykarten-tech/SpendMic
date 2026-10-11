import React, { useState } from 'react';
import { Mic, Sparkles } from 'lucide-react';

interface VoiceMicButtonProps {
  onClick: () => void;
  className?: string;
  variant?: 'floating' | 'header' | 'icon' | 'sidebar';
}

export const VoiceMicButton: React.FC<VoiceMicButtonProps> = ({
  onClick,
  className = '',
  variant = 'header',
}) => {
  const [isHovered, setIsHovered] = useState(false);

  if (variant === 'floating') {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={className}
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #FF2E93 0%, #7928CA 50%, #4F46E5 100%)',
          color: '#FFFFFF',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: isHovered
            ? '0 12px 28px rgba(124, 58, 237, 0.6), 0 0 20px rgba(255, 46, 147, 0.6)'
            : '0 6px 20px rgba(124, 58, 237, 0.45)',
          transform: isHovered ? 'scale(1.08)' : 'scale(1)',
          transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
          border: '2px solid rgba(255, 255, 255, 0.6)',
          cursor: 'pointer',
        }}
        aria-label="Open Voice Assistant"
        title="Offline Voice Assistant"
      >
        <Mic size={24} />
      </button>
    );
  }

  if (variant === 'sidebar') {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={`voice-ai-hero-btn ${className}`}
        style={{
          width: '100%',
          height: '44px',
          padding: '0 14px',
          borderRadius: 'var(--radius-md)',
          justifyContent: 'space-between',
          border: '1.5px solid rgba(255, 255, 255, 0.8)',
        }}
        title="Voice Assistant — Speak expenses, income, bills & savings"
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              backgroundColor: '#FFFFFF',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.2)',
              flexShrink: 0,
            }}
          >
            <Mic size={15} color="#7928CA" strokeWidth={2.6} />
          </span>
          <span style={{ fontWeight: 700, fontSize: '0.875rem', color: '#FFFFFF', letterSpacing: '0.01em' }}>
            Voice Assistant
          </span>
        </div>
        <Sparkles size={16} color="#FDE047" className="voice-sparkle-anim" />
      </button>
    );
  }

  if (variant === 'icon') {
    return (
      <button
        onClick={onClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        className={className}
        style={{
          padding: '8px',
          borderRadius: '12px',
          backgroundColor: isHovered ? 'var(--primary-subtle)' : 'var(--surface-subtle)',
          color: 'var(--primary-brand)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          transition: 'all 0.15s ease',
        }}
        title="Voice Assistant"
      >
        <Mic size={18} />
      </button>
    );
  }

  // Header flagship pill button (Prominently Highlighted)
  return (
    <button
      onClick={onClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className={`voice-ai-hero-btn ${className}`}
      title="Tap to speak your expense, income, bills or savings with Voice Assistant"
      aria-label="Voice AI"
    >
      <span className="voice-pulse-ring-anim" />

      {/* High-contrast circular mic badge */}
      <span
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: '#FFFFFF',
          boxShadow: '0 2px 6px rgba(0, 0, 0, 0.25)',
          flexShrink: 0,
        }}
      >
        <Mic size={14} color="#7928CA" strokeWidth={2.6} />
      </span>

      {/* Bold label */}
      <span
        style={{
          fontWeight: 700,
          fontSize: '0.875rem',
          color: '#FFFFFF',
          letterSpacing: '0.01em',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.25)',
        }}
      >
        Voice AI
      </span>

      {/* Sparkling animation */}
      <Sparkles size={14} color="#FDE047" className="voice-sparkle-anim" />
    </button>
  );
};

