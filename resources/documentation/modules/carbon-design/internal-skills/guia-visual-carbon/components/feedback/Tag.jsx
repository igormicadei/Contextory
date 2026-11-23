import React from 'react';

/**
 * Carbon tag. One of only two places Carbon rounds a corner — the tag is a
 * pill. Colour carries category, not status; use a Notification for status.
 */
const types = ['red', 'magenta', 'purple', 'blue', 'cyan', 'teal', 'green', 'gray', 'cool-gray', 'warm-gray', 'high-contrast', 'outline'];

const sizes = { sm: 18, md: 24, lg: 32 };

export function Tag({
  type = 'gray',
  size = 'md',
  filter = false,
  disabled = false,
  onClose,
  children,
  style,
  ...rest
}) {
  const t = types.includes(type) ? type : 'gray';
  const h = sizes[size] || sizes.md;

  const bg = disabled ? 'var(--cds-layer-01)' : `var(--cds-tag-background-${t})`;
  const fg = disabled ? 'var(--cds-text-disabled)' : `var(--cds-tag-color-${t})`;

  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--cds-spacing-02)',
        blockSize: h,
        maxInlineSize: '100%',
        padding: filter ? `0 0 0 var(--cds-spacing-03)` : `0 var(--cds-spacing-03)`,
        background: bg,
        color: fg,
        // Tags are pill-shaped — a deliberate exception to Carbon's square corners.
        borderRadius: 'var(--cds-radius-pill)',
        border: t === 'outline' ? '1px solid var(--cds-border-inverse)' : 'none',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: size === 'sm' ? 'var(--cds-label-01-font-size)' : 'var(--cds-label-01-font-size)',
        lineHeight: 'var(--cds-label-01-line-height)',
        letterSpacing: 'var(--cds-label-01-letter-spacing)',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...rest}
    >
      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{children}</span>

      {filter && (
        <button
          type="button"
          aria-label={`Clear filter ${typeof children === 'string' ? children : ''}`}
          disabled={disabled}
          onClick={onClose}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            inlineSize: h, blockSize: h, flexShrink: 0,
            padding: 0, background: 'transparent', border: 'none',
            borderRadius: 'var(--cds-radius-pill)',
            color: 'inherit', cursor: disabled ? 'not-allowed' : 'pointer',
          }}
          onMouseEnter={e => { if (!disabled) e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
        >
          <svg width="12" height="12" viewBox="0 0 32 32" fill="currentColor"><path d="M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z" /></svg>
        </button>
      )}
    </span>
  );
}
