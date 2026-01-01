# EzApply: ADHD Apply Tracker

A Chrome Extension to help users with ADHD capture and track job applications with minimal friction and gamified feedback.

## Features

- **Side Panel Capture**: Quick form to capture job applications with auto-fill from current page
- **Kanban Dashboard**: Visual board with three columns (Inbox, Applied, Archive)
- **Drag & Drop**: Move jobs between columns with smooth animations
- **Gamified Feedback**: Confetti celebration when moving jobs to "Applied"!
- **Priority Tracking**: Mark high-priority jobs with 🔥 icon
- **Local Storage**: All data stored locally using Chrome's storage API

## Tech Stack

- React + Vite
- TypeScript
- Tailwind CSS
- @dnd-kit for drag & drop
- canvas-confetti for celebrations
- lucide-react for icons

## Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
```

## Loading the Extension

1. Build the extension: `npm run build`
2. Open Chrome and navigate to `chrome://extensions/`
3. Enable "Developer mode" (toggle in top right)
4. Click "Load unpacked"
5. Select the `dist` folder from this project

## Usage

1. **Capture Jobs**: Click the extension icon to open the side panel, fill in job details, and click "Save to Inbox"
2. **View Dashboard**: Click the dashboard icon in the side panel (or open `dashboard.html` directly)
3. **Track Progress**: Drag jobs from Inbox → Applied → Archive
4. **Celebrate**: Moving a job to "Applied" triggers confetti! 🎉

## Icons

Place your extension icons in the `icons/` directory:
- `icon16.png` (16x16 pixels)
- `icon48.png` (48x48 pixels)
- `icon128.png` (128x128 pixels)

You can create placeholder icons or use an icon generator tool.

