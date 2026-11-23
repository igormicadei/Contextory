import React from 'react';

const rowHeights = { xs: 24, sm: 32, md: 40, lg: 48, xl: 64 };

/**
 * Carbon data table. Header row sits on layer-accent, body rows on layer with a
 * 1px rule between them. Sorting is indicated by a caret in the header cell;
 * selection uses a checkbox column, never a row-colour change alone.
 */
export function DataTable({
  headers = [],
  rows = [],
  size = 'lg',
  title,
  description,
  isSortable = false,
  selectable = false,
  selectedRows = [],
  onSelect,
  onSort,
  style,
  ...rest
}) {
  const [sort, setSort] = React.useState({ key: null, dir: 'none' });
  const h = rowHeights[size] || rowHeights.lg;
  const key = hd => (typeof hd === 'string' ? hd : hd.key);
  const head = hd => (typeof hd === 'string' ? hd : hd.header);

  const clickSort = hd => {
    if (!isSortable) return;
    const k = key(hd);
    const dir = sort.key !== k ? 'asc' : sort.dir === 'asc' ? 'desc' : 'none';
    setSort({ key: k, dir });
    if (onSort) onSort({ key: k, direction: dir });
  };

  const cellPad = { padding: `0 var(--cds-spacing-05)` };

  return (
    <div style={{ fontFamily: 'var(--cds-font-sans)', ...style }} {...rest}>
      {(title || description) && (
        <div style={{ padding: 'var(--cds-spacing-05)', background: 'var(--cds-layer-01)' }}>
          {title && <div style={{ color: 'var(--cds-text-primary)', fontSize: 'var(--cds-heading-03-font-size)', fontWeight: 'var(--cds-heading-03-font-weight)' }}>{title}</div>}
          {description && <div style={{ marginBlockStart: 'var(--cds-spacing-02)', color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-body-01-font-size)' }}>{description}</div>}
        </div>
      )}

      <table style={{ inlineSize: '100%', borderCollapse: 'collapse', background: 'var(--cds-layer-01)' }}>
        <thead>
          <tr style={{ blockSize: h, background: 'var(--cds-layer-accent-01)' }}>
            {selectable && (
              <th style={{ ...cellPad, inlineSize: 48, textAlign: 'start' }}>
                <span className="cds--visually-hidden">Select</span>
              </th>
            )}
            {headers.map((hd, i) => {
              const active = sort.key === key(hd) && sort.dir !== 'none';
              return (
                <th
                  key={i}
                  scope="col"
                  aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}
                  onClick={() => clickSort(hd)}
                  style={{
                    ...cellPad, blockSize: h, textAlign: 'start',
                    color: 'var(--cds-text-primary)',
                    fontSize: 'var(--cds-heading-compact-01-font-size)',
                    fontWeight: 'var(--cds-heading-compact-01-font-weight)',
                    letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)',
                    cursor: isSortable ? 'pointer' : 'default',
                    whiteSpace: 'nowrap',
                  }}
                >
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--cds-spacing-03)' }}>
                    {head(hd)}
                    {isSortable && (
                      <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"
                        style={{ opacity: active ? 1 : 0.35, transform: active && sort.dir === 'desc' ? 'rotate(180deg)' : 'none' }}>
                        <path d="M16 10l6 6H10z" />
                      </svg>
                    )}
                  </span>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {rows.map((r, ri) => {
            const id = r.id ?? ri;
            const on = selectedRows.includes(id);
            return (
              <tr
                key={id}
                style={{
                  blockSize: h,
                  background: on ? 'var(--cds-layer-selected-01)' : 'transparent',
                  borderBlockStart: '1px solid var(--cds-border-subtle-01)',
                }}
                onMouseEnter={e => { if (!on) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
                onMouseLeave={e => { if (!on) e.currentTarget.style.background = 'transparent'; }}
              >
                {selectable && (
                  <td style={{ ...cellPad }}>
                    <input
                      type="checkbox"
                      checked={on}
                      aria-label={`Select row ${ri + 1}`}
                      onChange={() => onSelect && onSelect(id)}
                      style={{ inlineSize: 16, blockSize: 16, accentColor: 'var(--cds-interactive)', cursor: 'pointer' }}
                    />
                  </td>
                )}
                {headers.map((hd, ci) => (
                  <td key={ci} style={{
                    ...cellPad, blockSize: h,
                    color: 'var(--cds-text-primary)',
                    fontSize: 'var(--cds-body-compact-01-font-size)',
                    letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
                  }}>
                    {r[key(hd)]}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
