import React from 'react';

/**
 * Carbon loading spinner. A two-arc stroked circle rotating on the productive
 * easing curve — no pulsing, no bounce.
 */
export function Loading({ small = false, withOverlay = false, description = 'Loading', style, ...rest }) {
  const d = small ? 16 : 88;
  const stroke = small ? 2 : 10;
  const r = (d - stroke) / 2;
  const circ = 2 * Math.PI * r;

  const spinner = (
    <div role="status" aria-label={description} style={{ inlineSize: d, blockSize: d, ...style }} {...rest}>
      <style>{'@keyframes cds-spin{to{transform:rotate(360deg)}}'}</style>
      <svg viewBox={`0 0 ${d} ${d}`} style={{ inlineSize: '100%', blockSize: '100%', animation: 'cds-spin 690ms linear infinite' }}>
        <circle cx={d / 2} cy={d / 2} r={r} fill="none" stroke="var(--cds-layer-accent-01)" strokeWidth={stroke} />
        <circle
          cx={d / 2} cy={d / 2} r={r} fill="none"
          stroke="var(--cds-interactive)" strokeWidth={stroke} strokeLinecap="butt"
          strokeDasharray={`${circ * 0.72} ${circ}`}
        />
      </svg>
      <span className="cds--visually-hidden">{description}</span>
    </div>
  );

  if (!withOverlay) return spinner;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9000,
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cds-overlay)',
    }}>
      {spinner}
    </div>
  );
}
