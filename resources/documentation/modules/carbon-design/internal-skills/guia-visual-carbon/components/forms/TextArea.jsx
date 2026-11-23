import React from 'react';

/** Carbon textarea — same field chrome as TextInput, with a fixed row count. */
export function TextArea({
  id, labelText, helperText, placeholder, value, defaultValue,
  rows = 4, disabled = false, invalid = false, invalidText, maxCount,
  onChange, style, ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [count, setCount] = React.useState((value ?? defaultValue ?? '').length);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {(labelText || maxCount) && (
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBlockEnd: 'var(--cds-spacing-03)' }}>
          {labelText && (
            <label htmlFor={inputId} style={{
              color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
              fontSize: 'var(--cds-label-01-font-size)',
              lineHeight: 'var(--cds-label-01-line-height)',
              letterSpacing: 'var(--cds-label-01-letter-spacing)',
            }}>{labelText}</label>
          )}
          {maxCount && (
            <span style={{ color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-label-01-font-size)' }}>
              {count}/{maxCount}
            </span>
          )}
        </div>
      )}

      <textarea
        id={inputId}
        rows={rows}
        value={value}
        defaultValue={defaultValue}
        placeholder={placeholder}
        disabled={disabled}
        maxLength={maxCount}
        aria-invalid={invalid || undefined}
        onChange={e => { setCount(e.target.value.length); if (onChange) onChange(e); }}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          inlineSize: '100%',
          padding: 'var(--cds-spacing-04) var(--cds-spacing-05)',
          background: 'var(--cds-field-01)',
          color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
          border: 'none',
          borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
          borderRadius: 'var(--cds-radius-none)',
          fontFamily: 'var(--cds-font-sans)',
          fontSize: 'var(--cds-body-01-font-size)',
          lineHeight: 'var(--cds-body-01-line-height)',
          letterSpacing: 'var(--cds-body-01-letter-spacing)',
          resize: 'vertical',
          outline: focused && !disabled ? '2px solid var(--cds-focus)' : 'none',
          outlineOffset: '-2px',
          cursor: disabled ? 'not-allowed' : 'text',
        }}
        {...rest}
      />

      {(helperText || (invalid && invalidText)) && (
        <div style={{
          marginBlockStart: 'var(--cds-spacing-02)',
          color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
          fontSize: 'var(--cds-helper-text-01-font-size)',
          lineHeight: 'var(--cds-helper-text-01-line-height)',
        }}>
          {invalid ? invalidText : helperText}
        </div>
      )}
    </div>
  );
}
