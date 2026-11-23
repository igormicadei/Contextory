import React from 'react';

/**
 * Carbon tooltip. Inverse-background bubble with a 2px radius — one of the two
 * places Carbon rounds anything. Opens on hover AND on focus, so it is reachable
 * by keyboard.
 */
export function Tooltip({ label, align = 'top', defaultOpen = false, children, style, ...rest }) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();

  const pos = {
    top: { insetBlockEnd: '100%', insetInlineStart: '50%', transform: 'translateX(-50%)', marginBlockEnd: 'var(--cds-spacing-03)' },
    bottom: { insetBlockStart: '100%', insetInlineStart: '50%', transform: 'translateX(-50%)', marginBlockStart: 'var(--cds-spacing-03)' },
    left: { insetInlineEnd: '100%', insetBlockStart: '50%', transform: 'translateY(-50%)', marginInlineEnd: 'var(--cds-spacing-03)' },
    right: { insetInlineStart: '100%', insetBlockStart: '50%', transform: 'translateY(-50%)', marginInlineStart: 'var(--cds-spacing-03)' },
  };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex', ...style }}
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      {...rest}
    >
      <span aria-describedby={open ? id : undefined}>{children}</span>

      {open && (
        <span
          id={id}
          role="tooltip"
          style={{
            position: 'absolute', zIndex: 6000,
            ...(pos[align] || pos.top),
            maxInlineSize: 288,
            padding: 'var(--cds-spacing-03) var(--cds-spacing-05)',
            background: 'var(--cds-background-inverse)',
            color: 'var(--cds-text-inverse)',
            // 2px radius — Carbon's only other rounded surface besides the tag.
            borderRadius: 'var(--cds-radius-sm)',
            fontFamily: 'var(--cds-font-sans)',
            fontSize: 'var(--cds-body-01-font-size)',
            lineHeight: 'var(--cds-body-01-line-height)',
            letterSpacing: 'var(--cds-body-01-letter-spacing)',
            textAlign: 'start',
            pointerEvents: 'none',
          }}
        >
          {label}
        </span>
      )}
    </span>
  );
}
