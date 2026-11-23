import React from 'react';

/**
 * Carbon overflow menu. A 40px square trigger holding the vertical three-dot
 * glyph, opening a flat 160px+ panel with 40px rows and no rounding.
 */
export function OverflowMenu({ items = [], ariaLabel = 'Open and close list of options', flipped = false, style, ...rest }) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => {
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block', ...style }} {...rest}>
      <button
        type="button"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen(o => !o)}
        style={{
          inlineSize: 40, blockSize: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'var(--cds-layer-selected-01)' : 'transparent',
          border: 'none', borderRadius: 'var(--cds-radius-none)',
          color: 'var(--cds-icon-primary)', cursor: 'pointer',
        }}
        onMouseEnter={e => { if (!open) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
        onMouseLeave={e => { if (!open) e.currentTarget.style.background = 'transparent'; }}
      >
        <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
          <circle cx="16" cy="8" r="2" /><circle cx="16" cy="16" r="2" /><circle cx="16" cy="24" r="2" />
        </svg>
      </button>

      {open && (
        <ul role="menu" style={{
          position: 'absolute', insetBlockStart: '100%', zIndex: 200,
          [flipped ? 'insetInlineStart' : 'insetInlineEnd']: 0,
          minInlineSize: 160, margin: 0, padding: 0, listStyle: 'none',
          background: 'var(--cds-layer-01)',
          border: '1px solid var(--cds-border-subtle-01)',
        }}>
          {items.map((it, i) => (
            <li key={i} role="none">
              <button
                role="menuitem"
                type="button"
                disabled={it.disabled}
                onClick={() => { setOpen(false); if (it.onClick) it.onClick(); }}
                style={{
                  inlineSize: '100%', minBlockSize: 40,
                  display: 'flex', alignItems: 'center',
                  padding: '0 var(--cds-spacing-05)',
                  background: 'transparent',
                  color: it.isDelete ? 'var(--cds-text-error)' : it.disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
                  border: 'none',
                  borderBlockEnd: i < items.length - 1 ? '1px solid var(--cds-border-subtle-01)' : 'none',
                  fontFamily: 'var(--cds-font-sans)',
                  fontSize: 'var(--cds-body-compact-01-font-size)',
                  letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                  textAlign: 'start',
                  cursor: it.disabled ? 'not-allowed' : 'pointer',
                }}
                onMouseEnter={e => { if (!it.disabled) e.currentTarget.style.background = it.isDelete ? 'var(--cds-button-danger-hover)' : 'var(--cds-layer-hover-01)'; if (it.isDelete) e.currentTarget.style.color = 'var(--cds-text-on-color)'; }}
                onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = it.isDelete ? 'var(--cds-text-error)' : 'var(--cds-text-primary)'; }}
              >
                {it.label}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
