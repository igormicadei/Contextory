# FeatureCard

Hierarchy is a 1px hairline plus a surface change — never a drop shadow. Passing `href` makes the whole card a link and reveals the arrow affordance, which nudges right on hover.

```jsx
<FeatureCard title="Hybrid cloud" body="Run workloads anywhere." href="/cloud" />
```

| Prop | Type | Default |
|---|---|---|
| `eyebrow` | `string` | — |
| `title` | `string` | — |
| `body` | `string` | — |
| `icon` | `React.ReactNode` | — |
| `href` | `string` | — |
| `linkLabel` | `string` | `'Learn more'` |
| `elevated` | `boolean` | `false` |
