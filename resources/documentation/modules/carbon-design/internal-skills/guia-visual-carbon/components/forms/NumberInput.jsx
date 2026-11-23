import React from 'react';

const heights = { sm: 32, md: 40, lg: 48 };

/**
 * Carbon number input. Stepper controls are stacked square buttons on the right
 * edge, divided by a 1px rule — no rounding, no chrome spinner.
 */
export function NumberInput({
  id, label, helperText, value, defaultValue = 0,
  min, max, step = 1, size = 'md', disabled = false,
  invalid = false, invalidText, onChange, style, ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const h = heights[size] || heights.md;

  const set = next => {
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    if (!isControlled) setInternal(next);
    if (onChange) onChange(next);
  };

  const stepper = (dir, path, aria) => (
    <button
      type="button"
      aria-label={aria}
      disabled={disabled || (dir > 0 ? max !== undefined && v >= max : min !== undefined && v <= min)}
      onClick={() => set(Number(v) + dir * step)}
      style={{
        inlineSize: h, blockSize: h / 2, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none', color: 'var(--cds-icon-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
    >
      <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">{path}</svg>
    </button>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {label && (
        <label htmlFor={inputId} style={{
          marginBlockEnd: 'var(--cds-spacing-03)',
          color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
          fontSize: 'var(--cds-label-01-font-size)',
          letterSpacing: 'var(--cds-label-01-letter-spacing)',
        }}>{label}</label>
      )}

      <div style={{
        display: 'flex', alignItems: 'stretch', blockSize: h,
        background: 'var(--cds-field-01)',
        borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
        outline: focused ? '2px solid var(--cds-focus)' : 'none', outlineOffset: '-2px',
      }}>
        <input
          id={inputId}
          type="number"
          value={v}
          min={min}
          max={max}
          step={step}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={e => set(Number(e.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            flex: 1, minInlineSize: 0, padding: '0 var(--cds-spacing-05)',
            background: 'transparent', color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
            border: 'none', outline: 'none', appearance: 'textfield',
            fontFamily: 'var(--cds-font-sans)',
            fontSize: 'var(--cds-body-compact-01-font-size)',
            letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
          }}
          {...rest}
        />
        <div style={{ display: 'flex', flexDirection: 'column', borderInlineStart: '1px solid var(--cds-border-subtle-01)' }}>
          {stepper(1, <path d="M17 15V8h-2v7H8v2h7v7h2v-7h7v-2z" />, 'Increment number')}
          <span style={{ blockSize: 1, background: 'var(--cds-border-subtle-01)' }} />
          {stepper(-1, <path d="M8 15h16v2H8z" />, 'Decrement number')}
        </div>
      </div>

      {(helperText || (invalid && invalidText)) && (
        <div style={{ marginBlockStart: 'var(--cds-spacing-02)', color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)', fontSize: 'var(--cds-helper-text-01-font-size)' }}>
          {invalid ? invalidText : helperText}
        </div>
      )}
    </div>
  );
}
