# Modal

The flush footer is the Carbon modal signature: full-bleed equal-width buttons butted edge to edge with no gap and no padding. Body text stops at 80% width so lines stay readable. Escape closes.

```jsx
<Modal open={open} modalHeading="Delete instance" danger
  primaryButtonText="Delete" onRequestClose={close} onRequestSubmit={remove}>
  This can't be undone.
</Modal>
```

| Prop | Type | Default |
|---|---|---|
| `open` | `boolean` | `false` |
| `modalHeading` | `string` | — |
| `modalLabel` | `string` | — |
| `size` | `'xs' \| 'sm' \| 'md' \| 'lg'` | `'md'` |
| `danger` | `boolean` | `false` |
| `primaryButtonText` | `string` | `'Save'` |
| `secondaryButtonText` | `string` | `'Cancel'` |
| `primaryButtonDisabled` | `boolean` | `false` |
| `passiveModal` | `boolean` | `false` |
| `onRequestClose` | `() => void` | — |
| `onRequestSubmit` | `() => void` | — |
| `onSecondarySubmit` | `() => void` | — |
