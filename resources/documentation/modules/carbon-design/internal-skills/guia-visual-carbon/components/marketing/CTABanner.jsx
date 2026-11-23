import React from 'react';

/**
 * Full-bleed call-to-action band. This is the one place IBM Blue is allowed to
 * fill a large surface — everywhere else the blue is reserved for links, primary
 * buttons and focus rings.
 */
export function CTABanner({ title, body, actions, tone = 'blue', style, ...rest }) {
  const tones = {
    blue: { bg: 'var(--cds-button-primary)', fg: 'var(--cds-text-on-color)' },
    dark: { bg: 'var(--cds-background-inverse)', fg: 'var(--cds-text-inverse)' },
    subtle: { bg: 'var(--cds-layer-01)', fg: 'var(--cds-text-primary)' },
  };
  const t = tones[tone] || tones.blue;

  return (
    <section
      style={{ background: t.bg, color: t.fg, fontFamily: 'var(--cds-font-sans)', ...style }}
      {...rest}
    >
      <div style={{
        maxInlineSize: 'var(--cds-container-max)',
        marginInline: 'auto',
        padding: 'var(--cds-spacing-10) var(--cds-spacing-05)',
        display: 'grid',
        gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)',
        gap: 'var(--cds-spacing-09)',
        alignItems: 'center',
      }}>
        <div>
          <h2 className="cds--type-fluid-heading-04" style={{ margin: 0, color: 'inherit' }}>{title}</h2>
          {body && (
            <p style={{
              margin: 'var(--cds-spacing-05) 0 0',
              maxInlineSize: '40rem',
              color: 'inherit',
              opacity: tone === 'subtle' ? 1 : 0.9,
              fontSize: 'var(--cds-body-02-font-size)',
              lineHeight: 'var(--cds-body-02-line-height)',
            }}>{body}</p>
          )}
        </div>

        {actions && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--cds-spacing-05)', justifySelf: 'start' }}>
            {actions}
          </div>
        )}
      </div>
    </section>
  );
}
