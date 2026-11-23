import React from 'react';

/**
 * Carbon tile. The workhorse container: a flat layer-01 rectangle with square
 * corners and no shadow — depth comes from the surface change against the page
 * background, never from elevation.
 *
 * Variants: base (static), clickable, selectable, expandable.
 */
export function Tile({
  variant = 'base',
  selected,
  defaultSelected = false,
  expanded,
  defaultExpanded = false,
  href,
  disabled = false,
  aboveTheFold,
  onClick,
  onSelect,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [internalSel, setInternalSel] = React.useState(defaultSelected);
  const [internalExp, setInternalExp] = React.useState(defaultExpanded);

  const isSel = selected !== undefined ? selected : internalSel;
  const isExp = expanded !== undefined ? expanded : internalExp;
  const interactive = variant !== 'base';

  const base = {
    position: 'relative',
    display: 'block',
    padding: 'var(--cds-spacing-05)',
    background: disabled
      ? 'var(--cds-layer-01)'
      : hover && interactive
        ? 'var(--cds-layer-hover-01)'
        : 'var(--cds-layer-01)',
    color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
    border: '1px solid transparent',
    borderRadius: 'var(--cds-radius-none)',
    fontFamily: 'var(--cds-font-sans)',
    fontSize: 'var(--cds-body-01-font-size)',
    lineHeight: 'var(--cds-body-01-line-height)',
    letterSpacing: 'var(--cds-body-01-letter-spacing)',
    textAlign: 'start',
    textDecoration: 'none',
    inlineSize: '100%',
    cursor: disabled ? 'not-allowed' : interactive ? 'pointer' : 'default',
    outline: focused ? '2px solid var(--cds-focus)' : 'none',
    outlineOffset: '-2px',
    transition: 'background var(--cds-duration-fast-02) var(--cds-easing-standard-productive)',
    ...style,
  };

  const handlers = interactive && !disabled
    ? {
        onMouseEnter: () => setHover(true),
        onMouseLeave: () => setHover(false),
        onFocus: () => setFocused(true),
        onBlur: () => setFocused(false),
      }
    : {};

  /* --- selectable: 1px interactive border + checkmark when chosen --- */
  if (variant === 'selectable') {
    const pick = () => {
      if (disabled) return;
      const next = !isSel;
      if (selected === undefined) setInternalSel(next);
      if (onSelect) onSelect(next);
    };
    return (
      <button
        type="button"
        aria-pressed={isSel}
        disabled={disabled}
        onClick={pick}
        style={{ ...base, borderColor: isSel ? 'var(--cds-border-interactive)' : 'var(--cds-border-tile-01)' }}
        {...handlers}
        {...rest}
      >
        {children}
        {isSel && (
          <span aria-hidden="true" style={{ position: 'absolute', insetBlockStart: 'var(--cds-spacing-05)', insetInlineEnd: 'var(--cds-spacing-05)', lineHeight: 0, color: 'var(--cds-icon-interactive)' }}>
            <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z" /></svg>
          </span>
        )}
      </button>
    );
  }

  /* --- expandable: chevron in the bottom-right, content revealed below --- */
  if (variant === 'expandable') {
    const toggle = () => {
      const next = !isExp;
      if (expanded === undefined) setInternalExp(next);
      if (onClick) onClick(next);
    };
    const kids = React.Children.toArray(children);
    return (
      <div style={{ ...base, cursor: 'default' }} {...rest}>
        <div>{aboveTheFold ?? kids[0]}</div>
        {isExp && <div style={{ marginBlockStart: 'var(--cds-spacing-05)' }}>{aboveTheFold ? children : kids.slice(1)}</div>}
        <button
          type="button"
          aria-expanded={isExp}
          aria-label={isExp ? 'Collapse' : 'Expand'}
          onClick={toggle}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            position: 'absolute', insetBlockEnd: 'var(--cds-spacing-03)', insetInlineEnd: 'var(--cds-spacing-03)',
            inlineSize: 32, blockSize: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            background: 'transparent', border: 'none', color: 'var(--cds-icon-primary)', cursor: 'pointer',
            transform: isExp ? 'rotate(180deg)' : 'none',
            transition: 'transform var(--cds-duration-moderate-01) var(--cds-easing-standard-productive)',
          }}
        >
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z" /></svg>
        </button>
      </div>
    );
  }

  /* --- clickable --- */
  if (variant === 'clickable') {
    return (
      <a href={disabled ? undefined : href || '#'} onClick={onClick} style={{ ...base, borderColor: 'var(--cds-border-tile-01)' }} {...handlers} {...rest}>
        {children}
      </a>
    );
  }

  /* --- base --- */
  return <div style={base} {...rest}>{children}</div>;
}
