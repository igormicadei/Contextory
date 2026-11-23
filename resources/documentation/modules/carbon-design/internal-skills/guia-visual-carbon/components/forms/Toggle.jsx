import React from 'react';

const sizes = {
  md: { w: 48, h: 24, dot: 18, travel: 24 },
  sm: { w: 32, h: 16, dot: 10, travel: 16 },
};

/**
 * Carbon toggle. The pill track is the only fully-rounded shape in Carbon's UI
 * vocabulary — everything else stays square, so this stands out on purpose.
 */
export function Toggle({
  id,
  labelText,
  labelA = 'Off',
  labelB = 'On',
  hideLabel = false,
  toggled,
  defaultToggled = false,
  size = 'md',
  disabled = false,
  onToggle,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultToggled);
  const isControlled = toggled !== undefined;
  const on = isControlled ? toggled : internal;
  const s = sizes[size] || sizes.md;

  const flip = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    if (onToggle) onToggle(!on);
  };

  return (
    <div style={style}>
      {labelText && (
        <div
          style={{
            marginBlockEnd: 'var(--cds-spacing-04)',
            color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
            fontSize: 'var(--cds-label-01-font-size)',
            lineHeight: 'var(--cds-label-01-line-height)',
            letterSpacing: 'var(--cds-label-01-letter-spacing)',
          }}
        >
          {labelText}
        </div>
      )}

      <div style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--cds-spacing-03)' }}>
        <button
          id={inputId}
          type="button"
          role="switch"
          aria-checked={on}
          aria-label={labelText || (on ? labelB : labelA)}
          disabled={disabled}
          onClick={flip}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            position: 'relative',
            inlineSize: s.w,
            blockSize: s.h,
            padding: 0,
            border: 'none',
            borderRadius: 'var(--cds-radius-pill)',
            background: disabled
              ? 'var(--cds-button-disabled)'
              : on
                ? 'var(--cds-support-success)'
                : 'var(--cds-toggle-off)',
            cursor: disabled ? 'not-allowed' : 'pointer',
            outline: focused ? '2px solid var(--cds-focus)' : 'none',
            outlineOffset: 2,
            transition: 'background var(--cds-duration-fast-02) var(--cds-easing-entrance-productive)',
          }}
          {...rest}
        >
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              insetBlockStart: (s.h - s.dot) / 2,
              insetInlineStart: (s.h - s.dot) / 2,
              inlineSize: s.dot,
              blockSize: s.dot,
              borderRadius: '50%',
              background: disabled ? 'var(--cds-icon-on-color-disabled)' : 'var(--cds-icon-on-color)',
              transform: on ? `translateX(${s.travel}px)` : 'translateX(0)',
              transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-entrance-productive)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {on && size === 'md' && (
              <svg width="8" height="7" viewBox="0 0 8 7" fill="none" stroke="var(--cds-support-success)" strokeWidth="1.4">
                <path d="M.8 3.4 3 5.6 7.2 1" />
              </svg>
            )}
          </span>
        </button>

        {!hideLabel && (
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
            {on ? labelB : labelA}
          </label>
        )}
      </div>
    </div>
  );
}
