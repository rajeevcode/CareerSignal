# CareerSignal Component System

## Layout
- `AppShell` — sidebar + top bar + mobile drawer
- `SidebarNav` — candidate navigation links
- `PageHeader` — title, subtitle, actions slot
- `MobileDrawer` — nav + filters on mobile

## Metrics & scores
- `MetricCard` — `{ label, value, icon?, trend?, accent? }`
- `ScoreRing` — `{ score, max?, label, size? }`
- `ScoreBar` — `{ score, label, weight? }`
- `SignalBadge` — `{ score }` → band label + color from tokens

## Content
- `JobCard` — job + match + signal + why + missing + badges
- `EmptyState` — `{ title, description, action? }`
- `LoadingState` — `{ message?, steps? }`
- `UploadDropzone` — drag-drop file upload

## Tracker
- `PipelineColumn` — `{ stage, applications[] }`
- `ApplicationCard` — compact card for board view

## Usage
```tsx
import { MetricCard } from '@/components/ui/MetricCard';
import { SignalBadge } from '@/components/ui/SignalBadge';

<MetricCard label="CV Score" value="78/100" accent="primary" />
<SignalBadge score={84} />
```

All components use design tokens from `globals.css` — no raw `indigo-600` in new code.
