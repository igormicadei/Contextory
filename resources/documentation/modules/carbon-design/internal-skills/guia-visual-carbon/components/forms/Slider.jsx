import React from 'react';

/** Carbon slider — 2px track, square 14px thumb, min/max labels flanking the rail. */
export function Slider({
  id, labelText, value, defaultValue = 0, min = 0, max = 100, step = 1,
  disabled = false, hideTextInput = false, onChange, style, ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const pct = ((v - min) / (max - min)) * 100;

  const set = next => {
    if (!isControlled) setInternal(next);
    if (onChange) onChange({ value: next });
  };

  return (
    <div style={style} {...rest}>
      {labelText && (
        <label htmlFor={inputId} style={{
          display: 'block', marginBlockEnd: 'var(--cds-spacing-05)',
          color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
          fontSize: 'var(--cds-label-01-font-size)', letterSpacing: 'var(--cds-label-01-letter-spacing)',
        }}>{labelText}</label>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-05)' }}>
        <span style={{ color: 'var(--cds-text-primary)', fontSize: 'var(--cds-body-compact-01-font-size)' }}>{min}</span>

        <div style={{ position: 'relative', flex: 1, blockSize: 40, display: 'flex', alignItems: 'center' }}>
          <span aria-hidden="true" style={{ position: 'absolute', inlineSize: '100%', blockSize: 2, background: 'var(--cds-border-subtle-01)' }} />
          <span aria-hidden="true" style={{ position: 'absolute', inlineSize: `${pct}%`, blockSize: 2, background: disabled ? 'var(--cds-border-disabled)' : 'var(--cds-border-interactive)' }} />
          <span aria-hidden="true" style={{
            position: 'absolute', insetInlineStart: `${pct}%`, transform: 'translateX(-50%)',
            inlineSize: 14, blockSize: 14,
            background: disabled ? 'var(--cds-border-disabled)' : 'var(--cds-interactive)',
            borderRadius: '50%',
            outline: focused ? '2px solid var(--cds-focus)' : 'none', outlineOffset: 2,
          }} />
          <input
            id={inputId}
            type="range"
            min={min} max={max} step={step} value={v} disabled={disabled}
            onChange={e => set(Number(e.target.value))}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            style={{ inlineSize: '100%', margin: 0, opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer', blockSize: 14 }}
          />
        </div>

        <span style={{ color: 'var(--cds-text-primary)', fontSize: 'var(--cds-body-compact-01-font-size)' }}>{max}</span>

        {!hideTextInput && (
          <input
            type="number" value={v} min={min} max={max} step={step} disabled={disabled}
            onChange={e => set(Number(e.target.value))}
            style={{
              inlineSize: 64, blockSize: 40, padding: '0 var(--cds-spacing-03)',
              background: 'var(--cds-field-01)', color: 'var(--cds-text-primary)',
              border: 'none', borderBlockEnd: '1px solid var(--cds-border-strong-01)',
              fontFamily: 'var(--cds-font-sans)', fontSize: 'var(--cds-body-compact-01-font-size)',
              textAlign: 'center',
            }}
          />
        )}
      </div>
    </div>
  );
}
