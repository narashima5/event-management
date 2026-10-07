import React from 'react';
import { LucideIcon, Inbox } from 'lucide-react';

interface EmptyStateProps {
  icon?: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon = Inbox,
  title,
  description,
  actionLabel,
  onAction,
}) => {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        textAlign: 'center',
        padding: '56px 24px',
        background: 'rgba(255, 255, 255, 0.01)',
        border: '1px dashed var(--border-card)',
        borderRadius: 'var(--radius-lg)',
        margin: '16px 0',
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'rgba(99, 102, 241, 0.1)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'var(--primary)',
          marginBottom: '16px',
        }}
      >
        <Icon size={28} />
      </div>
      <h4 style={{ fontSize: '1.125rem', marginBottom: '8px', color: 'var(--text-main)' }}>
        {title}
      </h4>
      <p
        style={{
          color: 'var(--text-muted)',
          maxWidth: '420px',
          fontSize: '0.875rem',
          lineHeight: 1.6,
          marginBottom: actionLabel ? '20px' : '0',
        }}
      >
        {description}
      </p>
      {actionLabel && onAction && (
        <button onClick={onAction} className="btn btn-primary btn-sm">
          {actionLabel}
        </button>
      )}
    </div>
  );
};
