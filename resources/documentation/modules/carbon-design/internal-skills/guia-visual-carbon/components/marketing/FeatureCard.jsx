import React from 'react';

/**
 * Marketing feature card. Hierarchy is carried by a 1px hairline and a surface
 * change — never a drop shadow. Hovering lifts the surface, not the elevation.
 */
export function FeatureCard({
  eyebrow,
  title,
  body,
  icon,
  href,
  linkLabel = 'Learn more',
  elevated = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!href;
  const Tag = interactive ? 'a' : 'div';

  return (
    <Tag
      href={href}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: 'flex',
        flexDirection: 'column',
        minBlockSize: '100%',
        padding: 'var(--cds-spacing-06)',
        background: hover && interactive
          ? 'var(--cds-layer-hover-01)'
          : elevated ? 'var(--cds-layer-01)' : 'var(--cds-background)',
        color: 'var(--cds-text-primary)',
        border: '1px solid var(--cds-border-subtle-01)',
        borderRadius: 'var(--cds-radius-none)',
        textDecoration: 'none',
        fontFamily: 'var(--cds-font-sans)',
        transition: 'background var(--cds-duration-fast-02) var(--cds-easing-standard-productive)',
        ...style,
      }}
      {...rest}
    >
      {icon && <div style={{ marginBlockEnd: 'var(--cds-spacing-05)', color: 'var(--cds-icon-primary)' }}>{icon}</div>}

      {eyebrow && (
        <div style={{
          marginBlockEnd: 'var(--cds-spacing-03)',
          color: 'var(--cds-text-secondary)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        }}>{eyebrow}</div>
      )}

      <h3 className="cds--type-fluid-heading-03" style={{ margin: 0, color: 'var(--cds-text-primary)' }}>{title}</h3>

      {body && (
        <p style={{
          margin: 'var(--cds-spacing-05) 0 0',
          color: 'var(--cds-text-secondary)',
          fontSize: 'var(--cds-body-01-font-size)',
          lineHeight: 'var(--cds-body-01-line-height)',
          letterSpacing: 'var(--cds-body-01-letter-spacing)',
        }}>{body}</p>
      )}

      {interactive && (
        <span style={{
          display: 'inline-flex', alignItems: 'center', gap: 'var(--cds-spacing-03)',
          marginBlockStart: 'auto', paddingBlockStart: 'var(--cds-spacing-08)',
          color: 'var(--cds-link-primary)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        }}>
          {linkLabel}
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor" aria-hidden="true"
            style={{ transform: hover ? 'translateX(4px)' : 'none', transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)' }}>
            <path d="m18 6-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z" />
          </svg>
        </span>
      )}
    </Tag>
  );
}
