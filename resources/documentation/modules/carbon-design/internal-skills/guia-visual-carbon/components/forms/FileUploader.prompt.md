# FileUploader

A tertiary-style trigger plus a flat list of selected files on layer-01. Keep the file list visible — Carbon never hides what has been staged.

```jsx
<FileUploader labelTitle="Upload certificate" accept=".pem" files={files} onAdd={add} onDelete={remove} />
```

| Prop | Type | Default |
|---|---|---|
| `labelTitle` | `string` | `'Upload files'` |
| `labelDescription` | `string` | — |
| `buttonLabel` | `string` | `'Add file'` |
| `accept` | `string` | — |
| `multiple` | `boolean` | `false` |
| `disabled` | `boolean` | `false` |
| `files` | `Array<File \| string>` | `[]` |
| `onAdd` | `(files: File[]) => void` | — |
| `onDelete` | `(index: number) => void` | — |
