# PragyaSuchi Grocery App

A Hindi/English smart grocery list PWA built for Firebase hosting and improved offline/mobile usage.

## What is included
- `y/index.html`: main app shell and UI markup
- `y/styles.css`: modern minimalist theming, animations, and responsive styling
- `y/app.js`: app behavior, theme toggle, login/logout, list rendering, voice/AI input, Firebase saving, and print view
- `y/env.js`: local runtime config file for private API keys and Firebase settings
- `y/env.example.js`: safe template to copy for your own environment values
- `y/manifest.json`: PWA metadata for installability
- `y/sw.js`: service worker for offline caching
- `.gitignore`: ignores local runtime secrets and environment files

## What was improved
- Separated inline HTML/CSS/JS into clean source files
- Added safe environment handling for API keys
- Added dark/light theme toggle with persistence
- Added a modern glassmorphism UI with motion and hover effects
- Added Firebase login and cloud list save/load scaffolding
- Added GitHub repo setup and cleaned secret exposure
- Removed duplicate file and cleaned up project structure

## Environment setup
1. Copy `y/env.example.js` to `y/env.js`.
2. Replace the placeholder values with your own keys.
   - `GEMINI_API_KEY`
   - `FIREBASE_CONFIG.apiKey`
   - `FIREBASE_CONFIG.authDomain`
   - `FIREBASE_CONFIG.projectId`
   - `FIREBASE_CONFIG.storageBucket`
   - `FIREBASE_CONFIG.messagingSenderId`
   - `FIREBASE_CONFIG.appId`
3. Open `y/index.html` in a browser or deploy on Firebase.

## Security notes
- Keep `y/env.js` local and do not commit it with real secrets.
- The repository is safe for GitHub as long as no real API keys are included in tracked files.
- A private repo helps with access control, but removing secrets is the primary safety step.

## Optional local commands
```powershell
cd "c:\Users\Nim\Desktop\New_folder\grocery project"
# Run app locally by using a static file server, or use Firebase Hosting.
```

## Suggested improvements
- Move Gemini requests to a secure backend function.
- Improve AI item parsing and error handling.
- Add offline-first caching for categories and lists.
- Add mobile-optimized list interactions and accessible focus states.
