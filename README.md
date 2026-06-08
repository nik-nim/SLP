# PragyaSuchi Grocery App

A Hindi/English smart grocery list PWA built as a static Firebase-hosted app.

## What was updated
- Extracted inline CSS from `y/index.html` into `y/styles.css`
- Extracted inline JavaScript from `y/index.html` into `y/app.js`
- Added runtime environment support via `y/env.example.js`
- Added `.env.example` and updated `.gitignore` to ignore local env files

## Environment setup
1. Copy `y/env.example.js` to `y/env.js`.
2. Add your `GEMINI_API_KEY` in `y/env.js`.
3. Optionally customize `FIREBASE_CONFIG` inside `y/env.js`.

## Notes
- `y/env.js` is ignored by git so private keys remain local.
- `app.js` will automatically load `env.js` if present.

## Suggested improvements
- Add a build step with bundling (Vite, Webpack, or Parcel) to better manage assets.
- Move the Gemini bill scan API call to a secure backend service instead of client-side.
- Add stronger validation and sanitization for saved list loading.
- Improve the item parser to better handle quantities and Hindi/English mixed text.
- Add unit tests for core list and budget logic.
- Add Firebase rules or authentication checks for saved lists.

## Git note
- Git was not available in this environment, so a local repo initialization and remote GitHub creation could not be performed here.
