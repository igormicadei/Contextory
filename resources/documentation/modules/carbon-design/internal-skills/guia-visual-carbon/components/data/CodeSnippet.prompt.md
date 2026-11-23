# CodeSnippet

IBM Plex Mono on layer-01 with a copy button. `multi` caps at 240px and scrolls; `inline` is the only variant that rounds (4px) so it sits comfortably inside a sentence.

```jsx
<CodeSnippet>npm install @carbon/react</CodeSnippet>
<CodeSnippet type="multi">{dockerfile}</CodeSnippet>
```

| Prop | Type | Default |
|---|---|---|
| `type` | `'single' \| 'multi' \| 'inline'` | `'single'` |
| `feedback` | `string` | `'Copied!'` |
| `wrapText` | `boolean` | `false` |
| `children` | `string` | — |
