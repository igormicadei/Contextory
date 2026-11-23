import React from 'react';

/**
 * Carbon tabs. The selected tab is marked by a 2px bottom border in the
 * interactive blue and a semibold label; unselected tabs keep a 1px subtle rule.
 */
export function Tabs({ tabs = [], selectedIndex, defaultSelectedIndex = 0, contained = false, onChange, style, children, ...rest }) {
  const [internal, setInternal] = React.useState(defaultSelectedIndex);
  const isControlled = selectedIndex !== undefined;
  const sel = isControlled ? selectedIndex : internal;

  const pick = i => {
    if (!isControlled) setInternal(i);
    if (onChange) onChange({ selectedIndex: i });
  };

  return (
    <div style={style} {...rest}>
      <div role="tablist" style={{ display: 'flex', overflowX: 'auto' }}>
        {tabs.map((t, i) => {
          const on = i === sel;
          const label = typeof t === 'string' ? t : t.label;
          const disabled = typeof t === 'object' && t.disabled;

          return (
            <button
              key={i}
              role="tab"
              aria-selected={on}
              disabled={disabled}
              onClick={() => !disabled && pick(i)}
              style={{
                minBlockSize: 48,
                padding: '0 var(--cds-spacing-05)',
                background: contained ? (on ? 'var(--cds-layer-01)' : 'var(--cds-layer-accent-01)') : 'transparent',
                color: disabled ? 'var(--cds-text-disabled)' : on ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                border: 'none',
                borderBlockEnd: contained ? 'none' : `${on ? 2 : 1}px solid ${on ? 'var(--cds-border-interactive)' : 'var(--cds-border-subtle-01)'}`,
                borderInlineEnd: contained ? '1px solid var(--cds-border-subtle-01)' : 'none',
                borderRadius: 'var(--cds-radius-none)',
                fontFamily: 'var(--cds-font-sans)',
                fontSize: 'var(--cds-body-compact-01-font-size)',
                fontWeight: on ? 'var(--cds-font-weight-semibold)' : 'var(--cds-font-weight-regular)',
                letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                whiteSpace: 'nowrap',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'color var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      {children && (
        <div role="tabpanel" style={{ padding: 'var(--cds-spacing-05) 0' }}>
          {Array.isArray(children) ? children[sel] : children}
        </div>
      )}
    </div>
  );
}
