# Tabs

The selected tab gets a 2px bottom border in the interactive blue plus a semibold label — two signals, so selection never rests on colour alone. `contained` switches to the filled variant used inside panels.

```jsx
<Tabs tabs={['Overview', 'Usage', 'Billing']}>
  <Overview /><Usage /><Billing />
</Tabs>
```

| Prop | Type | Default |
|---|---|---|
| `tabs` | `Array<string \| { label: string; disabled?: boolean }>` | `[]` |
| `selectedIndex` | `number` | — |
| `defaultSelectedIndex` | `number` | `0` |
| `contained` | `boolean` | `false` |
| `onChange` | `({ selectedIndex }) => void` | — |
| `children` | `React.ReactNode` | — |
