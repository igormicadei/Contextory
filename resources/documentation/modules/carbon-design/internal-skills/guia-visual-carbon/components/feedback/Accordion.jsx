import React from 'react';

/**
 * Carbon accordion. The chevron sits on the LEFT of the heading (Carbon's
 * default) and rows are divided by 1px rules with no container border.
 */
export function Accordion({ items = [], align = 'end', size = 'md', style, ...rest }) {
  const [open, setOpen] = React.useState(() => items.map(i => !!i.open));
  const heights = { sm: 32, md: 40, lg: 48 };
  const h = heights[size] || heights.md;

  return (
    <ul style={{ margin: 0, padding: 0, listStyle: 'none', fontFamily: 'var(--cds-font-sans)', ...style }} {...rest}>
      {items.map((it, i) => {
        const on = open[i];
        return (
          <li key={i} style={{ borderBlockEnd: '1px solid var(--cds-border-subtle-01)', borderBlockStart: i === 0 ? '1px solid var(--cds-border-subtle-01)' : 'none' }}>
            <button
              type="button"
              aria-expanded={on}
              disabled={it.disabled}
              onClick={() => setOpen(o => o.map((v, j) => (j === i ? !v : v)))}
              style={{
                inlineSize: '100%', minBlockSize: h,
                display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-05)',
                flexDirection: align === 'start' ? 'row' : 'row-reverse',
                justifyContent: align === 'start' ? 'flex-start' : 'space-between',
                padding: '0 var(--cds-spacing-05)',
                background: 'transparent',
                color: it.disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
                border: 'none', borderRadius: 'var(--cds-radius-none)',
                fontFamily: 'var(--cds-font-sans)',
                fontSize: 'var(--cds-body-compact-01-font-size)',
                letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                textAlign: 'start',
                cursor: it.disabled ? 'not-allowed' : 'pointer',
              }}
              onMouseEnter={e => { if (!it.disabled) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
              onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
            >
              <span aria-hidden="true" style={{
                display: 'flex', flexShrink: 0, color: 'var(--cds-icon-primary)',
                transform: on ? 'rotate(180deg)' : 'none',
                transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)',
              }}>
                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z" /></svg>
              </span>
              <span style={{ flex: 1 }}>{it.title}</span>
            </button>

            {on && (
              <div style={{
                padding: `0 var(--cds-spacing-05) var(--cds-spacing-06)`,
                paddingInlineStart: align === 'start' ? 'var(--cds-spacing-09)' : 'var(--cds-spacing-05)',
                paddingInlineEnd: '25%',
                color: 'var(--cds-text-primary)',
                fontSize: 'var(--cds-body-01-font-size)',
                lineHeight: 'var(--cds-body-01-line-height)',
                letterSpacing: 'var(--cds-body-01-letter-spacing)',
              }}>
                {it.content}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
