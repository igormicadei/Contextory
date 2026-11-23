import React from 'react';

/**
 * Carbon code snippet. IBM Plex Mono on layer-01 with a copy button. Three
 * types: single line, multi-line block, and a compact inline variant.
 */
export function CodeSnippet({ type = 'single', children, feedback = 'Copied!', wrapText = false, style, ...rest }) {
  const [copied, setCopied] = React.useState(false);
  const code = typeof children === 'string' ? children : String(children ?? '');

  const copy = () => {
    if (navigator.clipboard) navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const mono = {
    fontFamily: 'var(--cds-font-mono)',
    fontSize: 'var(--cds-code-01-font-size)',
    lineHeight: 'var(--cds-code-01-line-height)',
    letterSpacing: 'var(--cds-code-01-letter-spacing)',
  };

  if (type === 'inline') {
    return (
      <button type="button" onClick={copy} style={{
        display: 'inline-flex', alignItems: 'center',
        padding: '0 var(--cds-spacing-03)',
        background: 'var(--cds-layer-01)', color: 'var(--cds-text-primary)',
        border: 'none', borderRadius: 'var(--cds-radius-md)',
        cursor: 'pointer', ...mono, ...style,
      }} {...rest}>
        {code}
      </button>
    );
  }

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'flex-start', background: 'var(--cds-layer-01)', ...style }} {...rest}>
      <pre style={{
        flex: 1, margin: 0, overflowX: 'auto',
        padding: 'var(--cds-spacing-05) var(--cds-spacing-05)',
        paddingInlineEnd: 'var(--cds-spacing-09)',
        color: 'var(--cds-text-primary)',
        whiteSpace: wrapText ? 'pre-wrap' : 'pre',
        maxBlockSize: type === 'multi' ? 240 : undefined,
        overflowY: type === 'multi' ? 'auto' : undefined,
        ...mono,
      }}>
        <code>{code}</code>
      </pre>

      <button
        type="button"
        aria-label={copied ? feedback : 'Copy to clipboard'}
        onClick={copy}
        style={{
          position: 'absolute', insetBlockStart: 0, insetInlineEnd: 0,
          inlineSize: 40, blockSize: 40,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', border: 'none',
          color: 'var(--cds-icon-primary)', cursor: 'pointer',
        }}
        onMouseEnter={e => { e.currentTarget.style.background = 'var(--cds-layer-hover-01)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >
        {copied ? (
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M13 24 4 15l1.4-1.4 7.6 7.6L26.6 7.9 28 9.3z" /></svg>
        ) : (
          <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M28 10v18H10V10h18m0-2H10a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z" /><path d="M4 18H2V4a2 2 0 0 1 2-2h14v2H4Z" /></svg>
        )}
      </button>
    </div>
  );
}
