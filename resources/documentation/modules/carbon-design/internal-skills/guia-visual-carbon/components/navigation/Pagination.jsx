import React from 'react';

/**
 * Carbon pagination bar. A 40px rule-bounded strip: page-size select on the
 * left, item range and prev/next steppers on the right, divided by 1px rules.
 */
export function Pagination({
  page = 1, pageSize = 10, totalItems = 0,
  pageSizes = [10, 20, 30, 40, 50],
  onChange, style, ...rest
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);

  const go = (p, s) => onChange && onChange({ page: p, pageSize: s ?? pageSize });

  const stepper = (dir, disabled, label, path) => (
    <button type="button" aria-label={label} disabled={disabled}
      onClick={() => go(page + dir)}
      style={{
        inlineSize: 48, blockSize: 40, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', border: 'none',
        borderInlineStart: '1px solid var(--cds-border-subtle-01)',
        color: disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)',
        cursor: disabled ? 'not-allowed' : 'pointer',
      }}
      onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
    >
      <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor">{path}</svg>
    </button>
  );

  const cell = { display: 'flex', alignItems: 'center', color: 'var(--cds-text-primary)', fontSize: 'var(--cds-body-compact-01-font-size)', letterSpacing: 'var(--cds-body-compact-01-letter-spacing)' };

  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      blockSize: 40, background: 'var(--cds-layer-01)',
      borderBlockStart: '1px solid var(--cds-border-subtle-01)',
      fontFamily: 'var(--cds-font-sans)', ...style,
    }} {...rest}>
      <div style={{ ...cell, gap: 'var(--cds-spacing-05)', paddingInlineStart: 'var(--cds-spacing-05)' }}>
        <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--cds-spacing-04)' }}>
          Items per page:
          <select
            value={pageSize}
            onChange={e => go(1, Number(e.target.value))}
            style={{
              blockSize: 40, padding: '0 var(--cds-spacing-06) 0 var(--cds-spacing-03)',
              background: 'transparent', color: 'var(--cds-text-primary)',
              border: 'none', appearance: 'none', cursor: 'pointer',
              fontFamily: 'var(--cds-font-sans)', fontSize: 'var(--cds-body-compact-01-font-size)',
            }}
          >
            {pageSizes.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </label>
        <span style={{ borderInlineStart: '1px solid var(--cds-border-subtle-01)', blockSize: 40 }} />
        <span>{first}–{last} of {totalItems} items</span>
      </div>

      <div style={{ ...cell }}>
        <span style={{ paddingInline: 'var(--cds-spacing-05)' }}>{page} of {totalPages} pages</span>
        {stepper(-1, page <= 1, 'Previous page', <path d="m20 24-10-8 10-8z" />)}
        {stepper(1, page >= totalPages, 'Next page', <path d="m12 8 10 8-10 8z" />)}
      </div>
    </div>
  );
}
