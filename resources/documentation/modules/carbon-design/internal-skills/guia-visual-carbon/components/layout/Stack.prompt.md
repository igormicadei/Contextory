# Stack

`gap` is a spacing STEP (1–13) on the 2x Grid scale, not a pixel value — so vertical rhythm stays on-grid. Exports `Stack` and `AspectRatio`.

```jsx
<Stack gap={6}>
  <TextInput labelText="Name" />
  <TextInput labelText="Email" />
</Stack>
```

| Prop | Type | Default |
|---|---|---|
| `orientation` | `'vertical' \| 'horizontal'` | `'vertical'` |
| `gap` | `number \| string` | `5` |
