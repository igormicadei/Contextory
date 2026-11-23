# Accordion

Rows divided by 1px rules with no container border. Panel text stops at 75% width to keep the measure readable.

```jsx
<Accordion items={[{ title: 'What is Carbon?', content: <p>IBM's open-source design system.</p> }]} />
```

| Prop | Type | Default |
|---|---|---|
| `items` | `Array<{ title: string; content: React.ReactNode; open?: boolean; disabled?: boolean }>` | `[]` |
| `align` | `'start' \| 'end'` | `'end'` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
