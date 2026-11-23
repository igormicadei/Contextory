# InlineNotification

The 3px left status bar plus the icon carry the meaning — Carbon never relies on background colour alone, so the message still reads for anyone who can't distinguish the hue. Sits inline in the flow, near what it describes.

```jsx
<InlineNotification kind="error" title="Upload failed" subtitle="The file exceeds 10 MB." />
```

| Prop | Type | Default |
|---|---|---|
| `kind` | `'error' \| 'success' \| 'warning' \| 'info'` | `'info'` |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `lowContrast` | `boolean` | `false` |
| `hideCloseButton` | `boolean` | `false` |
| `actionLabel` | `string` | — |
| `onActionClick` | `() => void` | — |
| `onClose` | `() => void` | — |
