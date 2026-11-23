import React from 'react';

const heights = { sm: 32, md: 40, lg: 48 };

/**
 * Carbon text input. The field sits on --cds-field-01 with a single 1px rule on
 * the bottom edge only — that bottom rule is the whole visual identity of a
 * Carbon field. Focus replaces it with a 2px focus ring drawn inside the box.
 */
export function TextInput({
  id,
  labelText,
  helperText,
  placeholder,
  value,
  defaultValue,
  type = 'text',
  size = 'md',
  disabled = false,
  readOnly = false,
  invalid = false,
  invalidText,
  warn = false,
  warnText,
  light = false,
  onChange,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const status = invalid ? 'invalid' : warn ? 'warn' : null;
  const describedBy = status ? `${inputId}-status` : helperText ? `${inputId}-helper` : undefined;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', ...style }}>
      {labelText && (
        <label
          htmlFor={inputId}
          style={{
            marginBlockEnd: 'var(--cds-spacing-03)',
            color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
            fontSize: 'var(--cds-label-01-font-size)',
            lineHeight: 'var(--cds-label-01-line-height)',
            letterSpacing: 'var(--cds-label-01-letter-spacing)',
          }}
        >
          {labelText}
        </label>
      )}

      <div style={{ position: 'relative', display: 'flex' }}>
        <input
          id={inputId}
          type={type}
          value={value}
          defaultValue={defaultValue}
          placeholder={placeholder}
          disabled={disabled}
          readOnly={readOnly}
          aria-invalid={invalid || undefined}
          aria-describedby={describedBy}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            inlineSize: '100%',
            blockSize: heights[size] || heights.md,
            padding: `0 var(--cds-spacing-05)`,
            paddingInlineEnd: status ? 'var(--cds-spacing-08)' : 'var(--cds-spacing-05)',
            background: disabled
              ? 'var(--cds-field-01)'
              : light
                ? 'var(--cds-field-02)'
                : 'var(--cds-field-01)',
            color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
            border: 'none',
            // Carbon fields carry a rule on the bottom edge only.
            borderBlockEnd: `1px solid ${
              disabled
                ? 'transparent'
                : invalid
                  ? 'var(--cds-support-error)'
                  : warn
                    ? 'var(--cds-support-warning)'
                    : 'var(--cds-border-strong-01)'
            }`,
            borderRadius: 'var(--cds-radius-none)',
            fontFamily: 'var(--cds-font-sans)',
            fontSize: 'var(--cds-body-compact-01-font-size)',
            lineHeight: 'var(--cds-body-compact-01-line-height)',
            letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
            outline: focused && !disabled ? '2px solid var(--cds-focus)' : 'none',
            outlineOffset: '-2px',
            cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
            transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)',
          }}
          {...rest}
        />
        {status && (
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              insetInlineEnd: 'var(--cds-spacing-05)',
              insetBlockStart: '50%',
              transform: 'translateY(-50%)',
              color: invalid ? 'var(--cds-support-error)' : 'var(--cds-support-warning)',
              lineHeight: 0,
            }}
          >
            <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">
              <path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-1.1 6h2.2v11h-2.2Zm1.1 17.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z" />
            </svg>
          </span>
        )}
      </div>

      {(status || helperText) && (
        <div
          id={describedBy}
          style={{
            marginBlockStart: 'var(--cds-spacing-02)',
            color: invalid
              ? 'var(--cds-text-error)'
              : disabled
                ? 'var(--cds-text-disabled)'
                : 'var(--cds-text-helper)',
            fontSize: 'var(--cds-helper-text-01-font-size)',
            lineHeight: 'var(--cds-helper-text-01-line-height)',
            letterSpacing: 'var(--cds-helper-text-01-letter-spacing)',
          }}
        >
          {invalid ? invalidText : warn ? warnText : helperText}
        </div>
      )}
    </div>
  );
}
