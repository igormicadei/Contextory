import React from 'react';

/**
 * Carbon skeleton. A flat placeholder bar with a slow left-to-right shimmer —
 * used while content loads so layout does not jump.
 */
export function SkeletonText({ heading = false, paragraph = false, lineCount = 3, width = '100%', style, ...rest }) {
  const h = heading ? 24 : 16;

  const bar = (w, key) => (
    <div
      key={key}
      style={{
        position: 'relative',
        blockSize: h,
        inlineSize: w,
        marginBlockEnd: 'var(--cds-spacing-03)',
        background: 'var(--cds-skeleton-background)',
        overflow: 'hidden',
      }}
    >
      <span style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, transparent, var(--cds-skeleton-element), transparent)',
        animation: 'cds-skeleton 2s var(--cds-easing-standard-productive) infinite',
      }} />
    </div>
  );

  const widths = ['100%', '88%', '70%', '94%', '62%'];

  return (
    <div aria-hidden="true" style={{ inlineSize: width, ...style }} {...rest}>
      <style>{'@keyframes cds-skeleton{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'}</style>
      {paragraph
        ? Array.from({ length: lineCount }, (_, i) => bar(widths[i % widths.length], i))
        : bar(width, 0)}
    </div>
  );
}
