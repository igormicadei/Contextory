import React from 'react';

/**
 * Carbon inline loading. Small spinner plus a status label, used beside a
 * submit button. On success the spinner is replaced by a checkmark — the label
 * changes too, so status never depends on colour alone.
 */
export function InlineLoading({ status = 'active', description = 'Loading…', iconDescription, style, ...rest }) {
  const d = 16;
  const r = 7;
  const circ = 2 * Math.PI * r;

  const glyph = () => {
    if (status === 'finished') {
      return <svg width={d} height={d} viewBox="0 0 32 32" fill="var(--cds-support-success)"><path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z" /></svg>;
    }
    if (status === 'error') {
      return <svg width={d} height={d} viewBox="0 0 32 32" fill="var(--cds-support-error)"><path d="M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm5.4 17.9-1.5 1.5-3.9-3.9-3.9 3.9-1.5-1.5 3.9-3.9-3.9-3.9 1.5-1.5 3.9 3.9 3.9-3.9 1.5 1.5-3.9 3.9Z" /></svg>;
    }
    if (status === 'inactive') {
      return <svg width={d} height={d} viewBox="0 0 16 16"><circle cx="8" cy="8" r={r} fill="none" stroke="var(--cds-icon-secondary)" strokeWidth="1.5" /></svg>;
    }
    return (
      <>
        <style>{'@keyframes cds-spin{to{transform:rotate(360deg)}}'}</style>
        <svg width={d} height={d} viewBox="0 0 16 16" style={{ animation: 'cds-spin 690ms linear infinite' }}>
          <circle cx="8" cy="8" r={r} fill="none" stroke="var(--cds-layer-accent-01)" strokeWidth="1.5" />
          <circle cx="8" cy="8" r={r} fill="none" stroke="var(--cds-interactive)" strokeWidth="1.5" strokeDasharray={`${circ * 0.72} ${circ}`} />
        </svg>
      </>
    );
  };

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 'var(--cds-spacing-03)',
        minBlockSize: 40,
        color: 'var(--cds-text-primary)',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        ...style,
      }}
      {...rest}
    >
      <span aria-label={iconDescription} style={{ display: 'flex', flexShrink: 0 }}>{glyph()}</span>
      <span>{description}</span>
    </div>
  );
}
