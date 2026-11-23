import React from 'react';

const heights = { sm: 32, md: 40, lg: 48 };

/**
 * Carbon search field. Magnifier sits inside the left padding; a close button
 * appears only once there is a value to clear.
 */
export function Search({
  id, labelText = 'Search', placeholder = 'Search', value, defaultValue,
  size = 'lg', disabled = false, closeButtonLabelText = 'Clear search input',
  onChange, onClear, style, ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const h = heights[size] || heights.lg;

  const clear = () => {
    if (!isControlled) setInternal('');
    if (onClear) onClear();
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', blockSize: h, background: 'var(--cds-field-01)', borderBlockEnd: '1px solid var(--cds-border-strong-01)', outline: focused ? '2px solid var(--cds-focus)' : 'none', outlineOffset: '-2px', ...style }}>
      <label htmlFor={inputId} className="cds--visually-hidden">{labelText}</label>

      <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0, marginInline: 'var(--cds-spacing-05) var(--cds-spacing-04)', color: 'var(--cds-icon-primary)' }}>
        <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M29 27.586 20.336 18.92a11.014 11.014 0 1 0-1.414 1.414L27.586 29ZM5 12a9 9 0 1 1 9 9 9.01 9.01 0 0 1-9-9Z" /></svg>
      </span>

      <input
        id={inputId}
        type="text"
        role="searchbox"
        value={v}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => { if (!isControlled) setInternal(e.target.value); if (onChange) onChange(e); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          flex: 1, blockSize: '100%', padding: 0, background: 'transparent',
          color: 'var(--cds-text-primary)', border: 'none', outline: 'none',
          fontFamily: 'var(--cds-font-sans)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        }}
        {...rest}
      />

      {v && (
        <button
          type="button"
          aria-label={closeButtonLabelText}
          onClick={clear}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: h, blockSize: h, flexShrink: 0,
            background: 'transparent', border: 'none', cursor: 'pointer',
            color: 'var(--cds-icon-primary)',
            borderInlineStart: '1px solid var(--cds-border-subtle-01)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z" /></svg>
        </button>
      )}
    </div>
  );
}
