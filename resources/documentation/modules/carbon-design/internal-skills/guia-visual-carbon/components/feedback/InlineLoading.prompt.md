# InlineLoading

Small spinner plus a status label, used beside a submit button. On success the spinner becomes a checkmark AND the label changes, so status never depends on colour alone.

```jsx
<InlineLoading status="active" description="Saving…" />
<InlineLoading status="finished" description="Saved" />
```

| Prop | Type | Default |
|---|---|---|
| `status` | `'active' \| 'inactive' \| 'finished' \| 'error'` | `'active'` |
| `description` | `string` | `'Loading…'` |
| `iconDescription` | `string` | — |
