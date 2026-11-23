import React from 'react';

/**
 * Carbon UI Shell header. Always 48px tall, always gray-100 regardless of the
 * page theme — the shell reads as chrome sitting above the product, so it does
 * not follow the light/dark token swap the rest of the page does.
 */
export function UIShellHeader({
  prefix = 'IBM',
  name = 'Product',
  navItems = [],
  actions = [],
  onMenuClick,
  style,
  ...rest
}) {
  return (
    <header
      className="cds--g100"
      style={{
        position: 'relative', zIndex: 8000,
        display: 'flex', alignItems: 'center',
        blockSize: 48,
        background: 'var(--cds-background)',
        borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
        color: 'var(--cds-text-primary)',
        fontFamily: 'var(--cds-font-sans)',
        ...style,
      }}
      {...rest}
    >
      {onMenuClick && (
        <button type="button" aria-label="Open menu" onClick={onMenuClick}
          style={{ inlineSize: 48, blockSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--cds-icon-primary)', cursor: 'pointer' }}>
          <svg width="20" height="20" viewBox="0 0 32 32" fill="currentColor"><path d="M4 6h24v2H4zm0 9h24v2H4zm0 9h24v2H4z" /></svg>
        </button>
      )}

      <a href="#" style={{
        display: 'flex', alignItems: 'center', blockSize: '100%',
        padding: '0 var(--cds-spacing-05)', textDecoration: 'none',
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      }}>
        <span style={{ fontWeight: 'var(--cds-font-weight-semibold)' }}>{prefix}</span>
        <span style={{ marginInlineStart: '0.25rem' }}>{name}</span>
      </a>

      <nav style={{ display: 'flex', blockSize: '100%' }}>
        {navItems.map((it, i) => (
          <a key={i} href={it.href || '#'}
            style={{
              display: 'flex', alignItems: 'center', blockSize: '100%',
              padding: '0 var(--cds-spacing-05)',
              color: it.isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
              textDecoration: 'none',
              fontSize: 'var(--cds-body-compact-01-font-size)',
              letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
              borderBlockEnd: it.isActive ? '3px solid var(--cds-border-interactive)' : '3px solid transparent',
              boxSizing: 'border-box',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cds-background-hover)'; e.currentTarget.style.color = 'var(--cds-text-primary)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; if (!it.isActive) e.currentTarget.style.color = 'var(--cds-text-secondary)'; }}
          >
            {it.label}
          </a>
        ))}
      </nav>

      <div style={{ marginInlineStart: 'auto', display: 'flex', blockSize: '100%' }}>
        {actions.map((a, i) => (
          <button key={i} type="button" aria-label={a.label} onClick={a.onClick}
            style={{ inlineSize: 48, blockSize: 48, display: 'flex', alignItems: 'center', justifyContent: 'center', background: a.isActive ? 'var(--cds-background-selected)' : 'transparent', border: 'none', color: 'var(--cds-icon-primary)', cursor: 'pointer' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--cds-background-hover)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = a.isActive ? 'var(--cds-background-selected)' : 'transparent'; }}
          >
            {a.icon}
          </button>
        ))}
      </div>
    </header>
  );
}
