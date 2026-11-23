import React from 'react';

/* Carbon button heights. lg (48px) is the product default; xl/2xl are the
   expressive sizes used on marketing pages, where the label sits top-aligned. */
const heights = { sm: 32, md: 40, lg: 48, xl: 64, '2xl': 80 };

const variants = {
  primary: {
    background: 'var(--cds-button-primary)',
    color: 'var(--cds-text-on-color)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-primary-hover)',
    active: 'var(--cds-button-primary-active)',
  },
  secondary: {
    background: 'var(--cds-button-secondary)',
    color: 'var(--cds-text-on-color)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-secondary-hover)',
    active: 'var(--cds-button-secondary-active)',
  },
  tertiary: {
    background: 'transparent',
    color: 'var(--cds-button-tertiary)',
    borderColor: 'var(--cds-button-tertiary)',
    hover: 'var(--cds-button-tertiary-hover)',
    active: 'var(--cds-button-tertiary-active)',
    hoverColor: 'var(--cds-text-inverse)',
  },
  ghost: {
    background: 'transparent',
    color: 'var(--cds-link-primary)',
    borderColor: 'transparent',
    hover: 'var(--cds-background-hover)',
    active: 'var(--cds-background-active)',
  },
  danger: {
    background: 'var(--cds-button-danger-primary)',
    color: 'var(--cds-text-on-color)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-danger-hover)',
    active: 'var(--cds-button-danger-active)',
  },
  'danger--tertiary': {
    background: 'transparent',
    color: 'var(--cds-button-danger-secondary)',
    borderColor: 'var(--cds-button-danger-secondary)',
    hover: 'var(--cds-button-danger-hover)',
    active: 'var(--cds-button-danger-active)',
    hoverColor: 'var(--cds-text-on-color)',
  },
  'danger--ghost': {
    background: 'transparent',
    color: 'var(--cds-button-danger-secondary)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-danger-hover)',
    active: 'var(--cds-button-danger-active)',
    hoverColor: 'var(--cds-text-on-color)',
  },
};

/**
 * Carbon Button. Square corners, 1px border box, label left-aligned with a
 * trailing icon slot — the icon sits at the far right of the button, not
 * beside the text, which is what gives Carbon buttons their distinctive shape.
 */
export function Button({
  variant = 'primary',
  size = 'lg',
  disabled = false,
  isSelected = false,
  hasIconOnly = false,
  renderIcon = null,
  href,
  children,
  onClick,
  style,
  ...rest
}) {
  const [state, setState] = React.useState('rest');
  const v = variants[variant] || variants.primary;
  const h = heights[size] || heights.lg;
  const expressive = size === 'xl' || size === '2xl';

  const bg = disabled
    ? 'var(--cds-button-disabled)'
    : state === 'active'
      ? v.active
      : state === 'hover'
        ? v.hover
        : v.background;

  const fg = disabled
    ? 'var(--cds-text-on-color-disabled)'
    : state !== 'rest' && v.hoverColor
      ? v.hoverColor
      : v.color;

  const css = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: expressive ? 'flex-start' : 'center',
    justifyContent: hasIconOnly ? 'center' : 'space-between',
    gap: 'var(--cds-spacing-06)',
    inlineSize: hasIconOnly ? h : 'auto',
    minBlockSize: h,
    maxInlineSize: hasIconOnly ? h : '20rem',
    padding: hasIconOnly
      ? 0
      : expressive
        ? 'var(--cds-spacing-05) var(--cds-spacing-10) var(--cds-spacing-05) var(--cds-spacing-05)'
        : `calc(${(h - 20) / 2}px - 1px) var(--cds-spacing-10) calc(${(h - 20) / 2}px - 1px) var(--cds-spacing-05)`,
    background: bg,
    color: fg,
    border: `1px solid ${disabled ? 'transparent' : v.borderColor}`,
    borderRadius: 'var(--cds-radius-none)',
    fontFamily: 'var(--cds-font-sans)',
    fontSize: expressive ? 'var(--cds-body-compact-02-font-size)' : 'var(--cds-body-compact-01-font-size)',
    fontWeight: 'var(--cds-font-weight-regular)',
    lineHeight: 'var(--cds-body-compact-01-line-height)',
    letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
    textAlign: 'start',
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive), color var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)',
    outline: isSelected ? '2px solid var(--cds-focus)' : 'none',
    outlineOffset: isSelected ? '-2px' : 0,
    ...style,
  };

  const handlers = disabled
    ? {}
    : {
        onClick,
        onMouseEnter: () => setState('hover'),
        onMouseLeave: () => setState('rest'),
        onMouseDown: () => setState('active'),
        onMouseUp: () => setState('hover'),
      };

  const icon = renderIcon ? (
    <span
      aria-hidden="true"
      style={{
        display: 'inline-flex',
        flexShrink: 0,
        marginInlineStart: hasIconOnly ? 0 : 'auto',
        // Trailing icon is pulled into the reserved right padding.
        marginInlineEnd: hasIconOnly ? 0 : 'calc(var(--cds-spacing-10) * -1 + var(--cds-spacing-05))',
      }}
    >
      {renderIcon}
    </span>
  ) : null;

  const Tag = href && !disabled ? 'a' : 'button';

  return (
    <Tag
      style={css}
      href={href}
      disabled={Tag === 'button' ? disabled : undefined}
      aria-disabled={disabled || undefined}
      {...handlers}
      {...rest}
    >
      {!hasIconOnly && <span>{children}</span>}
      {icon}
      {hasIconOnly && <span className="cds--visually-hidden">{children}</span>}
    </Tag>
  );
}
