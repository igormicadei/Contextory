# ToastNotification

Fixed 288px column that stacks in a corner, with a caption line for the timestamp. Use for events not tied to a spot on the page; use InlineNotification when the message belongs beside specific content.

```jsx
<ToastNotification kind="success" title="Deployed" subtitle="Build 482 is live." caption="just now" />
```

| Prop | Type | Default |
|---|---|---|
| `kind` | `'error' \| 'success' \| 'warning' \| 'info'` | `'info'` |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `caption` | `string` | — |
| `lowContrast` | `boolean` | `false` |
| `hideCloseButton` | `boolean` | `false` |
| `onClose` | `() => void` | — |
