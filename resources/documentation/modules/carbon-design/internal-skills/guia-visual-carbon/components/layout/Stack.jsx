import React from 'react';

/**
 * Carbon stack. Spaces children on the 2x Grid scale — `gap` is a spacing step
 * (1–13), not a pixel value, so rhythm stays on-grid everywhere.
 */
export function Stack({ orientation = 'vertical', gap = 5, children, style, ...rest }) {
  const step = typeof gap === 'number' ? `var(--cds-spacing-${String(gap).padStart(2, '0')})` : gap;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: orientation === 'horizontal' ? 'row' : 'column',
        gap: step,
        ...style,
      }}
      {...rest}
    >
      {children}
    </div>
  );
}

/** Fixed-ratio media box — keeps images and embeds on-grid as they scale. */
export function AspectRatio({ ratio = '16x9', children, style, ...rest }) {
  const [w, h] = String(ratio).split('x').map(Number);

  return (
    <div style={{ position: 'relative', inlineSize: '100%', aspectRatio: `${w} / ${h}`, overflow: 'hidden', ...style }} {...rest}>
      {children}
    </div>
  );
}
