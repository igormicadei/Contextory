import React from 'react';

/**
 * Carbon progress bar. An 8px track with a square fill — determinate by
 * default, or an indeterminate sweep when `value` is omitted.
 */
export function ProgressBar({
  label, helperText, value, max = 100,
  size = 'big', status = 'active', hideLabel = false, style, ...rest
}) {
  const indeterminate = value === undefined && status === 'active';
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, (value / max) * 100));
  const barH = size === 'small' ? 4 : 8;

  const fill = status === 'error' ? 'var(--cds-support-error)'
    : status === 'finished' ? 'var(--cds-support-success)'
    : 'var(--cds-interactive)';

  return (
    <div style={{ fontFamily: 'var(--cds-font-sans)', ...style }} {...rest}>
      {!hideLabel && label && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          marginBlockEnd: 'var(--cds-spacing-03)',
          color: 'var(--cds-text-primary)',
          fontSize: 'var(--cds-label-01-font-size)',
          letterSpacing: 'var(--cds-label-01-letter-spacing)',
        }}>
          <span>{label}</span>
          {!indeterminate && status === 'active' && <span>{Math.round(pct)}%</span>}
        </div>
      )}

      <div
        role="progressbar"
        aria-valuenow={indeterminate ? undefined : value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        style={{ blockSize: barH, background: 'var(--cds-border-subtle-01)', overflow: 'hidden' }}
      >
        <style>{'@keyframes cds-pb{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}'}</style>
        <div style={{
          blockSize: '100%',
          inlineSize: indeterminate ? '25%' : `${pct}%`,
          background: fill,
          transition: indeterminate ? 'none' : 'inline-size var(--cds-duration-moderate-01) var(--cds-easing-standard-productive)',
          animation: indeterminate ? 'cds-pb 1.4s var(--cds-easing-standard-productive) infinite' : 'none',
        }} />
      </div>

      {helperText && (
        <div style={{
          marginBlockStart: 'var(--cds-spacing-02)',
          color: status === 'error' ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
          fontSize: 'var(--cds-helper-text-01-font-size)',
          letterSpacing: 'var(--cds-helper-text-01-letter-spacing)',
        }}>{helperText}</div>
      )}
    </div>
  );
}
