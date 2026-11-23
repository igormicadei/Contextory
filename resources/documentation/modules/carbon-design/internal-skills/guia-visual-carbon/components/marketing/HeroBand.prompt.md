# HeroBand

Uses fluid-heading-05, which drops to weight 300 above the md breakpoint — the light-weight display headline is IBM's typographic signature. Resist bolding it. The eyebrow is sentence case at 14px, never all-caps tracked.

```jsx
<HeroBand
  eyebrow="IBM watsonx"
  title="Put AI to work across your business"
  subtitle="An enterprise studio for AI builders."
  primaryAction={<Button>Start free</Button>}
  secondaryAction={<Button variant="tertiary">Book a demo</Button>}
/>
```

| Prop | Type | Default |
|---|---|---|
| `eyebrow` | `string` | — |
| `title` | `string` | — |
| `subtitle` | `string` | — |
| `primaryAction` | `React.ReactNode` | — |
| `secondaryAction` | `React.ReactNode` | — |
| `media` | `React.ReactNode` | — |
| `theme` | `'white' \| 'g10' \| 'g90' \| 'g100'` | `'white'` |
