# Link

Standalone links underline on hover; `inline` links underline at rest because they sit inside running text and must be findable without hovering.

```jsx
<Link href="/docs">Read the docs</Link>
<p>See the <Link inline href="/pricing">pricing page</Link> for details.</p>
```

| Prop | Type | Default |
|---|---|---|
| `href` | `string` | `'#'` |
| `inline` | `boolean` | `false` |
| `size` | `'sm' \| 'md' \| 'lg'` | `'md'` |
| `disabled` | `boolean` | `false` |
| `visited` | `boolean` | `false` |
| `renderIcon` | `React.ReactNode` | — |
