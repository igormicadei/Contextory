# Tooltip

Inverse bubble with a 2px radius. Opens on hover AND focus so it is reachable by keyboard. Never put essential information only in a tooltip.

```jsx
<Tooltip label="Copy to clipboard"><Button hasIconOnly renderIcon={<CopyIcon />}>Copy</Button></Tooltip>
```

| Prop | Type | Default |
|---|---|---|
| `label` | `string` | — |
| `align` | `'top' \| 'bottom' \| 'left' \| 'right'` | `'top'` |
| `defaultOpen` | `boolean` | `false` |
| `children` | `React.ReactNode` | — |
