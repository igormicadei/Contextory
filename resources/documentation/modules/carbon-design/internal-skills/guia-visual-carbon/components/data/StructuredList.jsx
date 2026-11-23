import React from 'react';

/**
 * Carbon structured list. Lighter than a data table — no header fill, just a
 * semibold header row over 1px-ruled rows. Use it for read-only detail lists.
 */
export function StructuredList({ headers = [], rows = [], selection = false, selectedIndex, onSelect, style, ...rest }) {
  const [internal, setInternal] = React.useState(selectedIndex ?? null);
  const sel = selectedIndex !== undefined ? selectedIndex : internal;

  const pick = i => {
    if (!selection) return;
    if (selectedIndex === undefined) setInternal(i);
    if (onSelect) onSelect(i);
  };

  const cell = { padding: 'var(--cds-spacing-04) var(--cds-spacing-05)', textAlign: 'start', verticalAlign: 'top' };

  return (
    <table style={{ inlineSize: '100%', borderCollapse: 'collapse', fontFamily: 'var(--cds-font-sans)', ...style }} {...rest}>
      <thead>
        <tr style={{ borderBlockEnd: '1px solid var(--cds-border-subtle-01)' }}>
          {selection && <th style={{ ...cell, inlineSize: 48 }}><span className="cds--visually-hidden">Select</span></th>}
          {headers.map((h, i) => (
            <th key={i} style={{
              ...cell,
              color: 'var(--cds-text-primary)',
              fontSize: 'var(--cds-heading-compact-01-font-size)',
              fontWeight: 'var(--cds-heading-compact-01-font-weight)',
              letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)',
            }}>{h}</th>
          ))}
        </tr>
      </thead>

      <tbody>
        {rows.map((r, i) => {
          const on = sel === i;
          return (
            <tr
              key={i}
              onClick={() => pick(i)}
              style={{
                borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
                background: on ? 'var(--cds-layer-selected-01)' : 'transparent',
                cursor: selection ? 'pointer' : 'default',
              }}
              onMouseEnter={e => { if (selection && !on) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
              onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
            >
              {selection && (
                <td style={{ ...cell }}>
                  <span aria-hidden="true" style={{ display: 'flex', color: on ? 'var(--cds-icon-primary)' : 'transparent' }}>
                    <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M13 24 4 15l1.4-1.4 7.6 7.6L26.6 7.9 28 9.3z" /></svg>
                  </span>
                </td>
              )}
              {(Array.isArray(r) ? r : headers.map(h => r[h])).map((c, j) => (
                <td key={j} style={{
                  ...cell,
                  color: 'var(--cds-text-primary)',
                  fontSize: 'var(--cds-body-01-font-size)',
                  lineHeight: 'var(--cds-body-01-line-height)',
                  letterSpacing: 'var(--cds-body-01-letter-spacing)',
                }}>{c}</td>
              ))}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
