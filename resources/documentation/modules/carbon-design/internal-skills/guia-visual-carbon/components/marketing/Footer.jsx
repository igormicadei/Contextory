import React from 'react';

/**
 * IBM.com-style footer. Inverts to the g100 dark theme regardless of the page
 * theme — on a light page this is the only dark surface, which is exactly how
 * ibm.com uses it.
 */
export function Footer({ columns = [], wordmark = 'IBM', legalLinks = [], copyright, style, ...rest }) {
  return (
    <footer
      className="cds--g100"
      style={{
        background: 'var(--cds-background)',
        color: 'var(--cds-text-primary)',
        fontFamily: 'var(--cds-font-sans)',
        ...style,
      }}
      {...rest}
    >
      <div style={{ maxInlineSize: 'var(--cds-container-max)', marginInline: 'auto', padding: 'var(--cds-spacing-09) var(--cds-spacing-05)' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))', gap: 'var(--cds-spacing-07)' }}>
          {wordmark && (
            <div style={{
              fontSize: 'var(--cds-heading-04-font-size)',
              fontWeight: 'var(--cds-font-weight-semibold)',
              letterSpacing: '-0.02em',
            }}>{wordmark}</div>
          )}

          {columns.map((col, i) => (
            <nav key={i} aria-label={col.title}>
              <h2 style={{
                margin: '0 0 var(--cds-spacing-05)',
                color: 'var(--cds-text-primary)',
                fontSize: 'var(--cds-heading-compact-01-font-size)',
                fontWeight: 'var(--cds-heading-compact-01-font-weight)',
                letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)',
              }}>{col.title}</h2>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--cds-spacing-04)' }}>
                {(col.links || []).map((l, j) => (
                  <li key={j}>
                    <a href={l.href || '#'} style={{
                      color: 'var(--cds-text-secondary)',
                      fontSize: 'var(--cds-body-01-font-size)',
                      letterSpacing: 'var(--cds-body-01-letter-spacing)',
                      textDecoration: 'none',
                    }}
                      onMouseEnter={e => { e.currentTarget.style.color = 'var(--cds-text-primary)'; e.currentTarget.style.textDecoration = 'underline'; }}
                      onMouseLeave={e => { e.currentTarget.style.color = 'var(--cds-text-secondary)'; e.currentTarget.style.textDecoration = 'none'; }}
                    >{l.label}</a>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {(legalLinks.length > 0 || copyright) && (
          <div style={{
            display: 'flex', flexWrap: 'wrap', gap: 'var(--cds-spacing-06)', alignItems: 'center',
            marginBlockStart: 'var(--cds-spacing-09)',
            paddingBlockStart: 'var(--cds-spacing-05)',
            borderBlockStart: '1px solid var(--cds-border-subtle-01)',
            color: 'var(--cds-text-secondary)',
            fontSize: 'var(--cds-label-01-font-size)',
            letterSpacing: 'var(--cds-label-01-letter-spacing)',
          }}>
            {legalLinks.map((l, i) => (
              <a key={i} href={l.href || '#'} style={{ color: 'inherit', textDecoration: 'none' }}
                onMouseEnter={e => { e.currentTarget.style.textDecoration = 'underline'; }}
                onMouseLeave={e => { e.currentTarget.style.textDecoration = 'none'; }}
              >{l.label}</a>
            ))}
            {copyright && <span style={{ marginInlineStart: 'auto' }}>{copyright}</span>}
          </div>
        )}
      </div>
    </footer>
  );
}
