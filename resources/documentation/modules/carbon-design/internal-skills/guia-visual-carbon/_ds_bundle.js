/* @ds-bundle: {"format":4,"namespace":"IBMCarbonDesignSystem_8852ea","components":[{"name":"Button","sourcePath":"components/forms/Button.jsx"},{"name":"Checkbox","sourcePath":"components/forms/Checkbox.jsx"},{"name":"Dropdown","sourcePath":"components/forms/Dropdown.jsx"},{"name":"FileUploader","sourcePath":"components/forms/FileUploader.jsx"},{"name":"NumberInput","sourcePath":"components/forms/NumberInput.jsx"},{"name":"RadioButton","sourcePath":"components/forms/RadioButton.jsx"},{"name":"Search","sourcePath":"components/forms/Search.jsx"},{"name":"Select","sourcePath":"components/forms/Select.jsx"},{"name":"Slider","sourcePath":"components/forms/Slider.jsx"},{"name":"TextArea","sourcePath":"components/forms/TextArea.jsx"},{"name":"TextInput","sourcePath":"components/forms/TextInput.jsx"},{"name":"Toggle","sourcePath":"components/forms/Toggle.jsx"},{"name":"Breadcrumb","sourcePath":"components/navigation/Breadcrumb.jsx"},{"name":"Link","sourcePath":"components/navigation/Link.jsx"},{"name":"OverflowMenu","sourcePath":"components/navigation/OverflowMenu.jsx"},{"name":"Pagination","sourcePath":"components/navigation/Pagination.jsx"},{"name":"ProgressIndicator","sourcePath":"components/navigation/ProgressIndicator.jsx"},{"name":"SideNav","sourcePath":"components/navigation/SideNav.jsx"},{"name":"Tabs","sourcePath":"components/navigation/Tabs.jsx"},{"name":"UIShellHeader","sourcePath":"components/navigation/UIShellHeader.jsx"},{"name":"CodeSnippet","sourcePath":"components/data/CodeSnippet.jsx"},{"name":"DataTable","sourcePath":"components/data/DataTable.jsx"},{"name":"StructuredList","sourcePath":"components/data/StructuredList.jsx"},{"name":"Tile","sourcePath":"components/data/Tile.jsx"},{"name":"Accordion","sourcePath":"components/feedback/Accordion.jsx"},{"name":"InlineLoading","sourcePath":"components/feedback/InlineLoading.jsx"},{"name":"InlineNotification","sourcePath":"components/feedback/InlineNotification.jsx"},{"name":"Loading","sourcePath":"components/feedback/Loading.jsx"},{"name":"Modal","sourcePath":"components/feedback/Modal.jsx"},{"name":"ProgressBar","sourcePath":"components/feedback/ProgressBar.jsx"},{"name":"SkeletonText","sourcePath":"components/feedback/SkeletonText.jsx"},{"name":"Tag","sourcePath":"components/feedback/Tag.jsx"},{"name":"ToastNotification","sourcePath":"components/feedback/ToastNotification.jsx"},{"name":"Tooltip","sourcePath":"components/feedback/Tooltip.jsx"},{"name":"Grid","sourcePath":"components/layout/Grid.jsx"},{"name":"Column","sourcePath":"components/layout/Grid.jsx"},{"name":"Stack","sourcePath":"components/layout/Stack.jsx"},{"name":"AspectRatio","sourcePath":"components/layout/Stack.jsx"},{"name":"CTABanner","sourcePath":"components/marketing/CTABanner.jsx"},{"name":"FeatureCard","sourcePath":"components/marketing/FeatureCard.jsx"},{"name":"Footer","sourcePath":"components/marketing/Footer.jsx"},{"name":"HeroBand","sourcePath":"components/marketing/HeroBand.jsx"}],"sourceHashes":{"components/forms/Button.jsx":"2e9f241bf6a0","components/forms/Checkbox.jsx":"4d4f9adeafe3","components/forms/Dropdown.jsx":"28f346cb3481","components/forms/FileUploader.jsx":"a47730b9e679","components/forms/NumberInput.jsx":"1187b0836fbc","components/forms/RadioButton.jsx":"7623c551d78f","components/forms/Search.jsx":"3defebb546ee","components/forms/Select.jsx":"06d27ee3d341","components/forms/Slider.jsx":"5ed0b398d9ba","components/forms/TextArea.jsx":"72c52183d381","components/forms/TextInput.jsx":"005f68b8f42c","components/forms/Toggle.jsx":"119abe0df88b","components/navigation/Breadcrumb.jsx":"69669e136518","components/navigation/Link.jsx":"ee36d245832b","components/navigation/OverflowMenu.jsx":"86c837f6cb44","components/navigation/Pagination.jsx":"d9308d0f8ae7","components/navigation/ProgressIndicator.jsx":"c88cc960de16","components/navigation/SideNav.jsx":"7e062a628a94","components/navigation/Tabs.jsx":"c2237dd22e7e","components/navigation/UIShellHeader.jsx":"318a44e66e68","components/data/CodeSnippet.jsx":"301a3f7be6fb","components/data/DataTable.jsx":"0b53c4b0f562","components/data/StructuredList.jsx":"235a0a664d3a","components/data/Tile.jsx":"f8752c288723","components/feedback/Accordion.jsx":"830caa9beaa6","components/feedback/InlineLoading.jsx":"3873d937b809","components/feedback/InlineNotification.jsx":"5feb10feba73","components/feedback/Loading.jsx":"b435939a6d0b","components/feedback/Modal.jsx":"060b49f6ce64","components/feedback/ProgressBar.jsx":"064ad89847f5","components/feedback/SkeletonText.jsx":"c4709b3c40a7","components/feedback/Tag.jsx":"95176c42c431","components/feedback/ToastNotification.jsx":"818c5e173668","components/feedback/Tooltip.jsx":"bad5647e5e89","components/layout/Grid.jsx":"bb4846febfb3","components/layout/Stack.jsx":"a7e74458a151","components/marketing/CTABanner.jsx":"ffb0dcccc165","components/marketing/FeatureCard.jsx":"af7774838c8b","components/marketing/Footer.jsx":"a506f763cee0","components/marketing/HeroBand.jsx":"3ba7462d7e6b"}} */
(() => {

const __ds_ns = (window.IBMCarbonDesignSystem_8852ea = window.IBMCarbonDesignSystem_8852ea || {});

const __ds_scope = {};

(__ds_ns.__errors = __ds_ns.__errors || []);

// components/forms/Button.jsx
try { (() => {
/* Carbon button heights. lg (48px) is the product default; xl/2xl are the
   expressive sizes used on marketing pages, where the label sits top-aligned. */
const heights = {
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64,
  '2xl': 80
};
const variants = {
  primary: {
    background: 'var(--cds-button-primary)',
    color: 'var(--cds-text-on-color)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-primary-hover)',
    active: 'var(--cds-button-primary-active)'
  },
  secondary: {
    background: 'var(--cds-button-secondary)',
    color: 'var(--cds-text-on-color)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-secondary-hover)',
    active: 'var(--cds-button-secondary-active)'
  },
  tertiary: {
    background: 'transparent',
    color: 'var(--cds-button-tertiary)',
    borderColor: 'var(--cds-button-tertiary)',
    hover: 'var(--cds-button-tertiary-hover)',
    active: 'var(--cds-button-tertiary-active)',
    hoverColor: 'var(--cds-text-inverse)'
  },
  ghost: {
    background: 'transparent',
    color: 'var(--cds-link-primary)',
    borderColor: 'transparent',
    hover: 'var(--cds-background-hover)',
    active: 'var(--cds-background-active)'
  },
  danger: {
    background: 'var(--cds-button-danger-primary)',
    color: 'var(--cds-text-on-color)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-danger-hover)',
    active: 'var(--cds-button-danger-active)'
  },
  'danger--tertiary': {
    background: 'transparent',
    color: 'var(--cds-button-danger-secondary)',
    borderColor: 'var(--cds-button-danger-secondary)',
    hover: 'var(--cds-button-danger-hover)',
    active: 'var(--cds-button-danger-active)',
    hoverColor: 'var(--cds-text-on-color)'
  },
  'danger--ghost': {
    background: 'transparent',
    color: 'var(--cds-button-danger-secondary)',
    borderColor: 'transparent',
    hover: 'var(--cds-button-danger-hover)',
    active: 'var(--cds-button-danger-active)',
    hoverColor: 'var(--cds-text-on-color)'
  }
};

/**
 * Carbon Button. Square corners, 1px border box, label left-aligned with a
 * trailing icon slot — the icon sits at the far right of the button, not
 * beside the text, which is what gives Carbon buttons their distinctive shape.
 */
function Button({
  variant = 'primary',
  size = 'lg',
  disabled = false,
  isSelected = false,
  hasIconOnly = false,
  renderIcon = null,
  href,
  children,
  onClick,
  style,
  ...rest
}) {
  const [state, setState] = React.useState('rest');
  const v = variants[variant] || variants.primary;
  const h = heights[size] || heights.lg;
  const expressive = size === 'xl' || size === '2xl';
  const bg = disabled ? 'var(--cds-button-disabled)' : state === 'active' ? v.active : state === 'hover' ? v.hover : v.background;
  const fg = disabled ? 'var(--cds-text-on-color-disabled)' : state !== 'rest' && v.hoverColor ? v.hoverColor : v.color;
  const css = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: expressive ? 'flex-start' : 'center',
    justifyContent: hasIconOnly ? 'center' : 'space-between',
    gap: 'var(--cds-spacing-06)',
    inlineSize: hasIconOnly ? h : 'auto',
    minBlockSize: h,
    maxInlineSize: hasIconOnly ? h : '20rem',
    padding: hasIconOnly ? 0 : expressive ? 'var(--cds-spacing-05) var(--cds-spacing-10) var(--cds-spacing-05) var(--cds-spacing-05)' : `calc(${(h - 20) / 2}px - 1px) var(--cds-spacing-10) calc(${(h - 20) / 2}px - 1px) var(--cds-spacing-05)`,
    background: bg,
    color: fg,
    border: `1px solid ${disabled ? 'transparent' : v.borderColor}`,
    borderRadius: 'var(--cds-radius-none)',
    fontFamily: 'var(--cds-font-sans)',
    fontSize: expressive ? 'var(--cds-body-compact-02-font-size)' : 'var(--cds-body-compact-01-font-size)',
    fontWeight: 'var(--cds-font-weight-regular)',
    lineHeight: 'var(--cds-body-compact-01-line-height)',
    letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
    textAlign: 'start',
    textDecoration: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive), color var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)',
    outline: isSelected ? '2px solid var(--cds-focus)' : 'none',
    outlineOffset: isSelected ? '-2px' : 0,
    ...style
  };
  const handlers = disabled ? {} : {
    onClick,
    onMouseEnter: () => setState('hover'),
    onMouseLeave: () => setState('rest'),
    onMouseDown: () => setState('active'),
    onMouseUp: () => setState('hover')
  };
  const icon = renderIcon ? /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'inline-flex',
      flexShrink: 0,
      marginInlineStart: hasIconOnly ? 0 : 'auto',
      // Trailing icon is pulled into the reserved right padding.
      marginInlineEnd: hasIconOnly ? 0 : 'calc(var(--cds-spacing-10) * -1 + var(--cds-spacing-05))'
    }
  }, renderIcon) : null;
  const Tag = href && !disabled ? 'a' : 'button';
  return /*#__PURE__*/React.createElement(Tag, {
    style: css,
    href: href,
    disabled: Tag === 'button' ? disabled : undefined,
    "aria-disabled": disabled || undefined,
    ...handlers,
    ...rest
  }, !hasIconOnly && /*#__PURE__*/React.createElement("span", null, children), icon, hasIconOnly && /*#__PURE__*/React.createElement("span", {
    className: "cds--visually-hidden"
  }, children));
}
Object.assign(__ds_scope, { Button });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Button.jsx", error: String((e && e.message) || e) }); }

// components/forms/Checkbox.jsx
try { (() => {
/**
 * Carbon checkbox. A 16px square with a 1px border that fills solid on check —
 * square corners, no rounding, no animation beyond the fast colour swap.
 */
function Checkbox({
  id,
  labelText,
  checked,
  defaultChecked,
  indeterminate = false,
  disabled = false,
  invalid = false,
  invalidText,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const ref = React.useRef(null);
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultChecked || false);
  const isControlled = checked !== undefined;
  const on = isControlled ? checked : internal;
  React.useEffect(() => {
    if (ref.current) ref.current.indeterminate = indeterminate;
  }, [indeterminate]);
  const handle = e => {
    if (!isControlled) setInternal(e.target.checked);
    if (onChange) onChange(e);
  };
  const filled = (on || indeterminate) && !disabled;
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--cds-spacing-03)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0,
      marginBlockStart: 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    ref: ref,
    id: inputId,
    type: "checkbox",
    checked: isControlled ? checked : undefined,
    defaultChecked: isControlled ? undefined : defaultChecked,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onChange: handle,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      position: 'absolute',
      inlineSize: 16,
      blockSize: 16,
      margin: 0,
      opacity: 0,
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    ...rest
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      inlineSize: 16,
      blockSize: 16,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: filled ? 'var(--cds-icon-primary)' : 'transparent',
      border: `1px solid ${disabled ? 'var(--cds-icon-disabled)' : invalid ? 'var(--cds-support-error)' : filled ? 'var(--cds-icon-primary)' : 'var(--cds-icon-primary)'}`,
      borderRadius: 'var(--cds-radius-none)',
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: 1,
      transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)'
    }
  }, indeterminate ? /*#__PURE__*/React.createElement("svg", {
    width: "10",
    height: "2",
    viewBox: "0 0 10 2",
    fill: "var(--cds-icon-inverse)"
  }, /*#__PURE__*/React.createElement("rect", {
    width: "10",
    height: "2"
  })) : on ? /*#__PURE__*/React.createElement("svg", {
    width: "11",
    height: "9",
    viewBox: "0 0 11 9",
    fill: "none",
    stroke: "var(--cds-icon-inverse)",
    strokeWidth: "1.6"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M1 4.5 4 7.5 10 1.5"
  })) : null)), /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      lineHeight: 'var(--cds-body-compact-01-line-height)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, labelText)), invalid && invalidText && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      marginInlineStart: 'var(--cds-spacing-06)',
      color: 'var(--cds-text-error)',
      fontSize: 'var(--cds-helper-text-01-font-size)'
    }
  }, invalidText));
}
Object.assign(__ds_scope, { Checkbox });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Checkbox.jsx", error: String((e && e.message) || e) }); }

// components/forms/Dropdown.jsx
try { (() => {
const heights = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Carbon dropdown — a custom listbox (unlike Select, which wraps the native
 * control). The open menu is a flat square panel with a 1px rule per row and no
 * shadow; selection is marked with a checkmark, not a fill.
 */
function Dropdown({
  id,
  titleText,
  label = 'Choose an option',
  helperText,
  items = [],
  selectedItem,
  size = 'md',
  disabled = false,
  invalid = false,
  invalidText,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [open, setOpen] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(selectedItem ?? null);
  const ref = React.useRef(null);
  const isControlled = selectedItem !== undefined;
  const sel = isControlled ? selectedItem : internal;
  const h = heights[size] || heights.md;
  const text = it => typeof it === 'string' ? it : it?.label;
  React.useEffect(() => {
    const away = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  const pick = it => {
    if (!isControlled) setInternal(it);
    setOpen(false);
    if (onChange) onChange({
      selectedItem: it
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, titleText && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      marginBlockEnd: 'var(--cds-spacing-03)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, titleText), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative'
    }
  }, /*#__PURE__*/React.createElement("button", {
    id: inputId,
    type: "button",
    role: "combobox",
    "aria-expanded": open,
    "aria-haspopup": "listbox",
    disabled: disabled,
    onClick: () => setOpen(o => !o),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      inlineSize: '100%',
      blockSize: h,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 var(--cds-spacing-05)',
      background: 'var(--cds-field-01)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      border: 'none',
      borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      textAlign: 'start',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: '-2px'
    },
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: sel ? 'inherit' : 'var(--cds-text-placeholder)'
    }
  }, sel ? text(sel) : label), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      lineHeight: 0,
      color: 'var(--cds-icon-primary)',
      transform: open ? 'rotate(180deg)' : 'none',
      transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z"
  })))), open && /*#__PURE__*/React.createElement("ul", {
    role: "listbox",
    style: {
      position: 'absolute',
      insetInlineStart: 0,
      insetInlineEnd: 0,
      insetBlockStart: '100%',
      zIndex: 100,
      margin: 0,
      padding: 0,
      listStyle: 'none',
      background: 'var(--cds-layer-01)',
      maxBlockSize: 264,
      overflowY: 'auto'
    }
  }, items.map((it, i) => {
    const on = sel && text(sel) === text(it);
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      role: "option",
      "aria-selected": on,
      onClick: () => pick(it),
      style: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        blockSize: h,
        padding: '0 var(--cds-spacing-05)',
        borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
        background: on ? 'var(--cds-layer-selected-01)' : 'transparent',
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        cursor: 'pointer'
      },
      onMouseEnter: e => {
        if (!on) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
      },
      onMouseLeave: e => {
        if (!on) e.currentTarget.style.background = 'transparent';
      }
    }, text(it), on && /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "var(--cds-icon-primary)"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M13 24 4 15l1.4-1.4 7.6 7.6L26.6 7.9 28 9.3z"
    })));
  }))), (helperText || invalid && invalidText) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
      fontSize: 'var(--cds-helper-text-01-font-size)'
    }
  }, invalid ? invalidText : helperText));
}
Object.assign(__ds_scope, { Dropdown });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Dropdown.jsx", error: String((e && e.message) || e) }); }

// components/forms/FileUploader.jsx
try { (() => {
/** Carbon file uploader — a tertiary-style button plus a flat list of selected files. */
function FileUploader({
  labelTitle = 'Upload files',
  labelDescription,
  buttonLabel = 'Add file',
  accept,
  multiple = false,
  disabled = false,
  files = [],
  onAdd,
  onDelete,
  style,
  ...rest
}) {
  const ref = React.useRef(null);
  const [hover, setHover] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: style,
    ...rest
  }, labelTitle && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-heading-compact-01-font-size)',
      fontWeight: 'var(--cds-heading-compact-01-font-weight)',
      letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)'
    }
  }, labelTitle), labelDescription && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, labelDescription), /*#__PURE__*/React.createElement("button", {
    type: "button",
    disabled: disabled,
    onClick: () => ref.current?.click(),
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      marginBlockStart: 'var(--cds-spacing-05)',
      minBlockSize: 40,
      padding: '0 var(--cds-spacing-05)',
      display: 'inline-flex',
      alignItems: 'center',
      background: hover && !disabled ? 'var(--cds-button-tertiary-hover)' : 'transparent',
      color: hover && !disabled ? 'var(--cds-text-inverse)' : 'var(--cds-button-tertiary)',
      border: `1px solid ${disabled ? 'var(--cds-button-disabled)' : 'var(--cds-button-tertiary)'}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)'
    }
  }, buttonLabel), /*#__PURE__*/React.createElement("input", {
    ref: ref,
    type: "file",
    accept: accept,
    multiple: multiple,
    disabled: disabled,
    onChange: e => onAdd && onAdd(Array.from(e.target.files || [])),
    style: {
      display: 'none'
    }
  }), files.length > 0 && /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 'var(--cds-spacing-05) 0 0',
      padding: 0,
      listStyle: 'none'
    }
  }, files.map((f, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      minBlockSize: 40,
      padding: '0 var(--cds-spacing-05)',
      marginBlockEnd: 'var(--cds-spacing-02)',
      background: 'var(--cds-layer-01)',
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    }
  }, /*#__PURE__*/React.createElement("span", null, typeof f === 'string' ? f : f.name), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": `Remove ${typeof f === 'string' ? f : f.name}`,
    onClick: () => onDelete && onDelete(i),
    style: {
      display: 'flex',
      background: 'transparent',
      border: 'none',
      color: 'var(--cds-icon-primary)',
      cursor: 'pointer',
      padding: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z"
  })))))));
}
Object.assign(__ds_scope, { FileUploader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/FileUploader.jsx", error: String((e && e.message) || e) }); }

// components/forms/NumberInput.jsx
try { (() => {
const heights = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Carbon number input. Stepper controls are stacked square buttons on the right
 * edge, divided by a 1px rule — no rounding, no chrome spinner.
 */
function NumberInput({
  id,
  label,
  helperText,
  value,
  defaultValue = 0,
  min,
  max,
  step = 1,
  size = 'md',
  disabled = false,
  invalid = false,
  invalidText,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const h = heights[size] || heights.md;
  const set = next => {
    if (min !== undefined && next < min) return;
    if (max !== undefined && next > max) return;
    if (!isControlled) setInternal(next);
    if (onChange) onChange(next);
  };
  const stepper = (dir, path, aria) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": aria,
    disabled: disabled || (dir > 0 ? max !== undefined && v >= max : min !== undefined && v <= min),
    onClick: () => set(Number(v) + dir * step),
    style: {
      inlineSize: h,
      blockSize: h / 2,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: 'var(--cds-icon-primary)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, path));
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, label && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      marginBlockEnd: 'var(--cds-spacing-03)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, label), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'stretch',
      blockSize: h,
      background: 'var(--cds-field-01)',
      borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: '-2px'
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "number",
    value: v,
    min: min,
    max: max,
    step: step,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onChange: e => set(Number(e.target.value)),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      minInlineSize: 0,
      padding: '0 var(--cds-spacing-05)',
      background: 'transparent',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      border: 'none',
      outline: 'none',
      appearance: 'textfield',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    },
    ...rest
  }), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      borderInlineStart: '1px solid var(--cds-border-subtle-01)'
    }
  }, stepper(1, /*#__PURE__*/React.createElement("path", {
    d: "M17 15V8h-2v7H8v2h7v7h2v-7h7v-2z"
  }), 'Increment number'), /*#__PURE__*/React.createElement("span", {
    style: {
      blockSize: 1,
      background: 'var(--cds-border-subtle-01)'
    }
  }), stepper(-1, /*#__PURE__*/React.createElement("path", {
    d: "M8 15h16v2H8z"
  }), 'Decrement number'))), (helperText || invalid && invalidText) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
      fontSize: 'var(--cds-helper-text-01-font-size)'
    }
  }, invalid ? invalidText : helperText));
}
Object.assign(__ds_scope, { NumberInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/NumberInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/RadioButton.jsx
try { (() => {
/**
 * Carbon radio button. The one place Carbon draws a circle in a form — a 16px
 * ring with a solid 8px centre dot when selected.
 */
function RadioButton({
  id,
  name,
  value,
  labelText,
  checked,
  defaultChecked,
  disabled = false,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      gap: 'var(--cds-spacing-03)',
      ...style
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      flexShrink: 0,
      marginBlockStart: 1
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "radio",
    name: name,
    value: value,
    checked: checked,
    defaultChecked: defaultChecked,
    disabled: disabled,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      position: 'absolute',
      inlineSize: 16,
      blockSize: 16,
      margin: 0,
      opacity: 0,
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    ...rest
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      inlineSize: 16,
      blockSize: 16,
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      border: `1px solid ${disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)'}`,
      borderRadius: '50%',
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: 1.5
    }
  }, checked && /*#__PURE__*/React.createElement("span", {
    style: {
      inlineSize: 8,
      blockSize: 8,
      borderRadius: '50%',
      background: disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)'
    }
  }))), /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      lineHeight: 'var(--cds-body-compact-01-line-height)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, labelText));
}
Object.assign(__ds_scope, { RadioButton });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/RadioButton.jsx", error: String((e && e.message) || e) }); }

// components/forms/Search.jsx
try { (() => {
const heights = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Carbon search field. Magnifier sits inside the left padding; a close button
 * appears only once there is a value to clear.
 */
function Search({
  id,
  labelText = 'Search',
  placeholder = 'Search',
  value,
  defaultValue,
  size = 'lg',
  disabled = false,
  closeButtonLabelText = 'Clear search input',
  onChange,
  onClear,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue || '');
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const h = heights[size] || heights.lg;
  const clear = () => {
    if (!isControlled) setInternal('');
    if (onClear) onClear();
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      blockSize: h,
      background: 'var(--cds-field-01)',
      borderBlockEnd: '1px solid var(--cds-border-strong-01)',
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: '-2px',
      ...style
    }
  }, /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    className: "cds--visually-hidden"
  }, labelText), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'flex',
      flexShrink: 0,
      marginInline: 'var(--cds-spacing-05) var(--cds-spacing-04)',
      color: 'var(--cds-icon-primary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M29 27.586 20.336 18.92a11.014 11.014 0 1 0-1.414 1.414L27.586 29ZM5 12a9 9 0 1 1 9 9 9.01 9.01 0 0 1-9-9Z"
  }))), /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "text",
    role: "searchbox",
    value: v,
    placeholder: placeholder,
    disabled: disabled,
    onChange: e => {
      if (!isControlled) setInternal(e.target.value);
      if (onChange) onChange(e);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      flex: 1,
      blockSize: '100%',
      padding: 0,
      background: 'transparent',
      color: 'var(--cds-text-primary)',
      border: 'none',
      outline: 'none',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    },
    ...rest
  }), v && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": closeButtonLabelText,
    onClick: clear,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      inlineSize: h,
      blockSize: h,
      flexShrink: 0,
      background: 'transparent',
      border: 'none',
      cursor: 'pointer',
      color: 'var(--cds-icon-primary)',
      borderInlineStart: '1px solid var(--cds-border-subtle-01)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z"
  }))));
}
Object.assign(__ds_scope, { Search });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Search.jsx", error: String((e && e.message) || e) }); }

// components/forms/Select.jsx
try { (() => {
const heights = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Carbon select — a native <select> wearing Carbon field chrome, with the
 * chevron drawn as an overlaid caret so it matches Carbon's icon geometry.
 */
function Select({
  id,
  labelText,
  helperText,
  items = [],
  value,
  defaultValue,
  size = 'md',
  disabled = false,
  invalid = false,
  invalidText,
  onChange,
  style,
  children,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, labelText && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      marginBlockEnd: 'var(--cds-spacing-03)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      lineHeight: 'var(--cds-label-01-line-height)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, labelText), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("select", {
    id: inputId,
    value: value,
    defaultValue: defaultValue,
    disabled: disabled,
    "aria-invalid": invalid || undefined,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      inlineSize: '100%',
      blockSize: heights[size] || heights.md,
      padding: '0 var(--cds-spacing-08) 0 var(--cds-spacing-05)',
      background: 'var(--cds-field-01)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      border: 'none',
      borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      appearance: 'none',
      outline: focused && !disabled ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: '-2px',
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    ...rest
  }, children || items.map(it => {
    const v = typeof it === 'string' ? it : it.value;
    const l = typeof it === 'string' ? it : it.label;
    return /*#__PURE__*/React.createElement("option", {
      key: v,
      value: v
    }, l);
  })), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      insetInlineEnd: 'var(--cds-spacing-05)',
      insetBlockStart: '50%',
      transform: 'translateY(-50%)',
      pointerEvents: 'none',
      lineHeight: 0,
      color: disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z"
  })))), (helperText || invalid && invalidText) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
      fontSize: 'var(--cds-helper-text-01-font-size)'
    }
  }, invalid ? invalidText : helperText));
}
Object.assign(__ds_scope, { Select });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Select.jsx", error: String((e && e.message) || e) }); }

// components/forms/Slider.jsx
try { (() => {
/** Carbon slider — 2px track, square 14px thumb, min/max labels flanking the rail. */
function Slider({
  id,
  labelText,
  value,
  defaultValue = 0,
  min = 0,
  max = 100,
  step = 1,
  disabled = false,
  hideTextInput = false,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultValue);
  const isControlled = value !== undefined;
  const v = isControlled ? value : internal;
  const pct = (v - min) / (max - min) * 100;
  const set = next => {
    if (!isControlled) setInternal(next);
    if (onChange) onChange({
      value: next
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style,
    ...rest
  }, labelText && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      display: 'block',
      marginBlockEnd: 'var(--cds-spacing-05)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, labelText), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--cds-spacing-05)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)'
    }
  }, min), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      flex: 1,
      blockSize: 40,
      display: 'flex',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inlineSize: '100%',
      blockSize: 2,
      background: 'var(--cds-border-subtle-01)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      inlineSize: `${pct}%`,
      blockSize: 2,
      background: disabled ? 'var(--cds-border-disabled)' : 'var(--cds-border-interactive)'
    }
  }), /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      insetInlineStart: `${pct}%`,
      transform: 'translateX(-50%)',
      inlineSize: 14,
      blockSize: 14,
      background: disabled ? 'var(--cds-border-disabled)' : 'var(--cds-interactive)',
      borderRadius: '50%',
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: 2
    }
  }), /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: "range",
    min: min,
    max: max,
    step: step,
    value: v,
    disabled: disabled,
    onChange: e => set(Number(e.target.value)),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      inlineSize: '100%',
      margin: 0,
      opacity: 0,
      cursor: disabled ? 'not-allowed' : 'pointer',
      blockSize: 14
    }
  })), /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)'
    }
  }, max), !hideTextInput && /*#__PURE__*/React.createElement("input", {
    type: "number",
    value: v,
    min: min,
    max: max,
    step: step,
    disabled: disabled,
    onChange: e => set(Number(e.target.value)),
    style: {
      inlineSize: 64,
      blockSize: 40,
      padding: '0 var(--cds-spacing-03)',
      background: 'var(--cds-field-01)',
      color: 'var(--cds-text-primary)',
      border: 'none',
      borderBlockEnd: '1px solid var(--cds-border-strong-01)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      textAlign: 'center'
    }
  })));
}
Object.assign(__ds_scope, { Slider });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Slider.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextArea.jsx
try { (() => {
/** Carbon textarea — same field chrome as TextInput, with a fixed row count. */
function TextArea({
  id,
  labelText,
  helperText,
  placeholder,
  value,
  defaultValue,
  rows = 4,
  disabled = false,
  invalid = false,
  invalidText,
  maxCount,
  onChange,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [count, setCount] = React.useState((value ?? defaultValue ?? '').length);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, (labelText || maxCount) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBlockEnd: 'var(--cds-spacing-03)'
    }
  }, labelText && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      lineHeight: 'var(--cds-label-01-line-height)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, labelText), maxCount && /*#__PURE__*/React.createElement("span", {
    style: {
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)'
    }
  }, count, "/", maxCount)), /*#__PURE__*/React.createElement("textarea", {
    id: inputId,
    rows: rows,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    maxLength: maxCount,
    "aria-invalid": invalid || undefined,
    onChange: e => {
      setCount(e.target.value.length);
      if (onChange) onChange(e);
    },
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      inlineSize: '100%',
      padding: 'var(--cds-spacing-04) var(--cds-spacing-05)',
      background: 'var(--cds-field-01)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      border: 'none',
      borderBlockEnd: `1px solid ${invalid ? 'var(--cds-support-error)' : 'var(--cds-border-strong-01)'}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-01-font-size)',
      lineHeight: 'var(--cds-body-01-line-height)',
      letterSpacing: 'var(--cds-body-01-letter-spacing)',
      resize: 'vertical',
      outline: focused && !disabled ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: '-2px',
      cursor: disabled ? 'not-allowed' : 'text'
    },
    ...rest
  }), (helperText || invalid && invalidText) && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: invalid ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
      fontSize: 'var(--cds-helper-text-01-font-size)',
      lineHeight: 'var(--cds-helper-text-01-line-height)'
    }
  }, invalid ? invalidText : helperText));
}
Object.assign(__ds_scope, { TextArea });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextArea.jsx", error: String((e && e.message) || e) }); }

// components/forms/TextInput.jsx
try { (() => {
const heights = {
  sm: 32,
  md: 40,
  lg: 48
};

/**
 * Carbon text input. The field sits on --cds-field-01 with a single 1px rule on
 * the bottom edge only — that bottom rule is the whole visual identity of a
 * Carbon field. Focus replaces it with a 2px focus ring drawn inside the box.
 */
function TextInput({
  id,
  labelText,
  helperText,
  placeholder,
  value,
  defaultValue,
  type = 'text',
  size = 'md',
  disabled = false,
  readOnly = false,
  invalid = false,
  invalidText,
  warn = false,
  warnText,
  light = false,
  onChange,
  style,
  ...rest
}) {
  const [focused, setFocused] = React.useState(false);
  const inputId = id || React.useId();
  const status = invalid ? 'invalid' : warn ? 'warn' : null;
  const describedBy = status ? `${inputId}-status` : helperText ? `${inputId}-helper` : undefined;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: 'column',
      ...style
    }
  }, labelText && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      marginBlockEnd: 'var(--cds-spacing-03)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      lineHeight: 'var(--cds-label-01-line-height)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, labelText), /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex'
    }
  }, /*#__PURE__*/React.createElement("input", {
    id: inputId,
    type: type,
    value: value,
    defaultValue: defaultValue,
    placeholder: placeholder,
    disabled: disabled,
    readOnly: readOnly,
    "aria-invalid": invalid || undefined,
    "aria-describedby": describedBy,
    onChange: onChange,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      inlineSize: '100%',
      blockSize: heights[size] || heights.md,
      padding: `0 var(--cds-spacing-05)`,
      paddingInlineEnd: status ? 'var(--cds-spacing-08)' : 'var(--cds-spacing-05)',
      background: disabled ? 'var(--cds-field-01)' : light ? 'var(--cds-field-02)' : 'var(--cds-field-01)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      border: 'none',
      // Carbon fields carry a rule on the bottom edge only.
      borderBlockEnd: `1px solid ${disabled ? 'transparent' : invalid ? 'var(--cds-support-error)' : warn ? 'var(--cds-support-warning)' : 'var(--cds-border-strong-01)'}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      lineHeight: 'var(--cds-body-compact-01-line-height)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      outline: focused && !disabled ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: '-2px',
      cursor: disabled ? 'not-allowed' : readOnly ? 'default' : 'text',
      transition: 'background var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)'
    },
    ...rest
  }), status && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      insetInlineEnd: 'var(--cds-spacing-05)',
      insetBlockStart: '50%',
      transform: 'translateY(-50%)',
      color: invalid ? 'var(--cds-support-error)' : 'var(--cds-support-warning)',
      lineHeight: 0
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-1.1 6h2.2v11h-2.2Zm1.1 17.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
  })))), (status || helperText) && /*#__PURE__*/React.createElement("div", {
    id: describedBy,
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: invalid ? 'var(--cds-text-error)' : disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-helper)',
      fontSize: 'var(--cds-helper-text-01-font-size)',
      lineHeight: 'var(--cds-helper-text-01-line-height)',
      letterSpacing: 'var(--cds-helper-text-01-letter-spacing)'
    }
  }, invalid ? invalidText : warn ? warnText : helperText));
}
Object.assign(__ds_scope, { TextInput });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/TextInput.jsx", error: String((e && e.message) || e) }); }

// components/forms/Toggle.jsx
try { (() => {
const sizes = {
  md: {
    w: 48,
    h: 24,
    dot: 18,
    travel: 24
  },
  sm: {
    w: 32,
    h: 16,
    dot: 10,
    travel: 16
  }
};

/**
 * Carbon toggle. The pill track is the only fully-rounded shape in Carbon's UI
 * vocabulary — everything else stays square, so this stands out on purpose.
 */
function Toggle({
  id,
  labelText,
  labelA = 'Off',
  labelB = 'On',
  hideLabel = false,
  toggled,
  defaultToggled = false,
  size = 'md',
  disabled = false,
  onToggle,
  style,
  ...rest
}) {
  const inputId = id || React.useId();
  const [focused, setFocused] = React.useState(false);
  const [internal, setInternal] = React.useState(defaultToggled);
  const isControlled = toggled !== undefined;
  const on = isControlled ? toggled : internal;
  const s = sizes[size] || sizes.md;
  const flip = () => {
    if (disabled) return;
    if (!isControlled) setInternal(!on);
    if (onToggle) onToggle(!on);
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style
  }, labelText && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockEnd: 'var(--cds-spacing-04)',
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      lineHeight: 'var(--cds-label-01-line-height)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, labelText), /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--cds-spacing-03)'
    }
  }, /*#__PURE__*/React.createElement("button", {
    id: inputId,
    type: "button",
    role: "switch",
    "aria-checked": on,
    "aria-label": labelText || (on ? labelB : labelA),
    disabled: disabled,
    onClick: flip,
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false),
    style: {
      position: 'relative',
      inlineSize: s.w,
      blockSize: s.h,
      padding: 0,
      border: 'none',
      borderRadius: 'var(--cds-radius-pill)',
      background: disabled ? 'var(--cds-button-disabled)' : on ? 'var(--cds-support-success)' : 'var(--cds-toggle-off)',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outline: focused ? '2px solid var(--cds-focus)' : 'none',
      outlineOffset: 2,
      transition: 'background var(--cds-duration-fast-02) var(--cds-easing-entrance-productive)'
    },
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      position: 'absolute',
      insetBlockStart: (s.h - s.dot) / 2,
      insetInlineStart: (s.h - s.dot) / 2,
      inlineSize: s.dot,
      blockSize: s.dot,
      borderRadius: '50%',
      background: disabled ? 'var(--cds-icon-on-color-disabled)' : 'var(--cds-icon-on-color)',
      transform: on ? `translateX(${s.travel}px)` : 'translateX(0)',
      transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-entrance-productive)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }
  }, on && size === 'md' && /*#__PURE__*/React.createElement("svg", {
    width: "8",
    height: "7",
    viewBox: "0 0 8 7",
    fill: "none",
    stroke: "var(--cds-support-success)",
    strokeWidth: "1.4"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M.8 3.4 3 5.6 7.2 1"
  })))), !hideLabel && /*#__PURE__*/React.createElement("label", {
    htmlFor: inputId,
    style: {
      color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      lineHeight: 'var(--cds-body-compact-01-line-height)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    }
  }, on ? labelB : labelA)));
}
Object.assign(__ds_scope, { Toggle });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/forms/Toggle.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Breadcrumb.jsx
try { (() => {
/** Carbon breadcrumb — links separated by a thin slash, current page unlinked. */
function Breadcrumb({
  items = [],
  noTrailingSlash = true,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": "Breadcrumb",
    style: {
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("ol", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'center',
      gap: 'var(--cds-spacing-03)',
      margin: 0,
      padding: 0,
      listStyle: 'none'
    }
  }, items.map((it, i) => {
    const last = i === items.length - 1;
    const label = typeof it === 'string' ? it : it.label;
    const href = typeof it === 'object' ? it.href : '#';
    const current = last && (typeof it === 'object' ? it.isCurrentPage !== false : true);
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--cds-spacing-03)'
      }
    }, current ? /*#__PURE__*/React.createElement("span", {
      "aria-current": "page",
      style: {
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
      }
    }, label) : /*#__PURE__*/React.createElement("a", {
      href: href,
      style: {
        color: 'var(--cds-link-primary)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        textDecoration: 'none'
      },
      onMouseEnter: e => {
        e.currentTarget.style.textDecoration = 'underline';
        e.currentTarget.style.color = 'var(--cds-link-primary-hover)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.textDecoration = 'none';
        e.currentTarget.style.color = 'var(--cds-link-primary)';
      }
    }, label), (!last || !noTrailingSlash) && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        color: 'var(--cds-text-secondary)',
        fontSize: 'var(--cds-body-compact-01-font-size)'
      }
    }, "/"));
  })));
}
Object.assign(__ds_scope, { Breadcrumb });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Breadcrumb.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Link.jsx
try { (() => {
/**
 * Carbon link. Blue by default with underline appearing on hover; the inline
 * variant is underlined at rest because it sits inside a run of body text and
 * needs to be findable without hovering.
 */
function Link({
  href = '#',
  inline = false,
  size = 'md',
  disabled = false,
  visited = false,
  renderIcon = null,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const sizes = {
    sm: 'var(--cds-body-compact-01-font-size)',
    md: 'var(--cds-body-01-font-size)',
    lg: 'var(--cds-body-02-font-size)'
  };
  return /*#__PURE__*/React.createElement("a", {
    href: disabled ? undefined : href,
    "aria-disabled": disabled || undefined,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: renderIcon ? 'inline-flex' : 'inline',
      alignItems: 'center',
      gap: 'var(--cds-spacing-03)',
      color: disabled ? 'var(--cds-text-disabled)' : visited ? 'var(--cds-link-visited)' : hover ? 'var(--cds-link-primary-hover)' : 'var(--cds-link-primary)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: sizes[size] || sizes.md,
      letterSpacing: 'var(--cds-body-01-letter-spacing)',
      textDecoration: disabled ? 'none' : inline || hover ? 'underline' : 'none',
      cursor: disabled ? 'not-allowed' : 'pointer',
      outlineOffset: 2,
      ...style
    },
    ...rest
  }, children, renderIcon && /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'flex',
      flexShrink: 0
    }
  }, renderIcon));
}
Object.assign(__ds_scope, { Link });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Link.jsx", error: String((e && e.message) || e) }); }

// components/navigation/OverflowMenu.jsx
try { (() => {
/**
 * Carbon overflow menu. A 40px square trigger holding the vertical three-dot
 * glyph, opening a flat 160px+ panel with 40px rows and no rounding.
 */
function OverflowMenu({
  items = [],
  ariaLabel = 'Open and close list of options',
  flipped = false,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    const away = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, []);
  return /*#__PURE__*/React.createElement("div", {
    ref: ref,
    style: {
      position: 'relative',
      display: 'inline-block',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": ariaLabel,
    "aria-expanded": open,
    "aria-haspopup": "menu",
    onClick: () => setOpen(o => !o),
    style: {
      inlineSize: 40,
      blockSize: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: open ? 'var(--cds-layer-selected-01)' : 'transparent',
      border: 'none',
      borderRadius: 'var(--cds-radius-none)',
      color: 'var(--cds-icon-primary)',
      cursor: 'pointer'
    },
    onMouseEnter: e => {
      if (!open) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
    },
    onMouseLeave: e => {
      if (!open) e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "8",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "16",
    r: "2"
  }), /*#__PURE__*/React.createElement("circle", {
    cx: "16",
    cy: "24",
    r: "2"
  }))), open && /*#__PURE__*/React.createElement("ul", {
    role: "menu",
    style: {
      position: 'absolute',
      insetBlockStart: '100%',
      zIndex: 200,
      [flipped ? 'insetInlineStart' : 'insetInlineEnd']: 0,
      minInlineSize: 160,
      margin: 0,
      padding: 0,
      listStyle: 'none',
      background: 'var(--cds-layer-01)',
      border: '1px solid var(--cds-border-subtle-01)'
    }
  }, items.map((it, i) => /*#__PURE__*/React.createElement("li", {
    key: i,
    role: "none"
  }, /*#__PURE__*/React.createElement("button", {
    role: "menuitem",
    type: "button",
    disabled: it.disabled,
    onClick: () => {
      setOpen(false);
      if (it.onClick) it.onClick();
    },
    style: {
      inlineSize: '100%',
      minBlockSize: 40,
      display: 'flex',
      alignItems: 'center',
      padding: '0 var(--cds-spacing-05)',
      background: 'transparent',
      color: it.isDelete ? 'var(--cds-text-error)' : it.disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
      border: 'none',
      borderBlockEnd: i < items.length - 1 ? '1px solid var(--cds-border-subtle-01)' : 'none',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      textAlign: 'start',
      cursor: it.disabled ? 'not-allowed' : 'pointer'
    },
    onMouseEnter: e => {
      if (!it.disabled) e.currentTarget.style.background = it.isDelete ? 'var(--cds-button-danger-hover)' : 'var(--cds-layer-hover-01)';
      if (it.isDelete) e.currentTarget.style.color = 'var(--cds-text-on-color)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
      e.currentTarget.style.color = it.isDelete ? 'var(--cds-text-error)' : 'var(--cds-text-primary)';
    }
  }, it.label)))));
}
Object.assign(__ds_scope, { OverflowMenu });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/OverflowMenu.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Pagination.jsx
try { (() => {
/**
 * Carbon pagination bar. A 40px rule-bounded strip: page-size select on the
 * left, item range and prev/next steppers on the right, divided by 1px rules.
 */
function Pagination({
  page = 1,
  pageSize = 10,
  totalItems = 0,
  pageSizes = [10, 20, 30, 40, 50],
  onChange,
  style,
  ...rest
}) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const first = totalItems === 0 ? 0 : (page - 1) * pageSize + 1;
  const last = Math.min(page * pageSize, totalItems);
  const go = (p, s) => onChange && onChange({
    page: p,
    pageSize: s ?? pageSize
  });
  const stepper = (dir, disabled, label, path) => /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": label,
    disabled: disabled,
    onClick: () => go(page + dir),
    style: {
      inlineSize: 48,
      blockSize: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      borderInlineStart: '1px solid var(--cds-border-subtle-01)',
      color: disabled ? 'var(--cds-icon-disabled)' : 'var(--cds-icon-primary)',
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, path));
  const cell = {
    display: 'flex',
    alignItems: 'center',
    color: 'var(--cds-text-primary)',
    fontSize: 'var(--cds-body-compact-01-font-size)',
    letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      blockSize: 40,
      background: 'var(--cds-layer-01)',
      borderBlockStart: '1px solid var(--cds-border-subtle-01)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      ...cell,
      gap: 'var(--cds-spacing-05)',
      paddingInlineStart: 'var(--cds-spacing-05)'
    }
  }, /*#__PURE__*/React.createElement("label", {
    style: {
      display: 'flex',
      alignItems: 'center',
      gap: 'var(--cds-spacing-04)'
    }
  }, "Items per page:", /*#__PURE__*/React.createElement("select", {
    value: pageSize,
    onChange: e => go(1, Number(e.target.value)),
    style: {
      blockSize: 40,
      padding: '0 var(--cds-spacing-06) 0 var(--cds-spacing-03)',
      background: 'transparent',
      color: 'var(--cds-text-primary)',
      border: 'none',
      appearance: 'none',
      cursor: 'pointer',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)'
    }
  }, pageSizes.map(s => /*#__PURE__*/React.createElement("option", {
    key: s,
    value: s
  }, s)))), /*#__PURE__*/React.createElement("span", {
    style: {
      borderInlineStart: '1px solid var(--cds-border-subtle-01)',
      blockSize: 40
    }
  }), /*#__PURE__*/React.createElement("span", null, first, "–", last, " of ", totalItems, " items")), /*#__PURE__*/React.createElement("div", {
    style: {
      ...cell
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      paddingInline: 'var(--cds-spacing-05)'
    }
  }, page, " of ", totalPages, " pages"), stepper(-1, page <= 1, 'Previous page', /*#__PURE__*/React.createElement("path", {
    d: "m20 24-10-8 10-8z"
  })), stepper(1, page >= totalPages, 'Next page', /*#__PURE__*/React.createElement("path", {
    d: "m12 8 10 8-10 8z"
  }))));
}
Object.assign(__ds_scope, { Pagination });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Pagination.jsx", error: String((e && e.message) || e) }); }

// components/navigation/ProgressIndicator.jsx
try { (() => {
/**
 * Carbon progress indicator (stepper). Complete steps show a filled checkmark,
 * the current step an open ring, upcoming steps a hollow circle — joined by a
 * 1px rule. Works horizontally or vertically.
 */
function ProgressIndicator({
  steps = [],
  currentIndex = 0,
  vertical = false,
  style,
  ...rest
}) {
  const icon = state => {
    if (state === 'complete') {
      return /*#__PURE__*/React.createElement("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        fill: "var(--cds-interactive)"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7ZM7 11 4 8l.7-.7L7 9.6l4.3-4.3.7.7Z"
      }));
    }
    if (state === 'current') {
      return /*#__PURE__*/React.createElement("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16"
      }, /*#__PURE__*/React.createElement("circle", {
        cx: "8",
        cy: "8",
        r: "7",
        fill: "none",
        stroke: "var(--cds-interactive)",
        strokeWidth: "1"
      }), /*#__PURE__*/React.createElement("circle", {
        cx: "8",
        cy: "8",
        r: "4",
        fill: "var(--cds-interactive)"
      }));
    }
    if (state === 'invalid') {
      return /*#__PURE__*/React.createElement("svg", {
        width: "16",
        height: "16",
        viewBox: "0 0 16 16",
        fill: "var(--cds-support-error)"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M8 1a7 7 0 1 0 7 7 7 7 0 0 0-7-7Zm-.5 3h1v5h-1Zm.5 8a.75.75 0 1 1 .75-.75A.75.75 0 0 1 8 12Z"
      }));
    }
    return /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 16 16"
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "8",
      cy: "8",
      r: "7",
      fill: "none",
      stroke: "var(--cds-border-strong-01)",
      strokeWidth: "1"
    }));
  };
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      display: 'flex',
      flexDirection: vertical ? 'column' : 'row',
      margin: 0,
      padding: 0,
      listStyle: 'none',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, steps.map((s, i) => {
    const label = typeof s === 'string' ? s : s.label;
    const secondary = typeof s === 'object' ? s.secondaryLabel : null;
    const state = typeof s === 'object' && s.invalid ? 'invalid' : i < currentIndex ? 'complete' : i === currentIndex ? 'current' : 'incomplete';
    const last = i === steps.length - 1;
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        display: 'flex',
        flexDirection: vertical ? 'row' : 'column',
        flex: vertical ? 'none' : 1,
        gap: vertical ? 'var(--cds-spacing-04)' : 0,
        minBlockSize: vertical ? 40 : 'auto'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        display: 'flex',
        flexDirection: vertical ? 'column' : 'row',
        alignItems: 'center',
        gap: vertical ? 0 : 'var(--cds-spacing-03)'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        flexShrink: 0
      }
    }, icon(state)), !last && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        flex: 1,
        ...(vertical ? {
          inlineSize: 1,
          minBlockSize: 24,
          background: 'var(--cds-border-subtle-01)'
        } : {
          blockSize: 1,
          background: 'var(--cds-border-subtle-01)'
        })
      }
    })), /*#__PURE__*/React.createElement("div", {
      style: {
        paddingBlockStart: vertical ? 0 : 'var(--cds-spacing-03)',
        paddingInlineEnd: 'var(--cds-spacing-05)'
      }
    }, /*#__PURE__*/React.createElement("div", {
      style: {
        color: state === 'incomplete' ? 'var(--cds-text-secondary)' : 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        fontWeight: state === 'current' ? 'var(--cds-font-weight-semibold)' : 'var(--cds-font-weight-regular)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
      }
    }, label), secondary && /*#__PURE__*/React.createElement("div", {
      style: {
        color: 'var(--cds-text-secondary)',
        fontSize: 'var(--cds-label-01-font-size)',
        letterSpacing: 'var(--cds-label-01-letter-spacing)'
      }
    }, secondary)));
  }));
}
Object.assign(__ds_scope, { ProgressIndicator });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/ProgressIndicator.jsx", error: String((e && e.message) || e) }); }

// components/navigation/SideNav.jsx
try { (() => {
/**
 * Carbon UI Shell side navigation. 256px rail, 32px rows, selected row marked by
 * a 3px left border plus a layer-selected fill — never by a rounded pill.
 */
function SideNav({
  items = [],
  expanded = true,
  ariaLabel = 'Side navigation',
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState({});
  return /*#__PURE__*/React.createElement("nav", {
    "aria-label": ariaLabel,
    style: {
      inlineSize: expanded ? 256 : 48,
      blockSize: '100%',
      background: 'var(--cds-background)',
      borderInlineEnd: '1px solid var(--cds-border-subtle-01)',
      fontFamily: 'var(--cds-font-sans)',
      overflowY: 'auto',
      transition: 'inline-size var(--cds-duration-moderate-01) var(--cds-easing-standard-productive)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none'
    }
  }, items.map((it, i) => {
    const hasKids = it.items && it.items.length > 0;
    const isOpen = open[i] ?? it.defaultExpanded ?? false;
    return /*#__PURE__*/React.createElement("li", {
      key: i
    }, /*#__PURE__*/React.createElement("a", {
      href: hasKids ? undefined : it.href || '#',
      role: hasKids ? 'button' : undefined,
      onClick: hasKids ? e => {
        e.preventDefault();
        setOpen(o => ({
          ...o,
          [i]: !isOpen
        }));
      } : undefined,
      style: {
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--cds-spacing-04)',
        minBlockSize: 32,
        padding: '0 var(--cds-spacing-05)',
        color: it.isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
        background: it.isActive ? 'var(--cds-layer-selected-01)' : 'transparent',
        borderInlineStart: `3px solid ${it.isActive ? 'var(--cds-border-interactive)' : 'transparent'}`,
        paddingInlineStart: 'calc(var(--cds-spacing-05) - 3px)',
        textDecoration: 'none',
        cursor: 'pointer',
        fontSize: 'var(--cds-heading-compact-01-font-size)',
        fontWeight: it.isActive ? 'var(--cds-font-weight-semibold)' : 'var(--cds-font-weight-regular)',
        letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)'
      },
      onMouseEnter: e => {
        if (!it.isActive) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
      },
      onMouseLeave: e => {
        if (!it.isActive) e.currentTarget.style.background = 'transparent';
      }
    }, it.icon && /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'flex',
        color: 'var(--cds-icon-primary)'
      }
    }, it.icon), expanded && /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it.label), expanded && hasKids && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        lineHeight: 0,
        color: 'var(--cds-icon-primary)',
        transform: isOpen ? 'rotate(180deg)' : 'none',
        transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "currentColor"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z"
    })))), expanded && hasKids && isOpen && /*#__PURE__*/React.createElement("ul", {
      style: {
        margin: 0,
        padding: 0,
        listStyle: 'none'
      }
    }, it.items.map((k, j) => /*#__PURE__*/React.createElement("li", {
      key: j
    }, /*#__PURE__*/React.createElement("a", {
      href: k.href || '#',
      style: {
        display: 'flex',
        alignItems: 'center',
        minBlockSize: 32,
        padding: '0 var(--cds-spacing-05) 0 var(--cds-spacing-07)',
        color: k.isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
        background: k.isActive ? 'var(--cds-layer-selected-01)' : 'transparent',
        textDecoration: 'none',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
      },
      onMouseEnter: e => {
        if (!k.isActive) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
      },
      onMouseLeave: e => {
        if (!k.isActive) e.currentTarget.style.background = 'transparent';
      }
    }, k.label)))));
  })));
}
Object.assign(__ds_scope, { SideNav });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/SideNav.jsx", error: String((e && e.message) || e) }); }

// components/navigation/Tabs.jsx
try { (() => {
/**
 * Carbon tabs. The selected tab is marked by a 2px bottom border in the
 * interactive blue and a semibold label; unselected tabs keep a 1px subtle rule.
 */
function Tabs({
  tabs = [],
  selectedIndex,
  defaultSelectedIndex = 0,
  contained = false,
  onChange,
  style,
  children,
  ...rest
}) {
  const [internal, setInternal] = React.useState(defaultSelectedIndex);
  const isControlled = selectedIndex !== undefined;
  const sel = isControlled ? selectedIndex : internal;
  const pick = i => {
    if (!isControlled) setInternal(i);
    if (onChange) onChange({
      selectedIndex: i
    });
  };
  return /*#__PURE__*/React.createElement("div", {
    style: style,
    ...rest
  }, /*#__PURE__*/React.createElement("div", {
    role: "tablist",
    style: {
      display: 'flex',
      overflowX: 'auto'
    }
  }, tabs.map((t, i) => {
    const on = i === sel;
    const label = typeof t === 'string' ? t : t.label;
    const disabled = typeof t === 'object' && t.disabled;
    return /*#__PURE__*/React.createElement("button", {
      key: i,
      role: "tab",
      "aria-selected": on,
      disabled: disabled,
      onClick: () => !disabled && pick(i),
      style: {
        minBlockSize: 48,
        padding: '0 var(--cds-spacing-05)',
        background: contained ? on ? 'var(--cds-layer-01)' : 'var(--cds-layer-accent-01)' : 'transparent',
        color: disabled ? 'var(--cds-text-disabled)' : on ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
        border: 'none',
        borderBlockEnd: contained ? 'none' : `${on ? 2 : 1}px solid ${on ? 'var(--cds-border-interactive)' : 'var(--cds-border-subtle-01)'}`,
        borderInlineEnd: contained ? '1px solid var(--cds-border-subtle-01)' : 'none',
        borderRadius: 'var(--cds-radius-none)',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        fontWeight: on ? 'var(--cds-font-weight-semibold)' : 'var(--cds-font-weight-regular)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer',
        transition: 'color var(--cds-duration-fast-01) var(--cds-easing-entrance-productive)'
      }
    }, label);
  })), children && /*#__PURE__*/React.createElement("div", {
    role: "tabpanel",
    style: {
      padding: 'var(--cds-spacing-05) 0'
    }
  }, Array.isArray(children) ? children[sel] : children));
}
Object.assign(__ds_scope, { Tabs });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/Tabs.jsx", error: String((e && e.message) || e) }); }

// components/navigation/UIShellHeader.jsx
try { (() => {
/**
 * Carbon UI Shell header. Always 48px tall, always gray-100 regardless of the
 * page theme — the shell reads as chrome sitting above the product, so it does
 * not follow the light/dark token swap the rest of the page does.
 */
function UIShellHeader({
  prefix = 'IBM',
  name = 'Product',
  navItems = [],
  actions = [],
  onMenuClick,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("header", {
    className: "cds--g100",
    style: {
      position: 'relative',
      zIndex: 8000,
      display: 'flex',
      alignItems: 'center',
      blockSize: 48,
      background: 'var(--cds-background)',
      borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
      color: 'var(--cds-text-primary)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, onMenuClick && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Open menu",
    onClick: onMenuClick,
    style: {
      inlineSize: 48,
      blockSize: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: 'var(--cds-icon-primary)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M4 6h24v2H4zm0 9h24v2H4zm0 9h24v2H4z"
  }))), /*#__PURE__*/React.createElement("a", {
    href: "#",
    style: {
      display: 'flex',
      alignItems: 'center',
      blockSize: '100%',
      padding: '0 var(--cds-spacing-05)',
      textDecoration: 'none',
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--cds-font-weight-semibold)'
    }
  }, prefix), /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: '0.25rem'
    }
  }, name)), /*#__PURE__*/React.createElement("nav", {
    style: {
      display: 'flex',
      blockSize: '100%'
    }
  }, navItems.map((it, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: it.href || '#',
    style: {
      display: 'flex',
      alignItems: 'center',
      blockSize: '100%',
      padding: '0 var(--cds-spacing-05)',
      color: it.isActive ? 'var(--cds-text-primary)' : 'var(--cds-text-secondary)',
      textDecoration: 'none',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      borderBlockEnd: it.isActive ? '3px solid var(--cds-border-interactive)' : '3px solid transparent',
      boxSizing: 'border-box'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--cds-background-hover)';
      e.currentTarget.style.color = 'var(--cds-text-primary)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
      if (!it.isActive) e.currentTarget.style.color = 'var(--cds-text-secondary)';
    }
  }, it.label))), /*#__PURE__*/React.createElement("div", {
    style: {
      marginInlineStart: 'auto',
      display: 'flex',
      blockSize: '100%'
    }
  }, actions.map((a, i) => /*#__PURE__*/React.createElement("button", {
    key: i,
    type: "button",
    "aria-label": a.label,
    onClick: a.onClick,
    style: {
      inlineSize: 48,
      blockSize: 48,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: a.isActive ? 'var(--cds-background-selected)' : 'transparent',
      border: 'none',
      color: 'var(--cds-icon-primary)',
      cursor: 'pointer'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--cds-background-hover)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = a.isActive ? 'var(--cds-background-selected)' : 'transparent';
    }
  }, a.icon))));
}
Object.assign(__ds_scope, { UIShellHeader });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/navigation/UIShellHeader.jsx", error: String((e && e.message) || e) }); }

// components/data/CodeSnippet.jsx
try { (() => {
/**
 * Carbon code snippet. IBM Plex Mono on layer-01 with a copy button. Three
 * types: single line, multi-line block, and a compact inline variant.
 */
function CodeSnippet({
  type = 'single',
  children,
  feedback = 'Copied!',
  wrapText = false,
  style,
  ...rest
}) {
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
    letterSpacing: 'var(--cds-code-01-letter-spacing)'
  };
  if (type === 'inline') {
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      onClick: copy,
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 var(--cds-spacing-03)',
        background: 'var(--cds-layer-01)',
        color: 'var(--cds-text-primary)',
        border: 'none',
        borderRadius: 'var(--cds-radius-md)',
        cursor: 'pointer',
        ...mono,
        ...style
      },
      ...rest
    }, code);
  }
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      display: 'flex',
      alignItems: 'flex-start',
      background: 'var(--cds-layer-01)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("pre", {
    style: {
      flex: 1,
      margin: 0,
      overflowX: 'auto',
      padding: 'var(--cds-spacing-05) var(--cds-spacing-05)',
      paddingInlineEnd: 'var(--cds-spacing-09)',
      color: 'var(--cds-text-primary)',
      whiteSpace: wrapText ? 'pre-wrap' : 'pre',
      maxBlockSize: type === 'multi' ? 240 : undefined,
      overflowY: type === 'multi' ? 'auto' : undefined,
      ...mono
    }
  }, /*#__PURE__*/React.createElement("code", null, code)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": copied ? feedback : 'Copy to clipboard',
    onClick: copy,
    style: {
      position: 'absolute',
      insetBlockStart: 0,
      insetInlineEnd: 0,
      inlineSize: 40,
      blockSize: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: 'var(--cds-icon-primary)',
      cursor: 'pointer'
    },
    onMouseEnter: e => {
      e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, copied ? /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M13 24 4 15l1.4-1.4 7.6 7.6L26.6 7.9 28 9.3z"
  })) : /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M28 10v18H10V10h18m0-2H10a2 2 0 0 0-2 2v18a2 2 0 0 0 2 2h18a2 2 0 0 0 2-2V10a2 2 0 0 0-2-2Z"
  }), /*#__PURE__*/React.createElement("path", {
    d: "M4 18H2V4a2 2 0 0 1 2-2h14v2H4Z"
  }))));
}
Object.assign(__ds_scope, { CodeSnippet });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/CodeSnippet.jsx", error: String((e && e.message) || e) }); }

// components/data/DataTable.jsx
try { (() => {
const rowHeights = {
  xs: 24,
  sm: 32,
  md: 40,
  lg: 48,
  xl: 64
};

/**
 * Carbon data table. Header row sits on layer-accent, body rows on layer with a
 * 1px rule between them. Sorting is indicated by a caret in the header cell;
 * selection uses a checkbox column, never a row-colour change alone.
 */
function DataTable({
  headers = [],
  rows = [],
  size = 'lg',
  title,
  description,
  isSortable = false,
  selectable = false,
  selectedRows = [],
  onSelect,
  onSort,
  style,
  ...rest
}) {
  const [sort, setSort] = React.useState({
    key: null,
    dir: 'none'
  });
  const h = rowHeights[size] || rowHeights.lg;
  const key = hd => typeof hd === 'string' ? hd : hd.key;
  const head = hd => typeof hd === 'string' ? hd : hd.header;
  const clickSort = hd => {
    if (!isSortable) return;
    const k = key(hd);
    const dir = sort.key !== k ? 'asc' : sort.dir === 'asc' ? 'desc' : 'none';
    setSort({
      key: k,
      dir
    });
    if (onSort) onSort({
      key: k,
      direction: dir
    });
  };
  const cellPad = {
    padding: `0 var(--cds-spacing-05)`
  };
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, (title || description) && /*#__PURE__*/React.createElement("div", {
    style: {
      padding: 'var(--cds-spacing-05)',
      background: 'var(--cds-layer-01)'
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-heading-03-font-size)',
      fontWeight: 'var(--cds-heading-03-font-weight)'
    }
  }, title), description && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-body-01-font-size)'
    }
  }, description)), /*#__PURE__*/React.createElement("table", {
    style: {
      inlineSize: '100%',
      borderCollapse: 'collapse',
      background: 'var(--cds-layer-01)'
    }
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      blockSize: h,
      background: 'var(--cds-layer-accent-01)'
    }
  }, selectable && /*#__PURE__*/React.createElement("th", {
    style: {
      ...cellPad,
      inlineSize: 48,
      textAlign: 'start'
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "cds--visually-hidden"
  }, "Select")), headers.map((hd, i) => {
    const active = sort.key === key(hd) && sort.dir !== 'none';
    return /*#__PURE__*/React.createElement("th", {
      key: i,
      scope: "col",
      "aria-sort": active ? sort.dir === 'asc' ? 'ascending' : 'descending' : 'none',
      onClick: () => clickSort(hd),
      style: {
        ...cellPad,
        blockSize: h,
        textAlign: 'start',
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-heading-compact-01-font-size)',
        fontWeight: 'var(--cds-heading-compact-01-font-weight)',
        letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)',
        cursor: isSortable ? 'pointer' : 'default',
        whiteSpace: 'nowrap'
      }
    }, /*#__PURE__*/React.createElement("span", {
      style: {
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--cds-spacing-03)'
      }
    }, head(hd), isSortable && /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "currentColor",
      "aria-hidden": "true",
      style: {
        opacity: active ? 1 : 0.35,
        transform: active && sort.dir === 'desc' ? 'rotate(180deg)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("path", {
      d: "M16 10l6 6H10z"
    }))));
  }))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, ri) => {
    const id = r.id ?? ri;
    const on = selectedRows.includes(id);
    return /*#__PURE__*/React.createElement("tr", {
      key: id,
      style: {
        blockSize: h,
        background: on ? 'var(--cds-layer-selected-01)' : 'transparent',
        borderBlockStart: '1px solid var(--cds-border-subtle-01)'
      },
      onMouseEnter: e => {
        if (!on) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
      },
      onMouseLeave: e => {
        if (!on) e.currentTarget.style.background = 'transparent';
      }
    }, selectable && /*#__PURE__*/React.createElement("td", {
      style: {
        ...cellPad
      }
    }, /*#__PURE__*/React.createElement("input", {
      type: "checkbox",
      checked: on,
      "aria-label": `Select row ${ri + 1}`,
      onChange: () => onSelect && onSelect(id),
      style: {
        inlineSize: 16,
        blockSize: 16,
        accentColor: 'var(--cds-interactive)',
        cursor: 'pointer'
      }
    })), headers.map((hd, ci) => /*#__PURE__*/React.createElement("td", {
      key: ci,
      style: {
        ...cellPad,
        blockSize: h,
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
      }
    }, r[key(hd)])));
  }))));
}
Object.assign(__ds_scope, { DataTable });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/DataTable.jsx", error: String((e && e.message) || e) }); }

// components/data/StructuredList.jsx
try { (() => {
/**
 * Carbon structured list. Lighter than a data table — no header fill, just a
 * semibold header row over 1px-ruled rows. Use it for read-only detail lists.
 */
function StructuredList({
  headers = [],
  rows = [],
  selection = false,
  selectedIndex,
  onSelect,
  style,
  ...rest
}) {
  const [internal, setInternal] = React.useState(selectedIndex ?? null);
  const sel = selectedIndex !== undefined ? selectedIndex : internal;
  const pick = i => {
    if (!selection) return;
    if (selectedIndex === undefined) setInternal(i);
    if (onSelect) onSelect(i);
  };
  const cell = {
    padding: 'var(--cds-spacing-04) var(--cds-spacing-05)',
    textAlign: 'start',
    verticalAlign: 'top'
  };
  return /*#__PURE__*/React.createElement("table", {
    style: {
      inlineSize: '100%',
      borderCollapse: 'collapse',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("thead", null, /*#__PURE__*/React.createElement("tr", {
    style: {
      borderBlockEnd: '1px solid var(--cds-border-subtle-01)'
    }
  }, selection && /*#__PURE__*/React.createElement("th", {
    style: {
      ...cell,
      inlineSize: 48
    }
  }, /*#__PURE__*/React.createElement("span", {
    className: "cds--visually-hidden"
  }, "Select")), headers.map((h, i) => /*#__PURE__*/React.createElement("th", {
    key: i,
    style: {
      ...cell,
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-heading-compact-01-font-size)',
      fontWeight: 'var(--cds-heading-compact-01-font-weight)',
      letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)'
    }
  }, h)))), /*#__PURE__*/React.createElement("tbody", null, rows.map((r, i) => {
    const on = sel === i;
    return /*#__PURE__*/React.createElement("tr", {
      key: i,
      onClick: () => pick(i),
      style: {
        borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
        background: on ? 'var(--cds-layer-selected-01)' : 'transparent',
        cursor: selection ? 'pointer' : 'default'
      },
      onMouseEnter: e => {
        if (selection && !on) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
      },
      onMouseLeave: e => {
        if (!on) e.currentTarget.style.background = 'transparent';
      }
    }, selection && /*#__PURE__*/React.createElement("td", {
      style: {
        ...cell
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        display: 'flex',
        color: on ? 'var(--cds-icon-primary)' : 'transparent'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "currentColor"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M13 24 4 15l1.4-1.4 7.6 7.6L26.6 7.9 28 9.3z"
    })))), (Array.isArray(r) ? r : headers.map(h => r[h])).map((c, j) => /*#__PURE__*/React.createElement("td", {
      key: j,
      style: {
        ...cell,
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-01-font-size)',
        lineHeight: 'var(--cds-body-01-line-height)',
        letterSpacing: 'var(--cds-body-01-letter-spacing)'
      }
    }, c)));
  })));
}
Object.assign(__ds_scope, { StructuredList });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/StructuredList.jsx", error: String((e && e.message) || e) }); }

// components/data/Tile.jsx
try { (() => {
/**
 * Carbon tile. The workhorse container: a flat layer-01 rectangle with square
 * corners and no shadow — depth comes from the surface change against the page
 * background, never from elevation.
 *
 * Variants: base (static), clickable, selectable, expandable.
 */
function Tile({
  variant = 'base',
  selected,
  defaultSelected = false,
  expanded,
  defaultExpanded = false,
  href,
  disabled = false,
  aboveTheFold,
  onClick,
  onSelect,
  children,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const [focused, setFocused] = React.useState(false);
  const [internalSel, setInternalSel] = React.useState(defaultSelected);
  const [internalExp, setInternalExp] = React.useState(defaultExpanded);
  const isSel = selected !== undefined ? selected : internalSel;
  const isExp = expanded !== undefined ? expanded : internalExp;
  const interactive = variant !== 'base';
  const base = {
    position: 'relative',
    display: 'block',
    padding: 'var(--cds-spacing-05)',
    background: disabled ? 'var(--cds-layer-01)' : hover && interactive ? 'var(--cds-layer-hover-01)' : 'var(--cds-layer-01)',
    color: disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
    border: '1px solid transparent',
    borderRadius: 'var(--cds-radius-none)',
    fontFamily: 'var(--cds-font-sans)',
    fontSize: 'var(--cds-body-01-font-size)',
    lineHeight: 'var(--cds-body-01-line-height)',
    letterSpacing: 'var(--cds-body-01-letter-spacing)',
    textAlign: 'start',
    textDecoration: 'none',
    inlineSize: '100%',
    cursor: disabled ? 'not-allowed' : interactive ? 'pointer' : 'default',
    outline: focused ? '2px solid var(--cds-focus)' : 'none',
    outlineOffset: '-2px',
    transition: 'background var(--cds-duration-fast-02) var(--cds-easing-standard-productive)',
    ...style
  };
  const handlers = interactive && !disabled ? {
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    onFocus: () => setFocused(true),
    onBlur: () => setFocused(false)
  } : {};

  /* --- selectable: 1px interactive border + checkmark when chosen --- */
  if (variant === 'selectable') {
    const pick = () => {
      if (disabled) return;
      const next = !isSel;
      if (selected === undefined) setInternalSel(next);
      if (onSelect) onSelect(next);
    };
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-pressed": isSel,
      disabled: disabled,
      onClick: pick,
      style: {
        ...base,
        borderColor: isSel ? 'var(--cds-border-interactive)' : 'var(--cds-border-tile-01)'
      },
      ...handlers,
      ...rest
    }, children, isSel && /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        position: 'absolute',
        insetBlockStart: 'var(--cds-spacing-05)',
        insetInlineEnd: 'var(--cds-spacing-05)',
        lineHeight: 0,
        color: 'var(--cds-icon-interactive)'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "currentColor"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z"
    }))));
  }

  /* --- expandable: chevron in the bottom-right, content revealed below --- */
  if (variant === 'expandable') {
    const toggle = () => {
      const next = !isExp;
      if (expanded === undefined) setInternalExp(next);
      if (onClick) onClick(next);
    };
    const kids = React.Children.toArray(children);
    return /*#__PURE__*/React.createElement("div", {
      style: {
        ...base,
        cursor: 'default'
      },
      ...rest
    }, /*#__PURE__*/React.createElement("div", null, aboveTheFold ?? kids[0]), isExp && /*#__PURE__*/React.createElement("div", {
      style: {
        marginBlockStart: 'var(--cds-spacing-05)'
      }
    }, aboveTheFold ? children : kids.slice(1)), /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-expanded": isExp,
      "aria-label": isExp ? 'Collapse' : 'Expand',
      onClick: toggle,
      onFocus: () => setFocused(true),
      onBlur: () => setFocused(false),
      style: {
        position: 'absolute',
        insetBlockEnd: 'var(--cds-spacing-03)',
        insetInlineEnd: 'var(--cds-spacing-03)',
        inlineSize: 32,
        blockSize: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'transparent',
        border: 'none',
        color: 'var(--cds-icon-primary)',
        cursor: 'pointer',
        transform: isExp ? 'rotate(180deg)' : 'none',
        transition: 'transform var(--cds-duration-moderate-01) var(--cds-easing-standard-productive)'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "currentColor"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z"
    }))));
  }

  /* --- clickable --- */
  if (variant === 'clickable') {
    return /*#__PURE__*/React.createElement("a", {
      href: disabled ? undefined : href || '#',
      onClick: onClick,
      style: {
        ...base,
        borderColor: 'var(--cds-border-tile-01)'
      },
      ...handlers,
      ...rest
    }, children);
  }

  /* --- base --- */
  return /*#__PURE__*/React.createElement("div", {
    style: base,
    ...rest
  }, children);
}
Object.assign(__ds_scope, { Tile });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/data/Tile.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Accordion.jsx
try { (() => {
/**
 * Carbon accordion. The chevron sits on the LEFT of the heading (Carbon's
 * default) and rows are divided by 1px rules with no container border.
 */
function Accordion({
  items = [],
  align = 'end',
  size = 'md',
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(() => items.map(i => !!i.open));
  const heights = {
    sm: 32,
    md: 40,
    lg: 48
  };
  const h = heights[size] || heights.md;
  return /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, items.map((it, i) => {
    const on = open[i];
    return /*#__PURE__*/React.createElement("li", {
      key: i,
      style: {
        borderBlockEnd: '1px solid var(--cds-border-subtle-01)',
        borderBlockStart: i === 0 ? '1px solid var(--cds-border-subtle-01)' : 'none'
      }
    }, /*#__PURE__*/React.createElement("button", {
      type: "button",
      "aria-expanded": on,
      disabled: it.disabled,
      onClick: () => setOpen(o => o.map((v, j) => j === i ? !v : v)),
      style: {
        inlineSize: '100%',
        minBlockSize: h,
        display: 'flex',
        alignItems: 'center',
        gap: 'var(--cds-spacing-05)',
        flexDirection: align === 'start' ? 'row' : 'row-reverse',
        justifyContent: align === 'start' ? 'flex-start' : 'space-between',
        padding: '0 var(--cds-spacing-05)',
        background: 'transparent',
        color: it.disabled ? 'var(--cds-text-disabled)' : 'var(--cds-text-primary)',
        border: 'none',
        borderRadius: 'var(--cds-radius-none)',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        textAlign: 'start',
        cursor: it.disabled ? 'not-allowed' : 'pointer'
      },
      onMouseEnter: e => {
        if (!it.disabled) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
      },
      onMouseLeave: e => {
        e.currentTarget.style.background = 'transparent';
      }
    }, /*#__PURE__*/React.createElement("span", {
      "aria-hidden": "true",
      style: {
        display: 'flex',
        flexShrink: 0,
        color: 'var(--cds-icon-primary)',
        transform: on ? 'rotate(180deg)' : 'none',
        transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)'
      }
    }, /*#__PURE__*/React.createElement("svg", {
      width: "16",
      height: "16",
      viewBox: "0 0 32 32",
      fill: "currentColor"
    }, /*#__PURE__*/React.createElement("path", {
      d: "M16 22 6 12l1.4-1.4 8.6 8.6 8.6-8.6L26 12z"
    }))), /*#__PURE__*/React.createElement("span", {
      style: {
        flex: 1
      }
    }, it.title)), on && /*#__PURE__*/React.createElement("div", {
      style: {
        padding: `0 var(--cds-spacing-05) var(--cds-spacing-06)`,
        paddingInlineStart: align === 'start' ? 'var(--cds-spacing-09)' : 'var(--cds-spacing-05)',
        paddingInlineEnd: '25%',
        color: 'var(--cds-text-primary)',
        fontSize: 'var(--cds-body-01-font-size)',
        lineHeight: 'var(--cds-body-01-line-height)',
        letterSpacing: 'var(--cds-body-01-letter-spacing)'
      }
    }, it.content));
  }));
}
Object.assign(__ds_scope, { Accordion });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Accordion.jsx", error: String((e && e.message) || e) }); }

// components/feedback/InlineLoading.jsx
try { (() => {
/**
 * Carbon inline loading. Small spinner plus a status label, used beside a
 * submit button. On success the spinner is replaced by a checkmark — the label
 * changes too, so status never depends on colour alone.
 */
function InlineLoading({
  status = 'active',
  description = 'Loading…',
  iconDescription,
  style,
  ...rest
}) {
  const d = 16;
  const r = 7;
  const circ = 2 * Math.PI * r;
  const glyph = () => {
    if (status === 'finished') {
      return /*#__PURE__*/React.createElement("svg", {
        width: d,
        height: d,
        viewBox: "0 0 32 32",
        fill: "var(--cds-support-success)"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z"
      }));
    }
    if (status === 'error') {
      return /*#__PURE__*/React.createElement("svg", {
        width: d,
        height: d,
        viewBox: "0 0 32 32",
        fill: "var(--cds-support-error)"
      }, /*#__PURE__*/React.createElement("path", {
        d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm5.4 17.9-1.5 1.5-3.9-3.9-3.9 3.9-1.5-1.5 3.9-3.9-3.9-3.9 1.5-1.5 3.9 3.9 3.9-3.9 1.5 1.5-3.9 3.9Z"
      }));
    }
    if (status === 'inactive') {
      return /*#__PURE__*/React.createElement("svg", {
        width: d,
        height: d,
        viewBox: "0 0 16 16"
      }, /*#__PURE__*/React.createElement("circle", {
        cx: "8",
        cy: "8",
        r: r,
        fill: "none",
        stroke: "var(--cds-icon-secondary)",
        strokeWidth: "1.5"
      }));
    }
    return /*#__PURE__*/React.createElement(React.Fragment, null, /*#__PURE__*/React.createElement("style", null, '@keyframes cds-spin{to{transform:rotate(360deg)}}'), /*#__PURE__*/React.createElement("svg", {
      width: d,
      height: d,
      viewBox: "0 0 16 16",
      style: {
        animation: 'cds-spin 690ms linear infinite'
      }
    }, /*#__PURE__*/React.createElement("circle", {
      cx: "8",
      cy: "8",
      r: r,
      fill: "none",
      stroke: "var(--cds-layer-accent-01)",
      strokeWidth: "1.5"
    }), /*#__PURE__*/React.createElement("circle", {
      cx: "8",
      cy: "8",
      r: r,
      fill: "none",
      stroke: "var(--cds-interactive)",
      strokeWidth: "1.5",
      strokeDasharray: `${circ * 0.72} ${circ}`
    })));
  };
  return /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-live": "polite",
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--cds-spacing-03)',
      minBlockSize: 40,
      color: 'var(--cds-text-primary)',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    "aria-label": iconDescription,
    style: {
      display: 'flex',
      flexShrink: 0
    }
  }, glyph()), /*#__PURE__*/React.createElement("span", null, description));
}
Object.assign(__ds_scope, { InlineLoading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/InlineLoading.jsx", error: String((e && e.message) || e) }); }

// components/feedback/InlineNotification.jsx
try { (() => {
/**
 * Carbon inline notification. A 3px left status bar is the whole signal —
 * Carbon never relies on background colour alone, so the bar plus the icon
 * carry meaning for anyone who can't distinguish the hue.
 */
const kinds = {
  error: {
    bar: 'var(--cds-support-error)',
    bg: 'var(--cds-notification-background-error)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-1.1 6h2.2v11h-2.2Zm1.1 17.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
    })
  },
  success: {
    bar: 'var(--cds-support-success)',
    bg: 'var(--cds-notification-background-success)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z"
    })
  },
  warning: {
    bar: 'var(--cds-support-warning)',
    bg: 'var(--cds-notification-background-warning)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2 2 28h28ZM14.9 11h2.2v9h-2.2Zm1.1 14.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
    })
  },
  info: {
    bar: 'var(--cds-support-info)',
    bg: 'var(--cds-notification-background-info)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm1.1 22h-2.2V13h2.2Zm-1.1-15.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
    })
  }
};
function InlineNotification({
  kind = 'info',
  title,
  subtitle,
  lowContrast = false,
  hideCloseButton = false,
  actionLabel,
  onActionClick,
  onClose,
  style,
  ...rest
}) {
  const k = kinds[kind] || kinds.info;
  return /*#__PURE__*/React.createElement("div", {
    role: kind === 'error' ? 'alert' : 'status',
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      minBlockSize: 48,
      background: lowContrast ? k.bg : 'var(--cds-background-inverse)',
      color: lowContrast ? 'var(--cds-text-primary)' : 'var(--cds-text-inverse)',
      borderInlineStart: `3px solid ${k.bar}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'flex',
      flexShrink: 0,
      padding: 'var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-05) var(--cds-spacing-05)',
      color: lowContrast ? k.bar : 'var(--cds-icon-inverse)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, k.icon)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      display: 'flex',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      gap: 'var(--cds-spacing-03)',
      padding: 'var(--cds-spacing-04) 0',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      lineHeight: 'var(--cds-body-compact-01-line-height)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    }
  }, title && /*#__PURE__*/React.createElement("span", {
    style: {
      fontWeight: 'var(--cds-font-weight-semibold)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("span", null, subtitle)), actionLabel && /*#__PURE__*/React.createElement("button", {
    type: "button",
    onClick: onActionClick,
    style: {
      alignSelf: 'stretch',
      padding: '0 var(--cds-spacing-05)',
      background: 'transparent',
      color: lowContrast ? 'var(--cds-link-primary)' : 'var(--cds-link-inverse)',
      border: 'none',
      cursor: 'pointer',
      whiteSpace: 'nowrap',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      fontWeight: 'var(--cds-font-weight-semibold)'
    }
  }, actionLabel), !hideCloseButton && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close notification",
    onClick: onClose,
    style: {
      inlineSize: 48,
      blockSize: 48,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: lowContrast ? 'var(--cds-icon-primary)' : 'var(--cds-icon-inverse)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z"
  }))));
}
Object.assign(__ds_scope, { InlineNotification });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/InlineNotification.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Loading.jsx
try { (() => {
/**
 * Carbon loading spinner. A two-arc stroked circle rotating on the productive
 * easing curve — no pulsing, no bounce.
 */
function Loading({
  small = false,
  withOverlay = false,
  description = 'Loading',
  style,
  ...rest
}) {
  const d = small ? 16 : 88;
  const stroke = small ? 2 : 10;
  const r = (d - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const spinner = /*#__PURE__*/React.createElement("div", {
    role: "status",
    "aria-label": description,
    style: {
      inlineSize: d,
      blockSize: d,
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes cds-spin{to{transform:rotate(360deg)}}'), /*#__PURE__*/React.createElement("svg", {
    viewBox: `0 0 ${d} ${d}`,
    style: {
      inlineSize: '100%',
      blockSize: '100%',
      animation: 'cds-spin 690ms linear infinite'
    }
  }, /*#__PURE__*/React.createElement("circle", {
    cx: d / 2,
    cy: d / 2,
    r: r,
    fill: "none",
    stroke: "var(--cds-layer-accent-01)",
    strokeWidth: stroke
  }), /*#__PURE__*/React.createElement("circle", {
    cx: d / 2,
    cy: d / 2,
    r: r,
    fill: "none",
    stroke: "var(--cds-interactive)",
    strokeWidth: stroke,
    strokeLinecap: "butt",
    strokeDasharray: `${circ * 0.72} ${circ}`
  })), /*#__PURE__*/React.createElement("span", {
    className: "cds--visually-hidden"
  }, description));
  if (!withOverlay) return spinner;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cds-overlay)'
    }
  }, spinner);
}
Object.assign(__ds_scope, { Loading });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Loading.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Modal.jsx
try { (() => {
const widths = {
  xs: 400,
  sm: 600,
  md: 840,
  lg: 1056
};

/**
 * Carbon modal. Square container on layer-01 over a 50%-black overlay. The
 * footer buttons are full-bleed and equal-width, butted edge to edge with no
 * gap and no padding — that flush button bar is the Carbon modal signature.
 */
function Modal({
  open = false,
  modalHeading,
  modalLabel,
  size = 'md',
  danger = false,
  primaryButtonText = 'Save',
  secondaryButtonText = 'Cancel',
  primaryButtonDisabled = false,
  passiveModal = false,
  onRequestClose,
  onRequestSubmit,
  onSecondarySubmit,
  children,
  style,
  ...rest
}) {
  React.useEffect(() => {
    if (!open) return;
    const esc = e => {
      if (e.key === 'Escape' && onRequestClose) onRequestClose();
    };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [open, onRequestClose]);
  if (!open) return null;
  const footerBtn = (label, variant, onClick, disabled) => {
    const bg = variant === 'primary' ? danger ? 'var(--cds-button-danger-primary)' : 'var(--cds-button-primary)' : 'var(--cds-button-secondary)';
    return /*#__PURE__*/React.createElement("button", {
      type: "button",
      disabled: disabled,
      onClick: onClick,
      style: {
        flex: 1,
        minBlockSize: 64,
        padding: 'var(--cds-spacing-05) var(--cds-spacing-10) var(--cds-spacing-05) var(--cds-spacing-05)',
        background: disabled ? 'var(--cds-button-disabled)' : bg,
        color: disabled ? 'var(--cds-text-on-color-disabled)' : 'var(--cds-text-on-color)',
        border: 'none',
        borderRadius: 'var(--cds-radius-none)',
        fontFamily: 'var(--cds-font-sans)',
        fontSize: 'var(--cds-body-compact-01-font-size)',
        letterSpacing: 'var(--cds-body-compact-01-letter-spacing)',
        textAlign: 'start',
        cursor: disabled ? 'not-allowed' : 'pointer'
      }
    }, label);
  };
  return /*#__PURE__*/React.createElement("div", {
    onClick: e => {
      if (e.target === e.currentTarget && onRequestClose) onRequestClose();
    },
    style: {
      position: 'fixed',
      inset: 0,
      zIndex: 9000,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--cds-overlay)',
      padding: 'var(--cds-spacing-05)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    role: "dialog",
    "aria-modal": "true",
    "aria-label": modalHeading,
    style: {
      inlineSize: '100%',
      maxInlineSize: widths[size] || widths.md,
      maxBlockSize: '90vh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--cds-layer-01)',
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      padding: 'var(--cds-spacing-05)',
      paddingBlockEnd: 'var(--cds-spacing-03)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1
    }
  }, modalLabel && /*#__PURE__*/React.createElement("div", {
    style: {
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, modalLabel), /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: 0,
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-heading-03-font-size)',
      fontWeight: 'var(--cds-heading-03-font-weight)',
      lineHeight: 'var(--cds-heading-03-line-height)'
    }
  }, modalHeading)), /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close",
    onClick: onRequestClose,
    style: {
      inlineSize: 48,
      blockSize: 48,
      marginBlockStart: 'calc(var(--cds-spacing-05) * -1)',
      marginInlineEnd: 'calc(var(--cds-spacing-05) * -1)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: 'var(--cds-icon-primary)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z"
  })))), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      overflowY: 'auto',
      padding: '0 var(--cds-spacing-05) var(--cds-spacing-09)',
      paddingInlineEnd: '20%',
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-body-01-font-size)',
      lineHeight: 'var(--cds-body-01-line-height)',
      letterSpacing: 'var(--cds-body-01-letter-spacing)'
    }
  }, children), !passiveModal && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex'
    }
  }, footerBtn(secondaryButtonText, 'secondary', onSecondarySubmit || onRequestClose, false), footerBtn(primaryButtonText, 'primary', onRequestSubmit, primaryButtonDisabled))));
}
Object.assign(__ds_scope, { Modal });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Modal.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ProgressBar.jsx
try { (() => {
/**
 * Carbon progress bar. An 8px track with a square fill — determinate by
 * default, or an indeterminate sweep when `value` is omitted.
 */
function ProgressBar({
  label,
  helperText,
  value,
  max = 100,
  size = 'big',
  status = 'active',
  hideLabel = false,
  style,
  ...rest
}) {
  const indeterminate = value === undefined && status === 'active';
  const pct = indeterminate ? 0 : Math.min(100, Math.max(0, value / max * 100));
  const barH = size === 'small' ? 4 : 8;
  const fill = status === 'error' ? 'var(--cds-support-error)' : status === 'finished' ? 'var(--cds-support-success)' : 'var(--cds-interactive)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, !hideLabel && label && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      justifyContent: 'space-between',
      marginBlockEnd: 'var(--cds-spacing-03)',
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, /*#__PURE__*/React.createElement("span", null, label), !indeterminate && status === 'active' && /*#__PURE__*/React.createElement("span", null, Math.round(pct), "%")), /*#__PURE__*/React.createElement("div", {
    role: "progressbar",
    "aria-valuenow": indeterminate ? undefined : value,
    "aria-valuemin": 0,
    "aria-valuemax": max,
    "aria-label": label,
    style: {
      blockSize: barH,
      background: 'var(--cds-border-subtle-01)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes cds-pb{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}'), /*#__PURE__*/React.createElement("div", {
    style: {
      blockSize: '100%',
      inlineSize: indeterminate ? '25%' : `${pct}%`,
      background: fill,
      transition: indeterminate ? 'none' : 'inline-size var(--cds-duration-moderate-01) var(--cds-easing-standard-productive)',
      animation: indeterminate ? 'cds-pb 1.4s var(--cds-easing-standard-productive) infinite' : 'none'
    }
  })), helperText && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      color: status === 'error' ? 'var(--cds-text-error)' : 'var(--cds-text-helper)',
      fontSize: 'var(--cds-helper-text-01-font-size)',
      letterSpacing: 'var(--cds-helper-text-01-letter-spacing)'
    }
  }, helperText));
}
Object.assign(__ds_scope, { ProgressBar });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ProgressBar.jsx", error: String((e && e.message) || e) }); }

// components/feedback/SkeletonText.jsx
try { (() => {
/**
 * Carbon skeleton. A flat placeholder bar with a slow left-to-right shimmer —
 * used while content loads so layout does not jump.
 */
function SkeletonText({
  heading = false,
  paragraph = false,
  lineCount = 3,
  width = '100%',
  style,
  ...rest
}) {
  const h = heading ? 24 : 16;
  const bar = (w, key) => /*#__PURE__*/React.createElement("div", {
    key: key,
    style: {
      position: 'relative',
      blockSize: h,
      inlineSize: w,
      marginBlockEnd: 'var(--cds-spacing-03)',
      background: 'var(--cds-skeleton-background)',
      overflow: 'hidden'
    }
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'absolute',
      inset: 0,
      background: 'linear-gradient(90deg, transparent, var(--cds-skeleton-element), transparent)',
      animation: 'cds-skeleton 2s var(--cds-easing-standard-productive) infinite'
    }
  }));
  const widths = ['100%', '88%', '70%', '94%', '62%'];
  return /*#__PURE__*/React.createElement("div", {
    "aria-hidden": "true",
    style: {
      inlineSize: width,
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("style", null, '@keyframes cds-skeleton{0%{transform:translateX(-100%)}100%{transform:translateX(100%)}}'), paragraph ? Array.from({
    length: lineCount
  }, (_, i) => bar(widths[i % widths.length], i)) : bar(width, 0));
}
Object.assign(__ds_scope, { SkeletonText });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/SkeletonText.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tag.jsx
try { (() => {
/**
 * Carbon tag. One of only two places Carbon rounds a corner — the tag is a
 * pill. Colour carries category, not status; use a Notification for status.
 */
const types = ['red', 'magenta', 'purple', 'blue', 'cyan', 'teal', 'green', 'gray', 'cool-gray', 'warm-gray', 'high-contrast', 'outline'];
const sizes = {
  sm: 18,
  md: 24,
  lg: 32
};
function Tag({
  type = 'gray',
  size = 'md',
  filter = false,
  disabled = false,
  onClose,
  children,
  style,
  ...rest
}) {
  const t = types.includes(type) ? type : 'gray';
  const h = sizes[size] || sizes.md;
  const bg = disabled ? 'var(--cds-layer-01)' : `var(--cds-tag-background-${t})`;
  const fg = disabled ? 'var(--cds-text-disabled)' : `var(--cds-tag-color-${t})`;
  return /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--cds-spacing-02)',
      blockSize: h,
      maxInlineSize: '100%',
      padding: filter ? `0 0 0 var(--cds-spacing-03)` : `0 var(--cds-spacing-03)`,
      background: bg,
      color: fg,
      // Tags are pill-shaped — a deliberate exception to Carbon's square corners.
      borderRadius: 'var(--cds-radius-pill)',
      border: t === 'outline' ? '1px solid var(--cds-border-inverse)' : 'none',
      fontFamily: 'var(--cds-font-sans)',
      fontSize: size === 'sm' ? 'var(--cds-label-01-font-size)' : 'var(--cds-label-01-font-size)',
      lineHeight: 'var(--cds-label-01-line-height)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)',
      whiteSpace: 'nowrap',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    style: {
      overflow: 'hidden',
      textOverflow: 'ellipsis'
    }
  }, children), filter && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": `Clear filter ${typeof children === 'string' ? children : ''}`,
    disabled: disabled,
    onClick: onClose,
    style: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      inlineSize: h,
      blockSize: h,
      flexShrink: 0,
      padding: 0,
      background: 'transparent',
      border: 'none',
      borderRadius: 'var(--cds-radius-pill)',
      color: 'inherit',
      cursor: disabled ? 'not-allowed' : 'pointer'
    },
    onMouseEnter: e => {
      if (!disabled) e.currentTarget.style.background = 'var(--cds-layer-hover-01)';
    },
    onMouseLeave: e => {
      e.currentTarget.style.background = 'transparent';
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "12",
    height: "12",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z"
  }))));
}
Object.assign(__ds_scope, { Tag });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tag.jsx", error: String((e && e.message) || e) }); }

// components/feedback/ToastNotification.jsx
try { (() => {
/**
 * Carbon toast. Same 3px status bar as the inline notification, but a fixed
 * 288px column that stacks in a corner and carries a caption timestamp.
 */
const kinds = {
  error: {
    bar: 'var(--cds-support-error)',
    bg: 'var(--cds-notification-background-error)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-1.1 6h2.2v11h-2.2Zm1.1 17.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
    })
  },
  success: {
    bar: 'var(--cds-support-success)',
    bg: 'var(--cds-notification-background-success)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm-2 19.6-5.3-5.3 1.4-1.4 3.9 3.9 8.5-8.5 1.4 1.4Z"
    })
  },
  warning: {
    bar: 'var(--cds-support-warning)',
    bg: 'var(--cds-notification-background-warning)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2 2 28h28ZM14.9 11h2.2v9h-2.2Zm1.1 14.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
    })
  },
  info: {
    bar: 'var(--cds-support-info)',
    bg: 'var(--cds-notification-background-info)',
    icon: /*#__PURE__*/React.createElement("path", {
      d: "M16 2a14 14 0 1 0 14 14A14 14 0 0 0 16 2Zm1.1 22h-2.2V13h2.2Zm-1.1-15.2a1.6 1.6 0 1 1 1.6-1.6 1.6 1.6 0 0 1-1.6 1.6Z"
    })
  }
};
function ToastNotification({
  kind = 'info',
  title,
  subtitle,
  caption,
  lowContrast = false,
  hideCloseButton = false,
  onClose,
  style,
  ...rest
}) {
  const k = kinds[kind] || kinds.info;
  return /*#__PURE__*/React.createElement("div", {
    role: kind === 'error' ? 'alert' : 'status',
    style: {
      display: 'flex',
      alignItems: 'flex-start',
      inlineSize: 288,
      background: lowContrast ? k.bg : 'var(--cds-background-inverse)',
      color: lowContrast ? 'var(--cds-text-primary)' : 'var(--cds-text-inverse)',
      borderInlineStart: `3px solid ${k.bar}`,
      borderRadius: 'var(--cds-radius-none)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    "aria-hidden": "true",
    style: {
      display: 'flex',
      flexShrink: 0,
      padding: 'var(--cds-spacing-05)',
      color: lowContrast ? k.bar : 'var(--cds-icon-inverse)'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "20",
    height: "20",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, k.icon)), /*#__PURE__*/React.createElement("div", {
    style: {
      flex: 1,
      padding: 'var(--cds-spacing-05) 0'
    }
  }, title && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--cds-heading-compact-01-font-size)',
      fontWeight: 'var(--cds-heading-compact-01-font-weight)',
      letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-02)',
      fontSize: 'var(--cds-body-01-font-size)',
      lineHeight: 'var(--cds-body-01-line-height)',
      letterSpacing: 'var(--cds-body-01-letter-spacing)'
    }
  }, subtitle), caption && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockStart: 'var(--cds-spacing-05)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)',
      opacity: 0.85
    }
  }, caption)), !hideCloseButton && /*#__PURE__*/React.createElement("button", {
    type: "button",
    "aria-label": "Close notification",
    onClick: onClose,
    style: {
      inlineSize: 48,
      blockSize: 48,
      flexShrink: 0,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'transparent',
      border: 'none',
      color: lowContrast ? 'var(--cds-icon-primary)' : 'var(--cds-icon-inverse)',
      cursor: 'pointer'
    }
  }, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor"
  }, /*#__PURE__*/React.createElement("path", {
    d: "M17.4 16 24 9.4 22.6 8 16 14.6 9.4 8 8 9.4 14.6 16 8 22.6 9.4 24 16 17.4 22.6 24 24 22.6z"
  }))));
}
Object.assign(__ds_scope, { ToastNotification });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/ToastNotification.jsx", error: String((e && e.message) || e) }); }

// components/feedback/Tooltip.jsx
try { (() => {
/**
 * Carbon tooltip. Inverse-background bubble with a 2px radius — one of the two
 * places Carbon rounds anything. Opens on hover AND on focus, so it is reachable
 * by keyboard.
 */
function Tooltip({
  label,
  align = 'top',
  defaultOpen = false,
  children,
  style,
  ...rest
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  const id = React.useId();
  const pos = {
    top: {
      insetBlockEnd: '100%',
      insetInlineStart: '50%',
      transform: 'translateX(-50%)',
      marginBlockEnd: 'var(--cds-spacing-03)'
    },
    bottom: {
      insetBlockStart: '100%',
      insetInlineStart: '50%',
      transform: 'translateX(-50%)',
      marginBlockStart: 'var(--cds-spacing-03)'
    },
    left: {
      insetInlineEnd: '100%',
      insetBlockStart: '50%',
      transform: 'translateY(-50%)',
      marginInlineEnd: 'var(--cds-spacing-03)'
    },
    right: {
      insetInlineStart: '100%',
      insetBlockStart: '50%',
      transform: 'translateY(-50%)',
      marginInlineStart: 'var(--cds-spacing-03)'
    }
  };
  return /*#__PURE__*/React.createElement("span", {
    style: {
      position: 'relative',
      display: 'inline-flex',
      ...style
    },
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    ...rest
  }, /*#__PURE__*/React.createElement("span", {
    "aria-describedby": open ? id : undefined
  }, children), open && /*#__PURE__*/React.createElement("span", {
    id: id,
    role: "tooltip",
    style: {
      position: 'absolute',
      zIndex: 6000,
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
      pointerEvents: 'none'
    }
  }, label));
}
Object.assign(__ds_scope, { Tooltip });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/feedback/Tooltip.jsx", error: String((e && e.message) || e) }); }

// components/layout/Grid.jsx
try { (() => {
/**
 * Carbon 2x Grid. 16 columns at lg and above, 8 at md, 4 at sm — the column
 * count is the grid, and everything on the page snaps to it.
 *
 * <Grid>
 *   <Column sm={4} md={4} lg={8}>…</Column>
 *   <Column sm={4} md={4} lg={8}>…</Column>
 * </Grid>
 */
function Grid({
  condensed = false,
  narrow = false,
  fullWidth = false,
  children,
  style,
  ...rest
}) {
  const gutter = condensed ? 'var(--cds-grid-gutter-condensed)' : narrow ? 'var(--cds-spacing-05)' : 'var(--cds-grid-gutter)';
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(var(--cds-grid-cols, 16), minmax(0, 1fr))',
      columnGap: gutter,
      rowGap: gutter,
      inlineSize: '100%',
      maxInlineSize: fullWidth ? 'none' : 'var(--cds-container-max)',
      marginInline: 'auto',
      paddingInline: condensed ? 0 : 'var(--cds-grid-margin)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("style", null, '@media (max-width:65.98rem){[data-cds-grid]{--cds-grid-cols:8}}' + '@media (max-width:41.98rem){[data-cds-grid]{--cds-grid-cols:4}}'), children);
}

/**
 * A grid column. Pass a span per breakpoint; the value is a column count in
 * that tier's grid (4 / 8 / 16), matching Carbon's own API.
 */
function Column({
  sm = 4,
  md = 8,
  lg = 16,
  xlg,
  max,
  children,
  style,
  ...rest
}) {
  const id = React.useId().replace(/[^a-zA-Z0-9]/g, '');
  return /*#__PURE__*/React.createElement("div", {
    "data-cds-col": id,
    style: {
      gridColumn: `span ${lg} / span ${lg}`,
      minInlineSize: 0,
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("style", null, `@media (max-width:41.98rem){[data-cds-col="${id}"]{grid-column:span ${sm}/span ${sm}}}` + `@media (min-width:42rem) and (max-width:65.98rem){[data-cds-col="${id}"]{grid-column:span ${md}/span ${md}}}` + `@media (min-width:66rem){[data-cds-col="${id}"]{grid-column:span ${lg}/span ${lg}}}` + (xlg ? `@media (min-width:82rem){[data-cds-col="${id}"]{grid-column:span ${xlg}/span ${xlg}}}` : '') + (max ? `@media (min-width:99rem){[data-cds-col="${id}"]{grid-column:span ${max}/span ${max}}}` : '')), children);
}
Object.assign(__ds_scope, { Grid, Column });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Grid.jsx", error: String((e && e.message) || e) }); }

// components/layout/Stack.jsx
try { (() => {
/**
 * Carbon stack. Spaces children on the 2x Grid scale — `gap` is a spacing step
 * (1–13), not a pixel value, so rhythm stays on-grid everywhere.
 */
function Stack({
  orientation = 'vertical',
  gap = 5,
  children,
  style,
  ...rest
}) {
  const step = typeof gap === 'number' ? `var(--cds-spacing-${String(gap).padStart(2, '0')})` : gap;
  return /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexDirection: orientation === 'horizontal' ? 'row' : 'column',
      gap: step,
      ...style
    },
    ...rest
  }, children);
}

/** Fixed-ratio media box — keeps images and embeds on-grid as they scale. */
function AspectRatio({
  ratio = '16x9',
  children,
  style,
  ...rest
}) {
  const [w, h] = String(ratio).split('x').map(Number);
  return /*#__PURE__*/React.createElement("div", {
    style: {
      position: 'relative',
      inlineSize: '100%',
      aspectRatio: `${w} / ${h}`,
      overflow: 'hidden',
      ...style
    },
    ...rest
  }, children);
}
Object.assign(__ds_scope, { Stack, AspectRatio });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/layout/Stack.jsx", error: String((e && e.message) || e) }); }

// components/marketing/CTABanner.jsx
try { (() => {
/**
 * Full-bleed call-to-action band. This is the one place IBM Blue is allowed to
 * fill a large surface — everywhere else the blue is reserved for links, primary
 * buttons and focus rings.
 */
function CTABanner({
  title,
  body,
  actions,
  tone = 'blue',
  style,
  ...rest
}) {
  const tones = {
    blue: {
      bg: 'var(--cds-button-primary)',
      fg: 'var(--cds-text-on-color)'
    },
    dark: {
      bg: 'var(--cds-background-inverse)',
      fg: 'var(--cds-text-inverse)'
    },
    subtle: {
      bg: 'var(--cds-layer-01)',
      fg: 'var(--cds-text-primary)'
    }
  };
  const t = tones[tone] || tones.blue;
  return /*#__PURE__*/React.createElement("section", {
    style: {
      background: t.bg,
      color: t.fg,
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxInlineSize: 'var(--cds-container-max)',
      marginInline: 'auto',
      padding: 'var(--cds-spacing-10) var(--cds-spacing-05)',
      display: 'grid',
      gridTemplateColumns: 'minmax(0,2fr) minmax(0,1fr)',
      gap: 'var(--cds-spacing-09)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", null, /*#__PURE__*/React.createElement("h2", {
    className: "cds--type-fluid-heading-04",
    style: {
      margin: 0,
      color: 'inherit'
    }
  }, title), body && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--cds-spacing-05) 0 0',
      maxInlineSize: '40rem',
      color: 'inherit',
      opacity: tone === 'subtle' ? 1 : 0.9,
      fontSize: 'var(--cds-body-02-font-size)',
      lineHeight: 'var(--cds-body-02-line-height)'
    }
  }, body)), actions && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--cds-spacing-05)',
      justifySelf: 'start'
    }
  }, actions)));
}
Object.assign(__ds_scope, { CTABanner });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketing/CTABanner.jsx", error: String((e && e.message) || e) }); }

// components/marketing/FeatureCard.jsx
try { (() => {
/**
 * Marketing feature card. Hierarchy is carried by a 1px hairline and a surface
 * change — never a drop shadow. Hovering lifts the surface, not the elevation.
 */
function FeatureCard({
  eyebrow,
  title,
  body,
  icon,
  href,
  linkLabel = 'Learn more',
  elevated = false,
  style,
  ...rest
}) {
  const [hover, setHover] = React.useState(false);
  const interactive = !!href;
  const Tag = interactive ? 'a' : 'div';
  return /*#__PURE__*/React.createElement(Tag, {
    href: href,
    onMouseEnter: () => setHover(true),
    onMouseLeave: () => setHover(false),
    style: {
      display: 'flex',
      flexDirection: 'column',
      minBlockSize: '100%',
      padding: 'var(--cds-spacing-06)',
      background: hover && interactive ? 'var(--cds-layer-hover-01)' : elevated ? 'var(--cds-layer-01)' : 'var(--cds-background)',
      color: 'var(--cds-text-primary)',
      border: '1px solid var(--cds-border-subtle-01)',
      borderRadius: 'var(--cds-radius-none)',
      textDecoration: 'none',
      fontFamily: 'var(--cds-font-sans)',
      transition: 'background var(--cds-duration-fast-02) var(--cds-easing-standard-productive)',
      ...style
    },
    ...rest
  }, icon && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockEnd: 'var(--cds-spacing-05)',
      color: 'var(--cds-icon-primary)'
    }
  }, icon), eyebrow && /*#__PURE__*/React.createElement("div", {
    style: {
      marginBlockEnd: 'var(--cds-spacing-03)',
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h3", {
    className: "cds--type-fluid-heading-03",
    style: {
      margin: 0,
      color: 'var(--cds-text-primary)'
    }
  }, title), body && /*#__PURE__*/React.createElement("p", {
    style: {
      margin: 'var(--cds-spacing-05) 0 0',
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-body-01-font-size)',
      lineHeight: 'var(--cds-body-01-line-height)',
      letterSpacing: 'var(--cds-body-01-letter-spacing)'
    }
  }, body), interactive && /*#__PURE__*/React.createElement("span", {
    style: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: 'var(--cds-spacing-03)',
      marginBlockStart: 'auto',
      paddingBlockStart: 'var(--cds-spacing-08)',
      color: 'var(--cds-link-primary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    }
  }, linkLabel, /*#__PURE__*/React.createElement("svg", {
    width: "16",
    height: "16",
    viewBox: "0 0 32 32",
    fill: "currentColor",
    "aria-hidden": "true",
    style: {
      transform: hover ? 'translateX(4px)' : 'none',
      transition: 'transform var(--cds-duration-fast-02) var(--cds-easing-standard-productive)'
    }
  }, /*#__PURE__*/React.createElement("path", {
    d: "m18 6-1.43 1.393L24.15 15H4v2h20.15l-7.58 7.573L18 26l10-10z"
  }))));
}
Object.assign(__ds_scope, { FeatureCard });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketing/FeatureCard.jsx", error: String((e && e.message) || e) }); }

// components/marketing/Footer.jsx
try { (() => {
/**
 * IBM.com-style footer. Inverts to the g100 dark theme regardless of the page
 * theme — on a light page this is the only dark surface, which is exactly how
 * ibm.com uses it.
 */
function Footer({
  columns = [],
  wordmark = 'IBM',
  legalLinks = [],
  copyright,
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("footer", {
    className: "cds--g100",
    style: {
      background: 'var(--cds-background)',
      color: 'var(--cds-text-primary)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxInlineSize: 'var(--cds-container-max)',
      marginInline: 'auto',
      padding: 'var(--cds-spacing-09) var(--cds-spacing-05)'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(12rem, 1fr))',
      gap: 'var(--cds-spacing-07)'
    }
  }, wordmark && /*#__PURE__*/React.createElement("div", {
    style: {
      fontSize: 'var(--cds-heading-04-font-size)',
      fontWeight: 'var(--cds-font-weight-semibold)',
      letterSpacing: '-0.02em'
    }
  }, wordmark), columns.map((col, i) => /*#__PURE__*/React.createElement("nav", {
    key: i,
    "aria-label": col.title
  }, /*#__PURE__*/React.createElement("h2", {
    style: {
      margin: '0 0 var(--cds-spacing-05)',
      color: 'var(--cds-text-primary)',
      fontSize: 'var(--cds-heading-compact-01-font-size)',
      fontWeight: 'var(--cds-heading-compact-01-font-weight)',
      letterSpacing: 'var(--cds-heading-compact-01-letter-spacing)'
    }
  }, col.title), /*#__PURE__*/React.createElement("ul", {
    style: {
      margin: 0,
      padding: 0,
      listStyle: 'none',
      display: 'flex',
      flexDirection: 'column',
      gap: 'var(--cds-spacing-04)'
    }
  }, (col.links || []).map((l, j) => /*#__PURE__*/React.createElement("li", {
    key: j
  }, /*#__PURE__*/React.createElement("a", {
    href: l.href || '#',
    style: {
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-body-01-font-size)',
      letterSpacing: 'var(--cds-body-01-letter-spacing)',
      textDecoration: 'none'
    },
    onMouseEnter: e => {
      e.currentTarget.style.color = 'var(--cds-text-primary)';
      e.currentTarget.style.textDecoration = 'underline';
    },
    onMouseLeave: e => {
      e.currentTarget.style.color = 'var(--cds-text-secondary)';
      e.currentTarget.style.textDecoration = 'none';
    }
  }, l.label))))))), (legalLinks.length > 0 || copyright) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--cds-spacing-06)',
      alignItems: 'center',
      marginBlockStart: 'var(--cds-spacing-09)',
      paddingBlockStart: 'var(--cds-spacing-05)',
      borderBlockStart: '1px solid var(--cds-border-subtle-01)',
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-label-01-font-size)',
      letterSpacing: 'var(--cds-label-01-letter-spacing)'
    }
  }, legalLinks.map((l, i) => /*#__PURE__*/React.createElement("a", {
    key: i,
    href: l.href || '#',
    style: {
      color: 'inherit',
      textDecoration: 'none'
    },
    onMouseEnter: e => {
      e.currentTarget.style.textDecoration = 'underline';
    },
    onMouseLeave: e => {
      e.currentTarget.style.textDecoration = 'none';
    }
  }, l.label)), copyright && /*#__PURE__*/React.createElement("span", {
    style: {
      marginInlineStart: 'auto'
    }
  }, copyright))));
}
Object.assign(__ds_scope, { Footer });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketing/Footer.jsx", error: String((e && e.message) || e) }); }

// components/marketing/HeroBand.jsx
try { (() => {
/**
 * IBM.com-style hero. Uses the FLUID display type (weight 300), which is the
 * brand's typographic signature — a 76px headline at weight 300 reads as quietly
 * authoritative where weight 700 would read as generic enterprise.
 *
 * Set `theme` to 'g100' for the inverted dark hero.
 */
function HeroBand({
  eyebrow,
  title,
  subtitle,
  primaryAction,
  secondaryAction,
  media,
  theme = 'white',
  style,
  ...rest
}) {
  return /*#__PURE__*/React.createElement("section", {
    className: `cds--${theme}`,
    style: {
      background: 'var(--cds-background)',
      color: 'var(--cds-text-primary)',
      fontFamily: 'var(--cds-font-sans)',
      ...style
    },
    ...rest
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxInlineSize: 'var(--cds-container-max)',
      marginInline: 'auto',
      padding: 'var(--cds-spacing-10) var(--cds-spacing-05) var(--cds-spacing-12)',
      display: 'grid',
      gridTemplateColumns: media ? 'minmax(0,1fr) minmax(0,1fr)' : 'minmax(0,1fr)',
      gap: 'var(--cds-spacing-09)',
      alignItems: 'center'
    }
  }, /*#__PURE__*/React.createElement("div", {
    style: {
      maxInlineSize: '46rem'
    }
  }, eyebrow &&
  /*#__PURE__*/
  // Carbon eyebrows are sentence case at 14px — never all-caps tracked.
  React.createElement("div", {
    style: {
      marginBlockEnd: 'var(--cds-spacing-05)',
      color: 'var(--cds-text-secondary)',
      fontSize: 'var(--cds-body-compact-01-font-size)',
      letterSpacing: 'var(--cds-body-compact-01-letter-spacing)'
    }
  }, eyebrow), /*#__PURE__*/React.createElement("h1", {
    className: "cds--type-fluid-heading-05",
    style: {
      margin: 0,
      color: 'var(--cds-text-primary)'
    }
  }, title), subtitle && /*#__PURE__*/React.createElement("p", {
    className: "cds--type-fluid-paragraph-01",
    style: {
      margin: 'var(--cds-spacing-06) 0 0',
      maxInlineSize: '40rem',
      color: 'var(--cds-text-secondary)'
    }
  }, subtitle), (primaryAction || secondaryAction) && /*#__PURE__*/React.createElement("div", {
    style: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: 'var(--cds-spacing-05)',
      marginBlockStart: 'var(--cds-spacing-08)'
    }
  }, primaryAction, secondaryAction)), media && /*#__PURE__*/React.createElement("div", null, media)));
}
Object.assign(__ds_scope, { HeroBand });
})(); } catch (e) { __ds_ns.__errors.push({ path: "components/marketing/HeroBand.jsx", error: String((e && e.message) || e) }); }

__ds_ns.Button = __ds_scope.Button;

__ds_ns.Checkbox = __ds_scope.Checkbox;

__ds_ns.Dropdown = __ds_scope.Dropdown;

__ds_ns.FileUploader = __ds_scope.FileUploader;

__ds_ns.NumberInput = __ds_scope.NumberInput;

__ds_ns.RadioButton = __ds_scope.RadioButton;

__ds_ns.Search = __ds_scope.Search;

__ds_ns.Select = __ds_scope.Select;

__ds_ns.Slider = __ds_scope.Slider;

__ds_ns.TextArea = __ds_scope.TextArea;

__ds_ns.TextInput = __ds_scope.TextInput;

__ds_ns.Toggle = __ds_scope.Toggle;

__ds_ns.Breadcrumb = __ds_scope.Breadcrumb;

__ds_ns.Link = __ds_scope.Link;

__ds_ns.OverflowMenu = __ds_scope.OverflowMenu;

__ds_ns.Pagination = __ds_scope.Pagination;

__ds_ns.ProgressIndicator = __ds_scope.ProgressIndicator;

__ds_ns.SideNav = __ds_scope.SideNav;

__ds_ns.Tabs = __ds_scope.Tabs;

__ds_ns.UIShellHeader = __ds_scope.UIShellHeader;

__ds_ns.CodeSnippet = __ds_scope.CodeSnippet;

__ds_ns.DataTable = __ds_scope.DataTable;

__ds_ns.StructuredList = __ds_scope.StructuredList;

__ds_ns.Tile = __ds_scope.Tile;

__ds_ns.Accordion = __ds_scope.Accordion;

__ds_ns.InlineLoading = __ds_scope.InlineLoading;

__ds_ns.InlineNotification = __ds_scope.InlineNotification;

__ds_ns.Loading = __ds_scope.Loading;

__ds_ns.Modal = __ds_scope.Modal;

__ds_ns.ProgressBar = __ds_scope.ProgressBar;

__ds_ns.SkeletonText = __ds_scope.SkeletonText;

__ds_ns.Tag = __ds_scope.Tag;

__ds_ns.ToastNotification = __ds_scope.ToastNotification;

__ds_ns.Tooltip = __ds_scope.Tooltip;

__ds_ns.Grid = __ds_scope.Grid;

__ds_ns.Column = __ds_scope.Column;

__ds_ns.Stack = __ds_scope.Stack;

__ds_ns.AspectRatio = __ds_scope.AspectRatio;

__ds_ns.CTABanner = __ds_scope.CTABanner;

__ds_ns.FeatureCard = __ds_scope.FeatureCard;

__ds_ns.Footer = __ds_scope.Footer;

__ds_ns.HeroBand = __ds_scope.HeroBand;

})();
