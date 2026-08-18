# OneMillionLines privacy page integration

Target repository: `One-Million-Lines/onemillionlines`

Target files:
- `react/src/pages/PrivacyUnlimitedPDF.tsx`
- `react/src/App.tsx`

Add this import in `react/src/App.tsx` alongside the other privacy page imports:

```tsx
import PrivacyUnlimitedPDF from "./pages/PrivacyUnlimitedPDF";
```

Add this route above the catch-all `*` route:

```tsx
<Route path="/privacy/unlimitedpdf" element={<PrivacyUnlimitedPDF />} />
```

Public URL:

https://onemillionlines.com/privacy/unlimitedpdf
