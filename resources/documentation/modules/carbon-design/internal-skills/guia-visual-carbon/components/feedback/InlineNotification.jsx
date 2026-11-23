import React from 'react';

/**
 * Carbon inline notification. A 3px left status bar is the whole signal —
 * Carbon never relies on background colour alone, so the bar plus the icon
 * carry meaning for anyone who can't distinguish the hue.
 */
const kinds = {
  error: { bar: 'var(--cds-support-error)', bg: 'var(--cds-notification-background-error)', icon: <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-1.1 6h2.2v11h-2.2Zm1.1 17.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z" /> },
  success: { bar: 'var(--cds-support-success)', bg: 'var(--cds-notification-background-success)', icon: <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z" /> },
  warning: { bar: 'var(--cds-support-warning)', bg: 'var(--cds-notification-background-warning)', icon: <path d="M16 2 2 28h28ZM14.9 11h2.2v9h-2.2Zm1.1 14.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z" /> },
  info: { bar: 'var(--cds-support-info)', bg: 'var(--cds-notification-background-info)', icon: <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm1.1 22h-2.2V13h2.2Zm-1.1-15.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z" /> },
};

export function InlineNotification({
  kind = 'info',
  title,
  subtitle,
  lowContrast = false,
  hideCloseButton = false,
  actionLabel,
  onActionClick,
  onClose,
  style,
  ...rest
}) {
  const k = kinds[kind] || kinds.info;

  return (
    <div
      role={kind === 'error' ? 'alert' : 'status'}
      style={{
        display: 'flex', alignItems: 'flex-start',
        minBlockSize: 48,
        background: lowContrast ? k.bg : 'var(--cds-background-inverse)',
        color: lowContrast ? 'var(--cds-text-primary)' : 'var(--cds-text-inverse)',
        borderInlineStart: `3px solid ${k.bar}`,
        borderRadius: 'var(--cds-radius-none)',
        fontFamily: 'var(--cds-font-sans)',
        ...style,
      }}
      {...rest}
    >
      <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0, padding: 'var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-05)', color: lowContrast ? k.bar : 'var(--cds-icon-inverse)' }}>
        <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor">{k.icon}</svg>
      </span>

      <div style={{
        flex: 1, display: 'flex', flexWrap: 'wrap', alignItems: 'baseline', gap: 'var(--cds-spacing-03)',
        padding: 'var(--cds-spacing-04) 0',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        lineHeight: 'var(--cds-body-compact-01-line-height)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      }}>
        {title && <span style={{ fontWeight: 'var(--cds-font-weight-semibold)' }}>{title}</span>}
        {subtitle && <span>{subtitle}</span>}
      </div>

      {actionLabel && (
        <button type="button" onClick={onActionClick} style={{
          alignSelf: 'stretch', padding: '0 var(--cds-spacing-05)', background: 'transparent',
          color: lowContrast ? 'var(--cds-link-primary)' : 'var(--cds-link-inverse)',
          border: 'none', cursor: 'pointer', whiteSpace: 'nowrap',
          fontFamily: 'var(--cds-font-sans)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          fontWeight: 'var(--cds-font-weight-semibold)',
        }}>{actionLabel}</button>
      )}

      {!hideCloseButton && (
        <button type="button" aria-label="Close notification" onClick={onClose} style={{
          inlineSize: 48, blockSize: 48, flexShrink: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          color: lowContrast ? 'var(--cds-icon-primary)' : 'var(--cds-icon-inverse)',
          cursor: 'pointer',
        }}>
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z" /></svg>
        </button>
      )}
    </div>
  );
}
