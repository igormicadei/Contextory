import React from 'react';

const heights = { sm: 32, md: 40, lg: 48 };

/**
 * Carbon select — a native <select> wearing Carbon field chrome, with the
 * chevron drawn as an overlaid caret so it matches Carbon's icon geometry.
 */
export function Select({
  id, labelText, helperText, items = [], value, defaultValue,
  size = 'md', disabled = false, invalid = false, invalidText,
  onChange, style, children, ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {labelText && (
        <label htmlFor={inputId} style={{
          marginBlockEnd: 'var(--cds-spacing-03)',
          color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
          fontSize: 'var(--cds-label-01-font-size)',
          lineHeight: 'var(--cds-label-01-line-height)',
          letterSpacing: 'var(--cds-label-01-letter-spacing)',
        }}>{labelText}</label>
      )}

      <div style={{ position: 'relative', display: 'flex' }}>
        <select
          id={inputId}
          value={value}
          defaultValue={defaultValue}
          disabled={disabled}
          aria-invalid={invalid || undefined}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            inlineSize: '100%',
            blockSize: heights[size] || heights.md,
            padding: '0 var(--cds-spacing-08) 0 var(--cds-spacing-05)',
            background: 'var(--cds-field-01)',
            color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
            border: 'none',
            borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
            borderRadius: 'var(--cds-radius-none)',
            fontFamily: 'var(--cds-font-sans)',
            fontSize: 'var(--cds-body-compact-01-font-size)',
            letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
            appearance: 'none',
            outline: focused && !disabled ? '2px solid var(--cds-focus)' : 'none',
            outlineOffset: '-2px',
            cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          {...rest}
        >
          {children ||
            items.map(it => {
              const v = typeof it === 'string' ? it : it.value;
              const l = typeof it === 'string' ? it : it.label;
              return <option key={v} value={v}>{l}</option>;
            })}
        </select>

        <span aria-hidden="true" style={{
          position: 'absolute', insetInlineEnd: 'var(--cds-spacing-05)', insetBlockStart: '50%',
          transform: 'translateY(-50%)', pointerEvents: 'none', lineHeight: 0,
          color: disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)',
        }}>
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z" /></svg>
        </span>
      </div>

      {(helperText || (invalid && invalidText)) && (
        <div style={{
          marginBlockStart: 'var(--cds-spacing-02)',
          color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
          fontSize: 'var(--cds-helper-text-01-font-size)',
        }}>{invalid ? invalidText : helperText}</div>
      )}
    </div>
  );
}
