import React from 'react';

/**
 * Carbon progress indicator (stepper). Complete steps show a filled checkmark,
 * the current step an open ring, upcoming steps a hollow circle — joined by a
 * 1px rule. Works horizontally or vertically.
 */
export function ProgressIndicator({ steps = [], currentIndex = 0, vertical = false, style, ...rest }) {
  const icon = state => {
    if (state === 'complete') {
      return <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--cds-interactive)"><path d="M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7ZM7 11 4 8l.7-.7L7 9.6l4.3-4.3.7.7Z" /></svg>;
    }
    if (state === 'current') {
      return <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="var(--cds-interactive)" strokeWidth="1" /><circle cx="8" cy="8" r="4" fill="var(--cds-interactive)" /></svg>;
    }
    if (state === 'invalid') {
      return <svg width="16" height="16" viewBox="0 0 16 16" fill="var(--cds-support-error)"><path d="M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7Zm-.5 3h1v5h-1Zm.5 8a.75.75 0 1 1 .75-.75A.75.75 0 0 1 8 12Z" /></svg>;
    }
    return <svg width="16" height="16" viewBox="0 0 16 16"><circle cx="8" cy="8" r="7" fill="none" stroke="var(--cds-border-strong-01)" strokeWidth="1" /></svg>;
  };

  return (
    <ul
      style={{
        display: 'flex', flexDirection: vertical ? 'column' : 'row',
        margin: 0, padding: 0, listStyle: 'none',
        fontFamily: 'var(--cds-font-sans)', ...style,
      }}
      {...rest}
    >
      {steps.map((s, i) => {
        const label = typeof s === 'string' ? s : s.label;
        const secondary = typeof s === 'object' ? s.secondaryLabel : null;
        const state = (typeof s === 'object' && s.invalid) ? 'invalid'
          : i < currentIndex ? 'complete'
          : i === currentIndex ? 'current' : 'incomplete';
        const last = i === steps.length - 1;

        return (
          <li key={i} style={{ display: 'flex', flexDirection: vertical ? 'row' : 'column', flex: vertical ? 'none' : 1, gap: vertical ? 'var(--cds-spacing-04)' : 0, minBlockSize: vertical ? 40 : 'auto' }}>
            <div style={{ display: 'flex', flexDirection: vertical ? 'column' : 'row', alignItems: 'center', gap: vertical ? 0 : 'var(--cds-spacing-03)' }}>
              <span style={{ display: 'flex', flexShrink: 0 }}>{icon(state)}</span>
              {!last && (
                <span aria-hidden="true" style={{
                  flex: 1,
                  ...(vertical
                    ? { inlineSize: 1, minBlockSize: 24, background: 'var(--cds-border-subtle-01)' }
                    : { blockSize: 1, background: 'var(--cds-border-subtle-01)' }),
                }} />
              )}
            </div>

            <div style={{ paddingBlockStart: vertical ? 0 : 'var(--cds-spacing-03)', paddingInlineEnd: 'var(--cds-spacing-05)' }}>
              <div style={{
                color: state === 'incomplete' ? 'var(--cds-text-secondary)' : 'var(--cds-text-primary)',
                fontSize: 'var(--cds-body-compact-01-font-size)',
                fontWeight: state === 'current' ? 'var(--cds-font-weight-semibold)' : 'var(--cds-font-weight-regular)',
                letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
              }}>{label}</div>
              {secondary && (
                <div style={{ color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-label-01-font-size)', letterSpacing: 'var(--cds-label-01-letter-spacing)' }}>{secondary}</div>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
