import React from 'react';

/**
 * Carbon checkbox. A 16px square with a 1px border that fills solid on check —
 * square corners, no rounding, no animation beyond the fast colour swap.
 */
export function Checkbox({
  id,
  labelText,
  checked,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  invalid = false,
  invalidText,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const ref = React.useRef(null);
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;

  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);

  const handle = e => {
    if (!isControlled) setInternal(e.target.checked);
    if (onChange) onChange(e);
  };

  const filled = (on || indeterminate) && !disabled;

  return (
    <div style={style}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--cds-spacing-03)' }}>
        <span style={{ position: 'relative', display: 'inline-flex', flexShrink: 0, marginBlockStart: 1 }}>
          <input
            ref={ref}
            id={inputId}
            type="checkbox"
            checked={isControlled ? checked : undefined}
            defaultChecked={isControlled ? undefined : defaultChecked}
            disabled={disabled}
            aria-invalid={invalid || undefined}
            onChange={handle}
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
              background: filled ? 'var(--cds-icon-primary)' : 'transparent',
              border: `1px solid ${
                disabled
                  ? 'var(--cds-icon-disabled)'
                  : invalid
                    ? 'var(--cds-support-error)'
                    : filled
                      ? 'var(--cds-icon-primary)'
                      : 'var(--cds-icon-primary)'
              }`,
              borderRadius: 'var(--cds-radius-none)',
              outline: focused ? '2px solid var(--cds-focus)' : 'none',
              outlineOffset: 1,
              transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)',
            }}
          >
            {indeterminate ? (
              <svg width="10" height="2" viewBox="0 0 10 2" fill="var(--cds-icon-inverse)"><rect width="10" height="2" /></svg>
            ) : on ? (
              <svg width="11" height="9" viewBox="0 0 11 9" fill="none" stroke="var(--cds-icon-inverse)" strokeWidth="1.6">
                <path d="M1 4.5 4 7.5 10 1.5" />
              </svg>
            ) : null}
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

      {invalid && invalidText && (
        <div style={{ marginBlockStart: 'var(--cds-spacing-02)', marginInlineStart: 'var(--cds-spacing-06)', color: 'var(--cds-text-error)', fontSize: 'var(--cds-helper-text-01-font-size)' }}>
          {invalidText}
        </div>
      )}
    </div>
  );
}
