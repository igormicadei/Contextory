# Toggle

The pill track is deliberately the only fully-rounded shape in Carbon's UI vocabulary. Applies its change immediately — use a Checkbox when the change needs a separate submit.

```jsx
<Toggle labelText="Auto-scaling" defaultToggled />
```

| Prop | Type | Default |
|---|---|---|
| `labelText` | `string` | — |
| `labelA` | `string` | `'Off'` |
| `labelB` | `string` | `'On'` |
| `hideLabel` | `boolean` | `false` |
| `toggled` | `boolean` | — |
| `defaultToggled` | `boolean` | `false` |
| `size` | `'sm' \| 'md'` | `'md'` |
| `disabled` | `boolean` | `false` |
| `onToggle` | `(on: boolean) => void` | — |
