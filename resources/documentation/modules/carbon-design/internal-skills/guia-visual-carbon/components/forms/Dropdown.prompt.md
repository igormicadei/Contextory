# Dropdown

A custom listbox rather than a native select. The open menu is flat and square with a 1px rule per row; the chosen row is marked with a checkmark, not just a fill.

```jsx
<Dropdown titleText="Instance size" items={['Lite', 'Standard', 'Premium']} />
```

| Prop | Type | Default |
|---|---|---|
| `titleText` | `string` | — |
| `label` | `string` | `'Choose an option'` |
| `helperText` | `string` | — |
| `items` | `Array<string \| { label: string }>` | `[]` |
| `selectedItem` | `any` | — |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `disabled` | `boolean` | `false` |
| `invalid` | `boolean` | `false` |
| `invalidText` | `string` | — |
| `onChange` | `({ selectedItem }) => void` | — |
