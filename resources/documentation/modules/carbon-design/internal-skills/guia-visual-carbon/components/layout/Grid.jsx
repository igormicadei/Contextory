import React from 'react';

/**
 * Carbon 2x Grid. 16 columns at lg and above, 8 at md, 4 at sm — the column
 * count is the grid, and everything on the page snaps to it.
 *
 * <Grid>
 *   <Column sm={4} md={4} lg={8}>…</Column>
 *   <Column sm={4} md={4} lg={8}>…</Column>
 * </Grid>
 */
export function Grid({ condensed = false, narrow = false, fullWidth = false, children, style, ...rest }) {
  const gutter = condensed ? 'var(--cds-grid-gutter-condensed)' : narrow ? 'var(--cds-spacing-05)' : 'var(--cds-grid-gutter)';

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(var(--cds-grid-cols, 16), minmax(0, 1fr))',
        columnGap: gutter,
        rowGap: gutter,
        inlineSize: '100%',
        maxInlineSize: fullWidth ? 'none' : 'var(--cds-container-max)',
        marginInline: 'auto',
        paddingInline: condensed ? 0 : 'var(--cds-grid-margin)',
        ...style,
      }}
      {...rest}
    >
      <style>{
        '@media (max-width:65.98rem){[data-cds-grid]{--cds-grid-cols:8}}' +
        '@media (max-width:41.98rem){[data-cds-grid]{--cds-grid-cols:4}}'
      }</style>
      {children}
    </div>
  );
}

/**
 * A grid column. Pass a span per breakpoint; the value is a column count in
 * that tier's grid (4 / 8 / 16), matching Carbon's own API.
 */
export function Column({ sm = 4, md = 8, lg = 16, xlg, max, children, style, ...rest }) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');

  return (
    <div
      data-cds-col={id}
      style={{ gridColumn: `span ${lg} / span ${lg}`, minInlineSize: 0, ...style }}
      {...rest}
    >
      <style>{
        `@media (max-width:41.98rem){[data-cds-col="${id}"]{grid-column:span ${sm}/span ${sm}}}` +
        `@media (min-width:42rem) and (max-width:65.98rem){[data-cds-col="${id}"]{grid-column:span ${md}/span ${md}}}` +
        `@media (min-width:66rem){[data-cds-col="${id}"]{grid-column:span ${lg}/span ${lg}}}` +
        (xlg ? `@media (min-width:82rem){[data-cds-col="${id}"]{grid-column:span ${xlg}/span ${xlg}}}` : '') +
        (max ? `@media (min-width:99rem){[data-cds-col="${id}"]{grid-column:span ${max}/span ${max}}}` : '')
      }</style>
      {children}
    </div>
  );
}
