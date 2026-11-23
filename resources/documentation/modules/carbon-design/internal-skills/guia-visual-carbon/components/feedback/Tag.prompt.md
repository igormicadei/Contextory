# Tag

Pill-shaped — a deliberate exception to Carbon's square corners. Tag colour carries CATEGORY, not status; reach for a Notification when you mean status. `filter` adds the clear button used in filter bars.

```jsx
<Tag type="blue">Production</Tag>
<Tag type="teal" filter onClose={clear}>region: eu-de</Tag>
```

| Prop | Type | Default |
|---|---|---|
| `type` | `'red' \| 'magenta' \| 'purple' \| 'blue' \| 'cyan' \| 'teal' \| 'green' \| 'gray' \| 'cool-gray' \| 'warm-gray' \| 'high-contrast' \| 'outline'` | `'gray'` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `filter` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `onClose` | `() => void` | — |
