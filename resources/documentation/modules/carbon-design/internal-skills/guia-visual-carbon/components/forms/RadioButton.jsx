import React from 'react';

/**
 * Carbon radio button. The one place Carbon draws a circle in a form — a 16px
 * ring with a solid 8px centre dot when selected.
 */
export function RadioButton({
  id,
  name,
  value,
  labelText,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);

  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--cds-spacing-03)', ...style }}>
      <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, marginBlockStart: 1 }}>
        <input
          id={inputId}
          type="radio"
          name={name}
          value={value}
          checked={checked}
          defaultChecked={defaultChecked}
          disabled={disabled}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{ position: 'absolute', inlineSize: 16, blockSize: 16, margin: 0, opacity: 0, cursor: disabled ? 'not-allowed' : 'pointer' }}
          {...rest}
        />
        <span
          aria-hidden="true"
          style={{
            inlineSize: 16,
            blockSize: 16,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: `1px solid ${disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)'}`,
            borderRadius: '50%',
            outline: focused ? '2px solid var(--cds-focus)' : 'none',
            outlineOffset: 1.5,
          }}
        >
          {checked && (
            <span
              style={{
                inlineSize: 8,
                blockSize: 8,
                borderRadius: '50%',
                background: disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)',
              }}
            />
          )}
        </span>
      </span>

      <label
        htmlFor={inputId}
        style={{
          color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          lineHeight: 'var(--cds-body-compact-01-line-height)',
          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
          cursor: disabled ? 'not-allowed' : 'pointer',
        }}
      >
        {labelText}
      </label>
    </div>
  );
}
