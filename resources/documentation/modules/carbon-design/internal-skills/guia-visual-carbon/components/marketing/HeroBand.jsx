import React from 'react';

/**
 * IBM.com-style hero. Uses the FLUID display type (weight 300), which is the
 * brand's typographic signature — a 76px headline at weight 300 reads as quietly
 * authoritative where weight 700 would read as generic enterprise.
 *
 * Set `theme` to 'g100' for the inverted dark hero.
 */
export function HeroBand({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  media,
  theme = 'white',
  style,
  ...rest
}) {
  return (
    <section
      className={`cds--${theme}`}
      style={{
        background: 'var(--cds-background)',
        color: 'var(--cds-text-primary)',
        fontFamily: 'var(--cds-font-sans)',
        ...style,
      }}
      {...rest}
    >
      <div style={{
        maxInlineSize: 'var(--cds-container-max)',
        marginInline: 'auto',
        padding: 'var(--cds-spacing-10) var(--cds-spacing-05) var(--cds-spacing-12)',
        display: 'grid',
        gridTemplateColumns: media ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)',
        gap: 'var(--cds-spacing-09)',
        alignItems: 'center',
      }}>
        <div style={{ maxInlineSize: '46rem' }}>
          {eyebrow && (
            // Carbon eyebrows are sentence case at 14px — never all-caps tracked.
            <div style={{
              marginBlockEnd: 'var(--cds-spacing-05)',
              color: 'var(--cds-text-secondary)',
              fontSize: 'var(--cds-body-compact-01-font-size)',
              letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
            }}>{eyebrow}</div>
          )}

          <h1 className="cds--type-fluid-heading-05" style={{ margin: 0, color: 'var(--cds-text-primary)' }}>
            {title}
          </h1>

          {subtitle && (
            <p className="cds--type-fluid-paragraph-01" style={{
              margin: 'var(--cds-spacing-06) 0 0',
              maxInlineSize: '40rem',
              color: 'var(--cds-text-secondary)',
            }}>{subtitle}</p>
          )}

          {(primaryAction || secondaryAction) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--cds-spacing-05)', marginBlockStart: 'var(--cds-spacing-08)' }}>
              {primaryAction}
              {secondaryAction}
            </div>
          )}
        </div>

        {media && <div>{media}</div>}
      </div>
    </section>
  );
}
