# 🏳️ Lipumäng — Estonian Flag Learning Game

A fun, child-friendly web app for learning country flags with country names in Estonian.

## Features

- **Two game modes**: Flag → Name (see a flag, pick the Estonian name) and Name → Flag (see an Estonian name, pick the flag)
- **Three difficulty levels**: Kerge (easy), Keskmine (medium), Raske (hard — includes visually similar flags as trick options)
- **50 countries** with Estonian names, difficulty tags, and similar-flag groupings
- **Child-friendly UI**: Big text, large tap targets, celebratory feedback, mobile-first design
- **Fully client-side**: No backend, no database, no localStorage

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` in your browser.

## Deploy to Vercel

```bash
# Option 1: Vercel CLI
npx vercel

# Option 2: Connect your GitHub repo at vercel.com
# vercel.json is already configured
```

## Project Structure

```
├── index.html              # Entry HTML with Nunito font
├── src/
│   ├── main.jsx            # React entry point
│   ├── App.jsx             # All game logic and UI
│   └── countryData.json    # 50 countries — edit this to add more
├── vite.config.js
├── vercel.json
└── package.json
```

## Editing Countries

Open `src/countryData.json` to add, remove, or modify countries:

```json
{
  "iso2": "ee",          // ISO 3166-1 alpha-2 code (used for flagcdn.com URLs)
  "name_et": "Eesti",    // Country name in Estonian
  "difficulty": "easy",  // "easy" | "medium" | "hard"
  "similarTo": []        // ISO codes of visually similar flags (used in hard mode)
}
```

Flag images are loaded from `https://flagcdn.com/w320/{iso2}.png`.

## Tech Stack

- React 18 + Vite
- Nunito font (Google Fonts)
- flagcdn.com for flag images
- Pure inline styles (no CSS framework needed)
