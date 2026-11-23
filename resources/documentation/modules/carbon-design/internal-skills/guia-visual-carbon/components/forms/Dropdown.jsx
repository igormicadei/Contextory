import React from 'react';

const heights = { sm: 32, md: 40, lg: 48 };

/**
 * Carbon dropdown — a custom listbox (unlike Select, which wraps the native
 * control). The open menu is a flat square panel with a 1px rule per row and no
 * shadow; selection is marked with a checkmark, not a fill.
 */
export function Dropdown({
  id, titleText, label = 'Choose an option', helperText,
  items = [], selectedItem, size = 'md', disabled = false,
  invalid = false, invalidText, onChange, style, ...rest
}) {
  const inputId = id || React.useId();
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(selectedItem ?? null);
  const ref = React.useRef(null);
  const isControlled = selectedItem !== undefined;
  const sel = isControlled ? selectedItem : internal;
  const h = heights[size] || heights.md;
  const text = it => (typeof it === 'string' ? it : it?.label);

  React.useEffect(() => {
    const away = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);

  const pick = it => {
    if (!isControlled) setInternal(it);
    setOpen(false);
    if (onChange) onChange({ selectedItem: it });
  };

  return (
    <div ref={ref} style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {titleText && (
        <label htmlFor={inputId} style={{
          marginBlockEnd: 'var(--cds-spacing-03)',
          color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
          fontSize: 'var(--cds-label-01-font-size)',
          letterSpacing: 'var(--cds-label-01-letter-spacing)',
        }}>{titleText}</label>
      )}

      <div style={{ position: 'relative' }}>
        <button
          id={inputId}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          disabled={disabled}
          onClick={() => setOpen(o => !o)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            inlineSize: '100%', blockSize: h,
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '0 var(--cds-spacing-05)',
            background: 'var(--cds-field-01)',
            color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
            border: 'none',
            borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
            borderRadius: 'var(--cds-radius-none)',
            fontFamily: 'var(--cds-font-sans)',
            fontSize: 'var(--cds-body-compact-01-font-size)',
            letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
            textAlign: 'start',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: focused ? '2px solid var(--cds-focus)' : 'none',
            outlineOffset: '-2px',
          }}
          {...rest}
        >
          <span style={{ color: sel ? 'inherit' : 'var(--cds-text-placeholder)' }}>{sel ? text(sel) : label}</span>
          <span aria-hidden="true" style={{ lineHeight: 0, color: 'var(--cds-icon-primary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)' }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z" /></svg>
          </span>
        </button>

        {open && (
          <ul role="listbox" style={{
            position: 'absolute', insetInlineStart: 0, insetInlineEnd: 0, insetBlockStart: '100%',
            zIndex: 100, margin: 0, padding: 0, listStyle: 'none',
            background: 'var(--cds-layer-01)',
            maxBlockSize: 264, overflowY: 'auto',
          }}>
            {items.map((it, i) => {
              const on = sel && text(sel) === text(it);
              return (
                <li
                  key={i}
                  role="option"
                  aria-selected={on}
                  onClick={() => pick(it)}
                  style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    blockSize: h, padding: '0 var(--cds-spacing-05)',
                    borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
                    background: on ? 'var(--cds-layer-selected-01)' : 'transparent',
                    color: 'var(--cds-text-primary)',
                    fontSize: 'var(--cds-body-compact-01-font-size)',
                    letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                    cursor: 'pointer',
                  }}
                  onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
                  onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
                >
                  {text(it)}
                  {on && (
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="var(--cds-icon-primary)"><path d="M13 24 4 15l1.4-1.4 7.6 7.6L26.6 7.9 28 9.3z" /></svg>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {(helperText || (invalid && invalidText)) && (
        <div style={{ marginBlockStart: 'var(--cds-spacing-02)', color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)', fontSize: 'var(--cds-helper-text-01-font-size)' }}>
          {invalid ? invalidText : helperText}
        </div>
      )}
    </div>
  );
}
