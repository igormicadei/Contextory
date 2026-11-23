# Footer

Inverts to g100 regardless of the page theme — on a light page this is the only dark surface, which is exactly how ibm.com uses it. The wordmark is set in plain type; the real 8-bar logo is never reconstructed.

```jsx
<Footer
  columns={[{ title: 'Products', links: [{ label: 'watsonx' }, { label: 'Cloud' }] }]}
  legalLinks={[{ label: 'Privacy' }, { label: 'Terms' }]}
  copyright="© 2026 IBM"
/>
```

| Prop | Type | Default |
|---|---|---|
| `columns` | `Array<{ title: string; links: Array<{ label: string; href?: string }> }>` | `[]` |
| `wordmark` | `string` | `'IBM'` |
| `legalLinks` | `Array<{ label: string; href?: string }>` | `[]` |
| `copyright` | `string` | — |
