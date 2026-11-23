# CTABanner

The one place IBM Blue is allowed to fill a large surface. Everywhere else the blue stays reserved for links, primary buttons and focus rings — using it as a general card background is the fastest way to break the Carbon look.

```jsx
<CTABanner title="Ready to start building?" body="Create an account in minutes."
  actions={<Button variant="secondary">Create account</Button>} />
```

| Prop | Type | Default |
|---|---|---|
| `title` | `string` | — |
| `body` | `string` | — |
| `actions` | `React.ReactNode` | — |
| `tone` | `'blue' \| 'dark' \| 'subtle'` | `'blue'` |
