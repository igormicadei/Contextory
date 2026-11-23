import React from 'react';

/**
 * Carbon link. Blue by default with underline appearing on hover; the inline
 * variant is underlined at rest because it sits inside a run of body text and
 * needs to be findable without hovering.
 */
export function Link({
  href = '#', inline = false, size = 'md', disabled = false,
  visited = false, renderIcon = null, children, style, ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const sizes = { sm: 'var(--cds-body-compact-01-font-size)', md: 'var(--cds-body-01-font-size)', lg: 'var(--cds-body-02-font-size)' };

  return (
    <a
      href={disabled ? undefined : href}
      aria-disabled={disabled || undefined}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: renderIcon ? 'inline-flex' : 'inline',
        alignItems: 'center',
        gap: 'var(--cds-spacing-03)',
        color: disabled
          ? 'var(--cds-text-disabled)'
          : visited
            ? 'var(--cds-link-visited)'
            : hover
              ? 'var(--cds-link-primary-hover)'
              : 'var(--cds-link-primary)',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: sizes[size] || sizes.md,
        letterSpacing: 'var(--cds-body-01-letter-spacing)',
        textDecoration: disabled ? 'none' : inline || hover ? 'underline' : 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        outlineOffset: 2,
        ...style,
      }}
      {...rest}
    >
      {children}
      {renderIcon && <span aria-hidden="true" style={{ display: 'flex', flexShrink: 0 }}>{renderIcon}</span>}
    </a>
  );
}
