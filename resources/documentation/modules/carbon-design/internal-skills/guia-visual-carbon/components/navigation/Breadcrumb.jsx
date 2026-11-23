import React from 'react';

/** Carbon breadcrumb — links separated by a thin slash, current page unlinked. */
export function Breadcrumb({ items = [], noTrailingSlash = true, style, ...rest }) {
  return (
    <nav aria-label="Breadcrumb" style={{ fontFamily: 'var(--cds-font-sans)', ...style }} {...rest}>
      <ol style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 'var(--cds-spacing-03)', margin: 0, padding: 0, listStyle: 'none' }}>
        {items.map((it, i) => {
          const last = i === items.length - 1;
          const label = typeof it === 'string' ? it : it.label;
          const href = typeof it === 'object' ? it.href : '#';
          const current = last && (typeof it === 'object' ? it.isCurrentPage !== false : true);

          return (
            <li key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-03)' }}>
              {current ? (
                <span aria-current="page" style={{
                  color: 'var(--cds-text-primary)',
                  fontSize: 'var(--cds-body-compact-01-font-size)',
                  letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                }}>{label}</span>
              ) : (
                <a href={href} style={{
                  color: 'var(--cds-link-primary)',
                  fontSize: 'var(--cds-body-compact-01-font-size)',
                  letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                  textDecoration: 'none',
                }}
                  onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; e.currentTarget.style.color = 'var(--cds-link-primary-hover)'; }}
                  onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; e.currentTarget.style.color = 'var(--cds-link-primary)'; }}
                >{label}</a>
              )}

              {(!last || !noTrailingSlash) && (
                <span aria-hidden="true" style={{ color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-body-compact-01-font-size)' }}>/</span>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
