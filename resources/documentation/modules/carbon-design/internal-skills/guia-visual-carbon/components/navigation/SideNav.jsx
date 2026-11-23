import React from 'react';

/**
 * Carbon UI Shell side navigation. 256px rail, 32px rows, selected row marked by
 * a 3px left border plus a layer-selected fill — never by a rounded pill.
 */
export function SideNav({ items = [], expanded = true, ariaLabel = 'Side navigation', style, ...rest }) {
  const [open, setOpen] = React.useState({});

  return (
    <nav
      aria-label={ariaLabel}
      style={{
        inlineSize: expanded ? 256 : 48,
        blockSize: '100%',
        background: 'var(--cds-background)',
        borderInlineEnd: '1px solid var(--cds-border-subtle-01)',
        fontFamily: 'var(--cds-font-sans)',
        overflowY: 'auto',
        transition: 'inline-size var(--cds-duration-moderate-01) var(--cds-easing-standard-productive)',
        ...style,
      }}
      {...rest}
    >
      <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((it, i) => {
          const hasKids = it.items && it.items.length > 0;
          const isOpen = open[i] ?? it.defaultExpanded ?? false;

          return (
            <li key={i}>
              <a
                href={hasKids ? undefined : it.href || '#'}
                role={hasKids ? 'button' : undefined}
                onClick={hasKids ? e => { e.preventDefault(); setOpen(o => ({ ...o, [i]: !isOpen })); } : undefined}
                style={{
                  display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-04)',
                  minBlockSize: 32, padding: '0 var(--cds-spacing-05)',
                  color: it.isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                  background: it.isActive ? 'var(--cds-layer-selected-01)' : 'transparent',
                  borderInlineStart: `3px solid ${it.isActive ? 'var(--cds-border-interactive)' : 'transparent'}`,
                  paddingInlineStart: 'calc(var(--cds-spacing-05) - 3px)',
                  textDecoration: 'none', cursor: 'pointer',
                  fontSize: 'var(--cds-heading-compact-01-font-size)',
                  fontWeight: it.isActive ? 'var(--cds-font-weight-semibold)' : 'var(--cds-font-weight-regular)',
                  letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)',
                }}
                onMouseEnter={e => { if (!it.isActive) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
                onMouseLeave={e => { if (!it.isActive) e.currentTarget.style.background = 'transparent'; }}
              >
                {it.icon && <span style={{ display: 'flex', color: 'var(--cds-icon-primary)' }}>{it.icon}</span>}
                {expanded && <span style={{ flex: 1 }}>{it.label}</span>}
                {expanded && hasKids && (
                  <span aria-hidden="true" style={{ lineHeight: 0, color: 'var(--cds-icon-primary)', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)' }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z" /></svg>
                  </span>
                )}
              </a>

              {expanded && hasKids && isOpen && (
                <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                  {it.items.map((k, j) => (
                    <li key={j}>
                      <a href={k.href || '#'}
                        style={{
                          display: 'flex', alignItems: 'center', minBlockSize: 32,
                          padding: '0 var(--cds-spacing-05) 0 var(--cds-spacing-07)',
                          color: k.isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
                          background: k.isActive ? 'var(--cds-layer-selected-01)' : 'transparent',
                          textDecoration: 'none',
                          fontSize: 'var(--cds-body-compact-01-font-size)',
                          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                        }}
                        onMouseEnter={e => { if (!k.isActive) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
                        onMouseLeave={e => { if (!k.isActive) e.currentTarget.style.background = 'transparent'; }}
                      >{k.label}</a>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
