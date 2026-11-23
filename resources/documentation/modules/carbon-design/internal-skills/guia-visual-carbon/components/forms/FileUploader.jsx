import React from 'react';

/** Carbon file uploader — a tertiary-style button plus a flat list of selected files. */
export function FileUploader({
  labelTitle = 'Upload files', labelDescription, buttonLabel = 'Add file',
  accept, multiple = false, disabled = false, files = [], onAdd, onDelete, style, ...rest
}) {
  const ref = React.useRef(null);
  const [hover, setHover] = React.useState(false);

  return (
    <div style={style} {...rest}>
      {labelTitle && (
        <div style={{ color: 'var(--cds-text-primary)', fontSize: 'var(--cds-heading-compact-01-font-size)', fontWeight: 'var(--cds-heading-compact-01-font-weight)', letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)' }}>
          {labelTitle}
        </div>
      )}
      {labelDescription && (
        <div style={{ marginBlockStart: 'var(--cds-spacing-02)', color: 'var(--cds-text-secondary)', fontSize: 'var(--cds-label-01-font-size)', letterSpacing: 'var(--cds-label-01-letter-spacing)' }}>
          {labelDescription}
        </div>
      )}

      <button
        type="button"
        disabled={disabled}
        onClick={() => ref.current?.click()}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          marginBlockStart: 'var(--cds-spacing-05)',
          minBlockSize: 40, padding: '0 var(--cds-spacing-05)',
          display: 'inline-flex', alignItems: 'center',
          background: hover && !disabled ? 'var(--cds-button-tertiary-hover)' : 'transparent',
          color: hover && !disabled ? 'var(--cds-text-inverse)' : 'var(--cds-button-tertiary)',
          border: `1px solid ${disabled ? 'var(--cds-button-disabled)' : 'var(--cds-button-tertiary)'}`,
          borderRadius: 'var(--cds-radius-none)',
          fontFamily: 'var(--cds-font-sans)',
          fontSize: 'var(--cds-body-compact-01-font-size)',
          letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
          cursor: disabled ? 'not-allowed' : 'pointer',
          transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)',
        }}
      >
        {buttonLabel}
      </button>

      <input ref={ref} type="file" accept={accept} multiple={multiple} disabled={disabled}
        onChange={e => onAdd && onAdd(Array.from(e.target.files || []))}
        style={{ display: 'none' }} />

      {files.length > 0 && (
        <ul style={{ margin: 'var(--cds-spacing-05) 0 0', padding: 0, listStyle: 'none' }}>
          {files.map((f, i) => (
            <li key={i} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              minBlockSize: 40, padding: '0 var(--cds-spacing-05)',
              marginBlockEnd: 'var(--cds-spacing-02)',
              background: 'var(--cds-layer-01)',
              color: 'var(--cds-text-primary)',
              fontSize: 'var(--cds-body-compact-01-font-size)',
              letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
            }}>
              <span>{typeof f === 'string' ? f : f.name}</span>
              <button type="button" aria-label={`Remove ${typeof f === 'string' ? f : f.name}`}
                onClick={() => onDelete && onDelete(i)}
                style={{ display: 'flex', background: 'transparent', border: 'none', color: 'var(--cds-icon-primary)', cursor: 'pointer', padding: 0 }}>
                <svg width="16" height="16" viewBox="0 0 32 32" fill="currentColor"><path d="M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
