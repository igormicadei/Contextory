import React from 'react';

const widths = { xs: 400, sm: 600, md: 840, lg: 1056 };

/**
 * Carbon modal. Square container on layer-01 over a 50%-black overlay. The
 * footer buttons are full-bleed and equal-width, butted edge to edge with no
 * gap and no padding — that flush button bar is the Carbon modal signature.
 */
export function Modal({
  open = false,
  modalHeading,
  modalLabel,
  size = 'md',
  danger = false,
  primaryButtonText = 'Save',
  secondaryButtonText = 'Cancel',
  primaryButtonDisabled = false,
  passiveModal = false,
  onRequestClose,
  onRequestSubmit,
  onSecondarySubmit,
  children,
  style,
  ...rest
}) {
  React.useEffect(() => {
    if (!open) return;
    const esc = e => { if (e.key === 'Escape' && onRequestClose) onRequestClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onRequestClose]);

  if (!open) return null;

  const footerBtn = (label, variant, onClick, disabled) => {
    const bg = variant === 'primary'
      ? (danger ? 'var(--cds-button-danger-primary)' : 'var(--cds-button-primary)')
      : 'var(--cds-button-secondary)';
    return (
      <button
        type="button"
        disabled={disabled}
        onClick={onClick}
        style={{
          flex: 1, minBlockSize: 64,
          padding: 'var(--cds-spacing-05) var(--cds-spacing-10) var(--cds-spacing-05) var(--cds-spacing-05)',
          background: disabled ? 'var(--cds-button-disabled)' : bg,
          color: disabled ? 'var(--cds-text-on-color-disabled)' : 'var(--cds-text-on-color)',
          border: 'none', borderRadius: 'var(--cds-radius-none)',
          fontFamily: 'var(--cds-font-sans)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
          textAlign: 'start',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {label}
      </button>
    );
  };

  return (
    <div
      onClick={e => { if (e.target === e.currentTarget && onRequestClose) onRequestClose(); }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9000,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'var(--cds-overlay)',
        padding: 'var(--cds-spacing-05)',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={modalHeading}
        style={{
          inlineSize: '100%', maxInlineSize: widths[size] || widths.md,
          maxBlockSize: '90vh', display: 'flex', flexDirection: 'column',
          background: 'var(--cds-layer-01)',
          borderRadius: 'var(--cds-radius-none)',
          fontFamily: 'var(--cds-font-sans)',
          ...style,
        }}
        {...rest}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', padding: 'var(--cds-spacing-05)', paddingBlockEnd: 'var(--cds-spacing-03)' }}>
          <div style={{ flex: 1 }}>
            {modalLabel && (
              <div style={{ color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-label-01-font-size)', letterSpacing: 'var(--cds-label-01-letter-spacing)' }}>{modalLabel}</div>
            )}
            <h2 style={{
              margin: 0, color: 'var(--cds-text-primary)',
              fontSize: 'var(--cds-heading-03-font-size)',
              fontWeight: 'var(--cds-heading-03-font-weight)',
              lineHeight: 'var(--cds-heading-03-line-height)',
            }}>{modalHeading}</h2>
          </div>
          <button type="button" aria-label="Close" onClick={onRequestClose} style={{
            inlineSize: 48, blockSize: 48, marginBlockStart: 'calc(var(--cds-spacing-05) * -1)',
            marginInlineEnd: 'calc(var(--cds-spacing-05) * -1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: 'var(--cds-icon-primary)', cursor: 'pointer',
          }}>
            <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z" /></svg>
          </button>
        </div>

        <div style={{
          flex: 1, overflowY: 'auto',
          padding: '0 var(--cds-spacing-05) var(--cds-spacing-09)',
          paddingInlineEnd: '20%',
          color: 'var(--cds-text-primary)',
          fontSize: 'var(--cds-body-01-font-size)',
          lineHeight: 'var(--cds-body-01-line-height)',
          letterSpacing: 'var(--cds-body-01-letter-spacing)',
        }}>
          {children}
        </div>

        {!passiveModal && (
          <div style={{ display: 'flex' }}>
            {footerBtn(secondaryButtonText, 'secondary', onSecondarySubmit || onRequestClose, false)}
            {footerBtn(primaryButtonText, 'primary', onRequestSubmit, primaryButtonDisabled)}
          </div>
        )}
      </div>
    </div>
  );
}
