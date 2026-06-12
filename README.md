# Albion Market History

A lightweight static web app for comparing Albion Online market history by item, server region, city, quality, and date range.

The app calls the community-run [Albion Online Data Project](https://www.albion-online-data.com/) directly from the browser. It has no backend, database, accounts, API keys, or paid hosting requirement.

## Features

- Americas, Europe, and Asia market regions
- Searchable item catalog with tier and enchantment controls
- Correct Albion IDs for enchanted equipment and raw resources
- Price and traded-volume charts
- City and quality filtering
- Arthur's Rest, Merlyn's Rest, and Morgana's Rest market history
- Black Market history for every item lookup
- Combined averages across qualities
- One-, two-, and four-week views
- Saved chart preferences that refresh with live data when the app opens
- Artifact melding profitability comparison using historical average prices
- Resource return rate comparison calculator
- Crafting recipe costs and minimum profitable resource return rate on item cards
- Responsive desktop and mobile layout

## Local Development

Requires Node.js 20 or newer.

```bash
npm install
npm start
```

The app always runs at `http://127.0.0.1:5173` so browser-saved charts remain available between sessions.

Useful commands:

```bash
npm test
npm run build
npm run preview
npm run update:item-catalog
npm run generate:item-values
npm run generate:recipes
```

Run the two data-update commands when Albion adds or renames items. They refresh
the searchable catalog and static Item Values from the current `ao-bin-dumps`
definitions.

## Free Hosting

The included GitHub Actions workflow deploys the app to GitHub Pages.

1. Push the repository to GitHub using a `main` branch.
2. In repository settings, open **Pages**.
3. Set **Source** to **GitHub Actions**.
4. Push to `main`, or manually run the **Deploy static site** workflow.

Vite uses relative asset paths, so the site works from a repository subpath without editing a username or homepage setting.

## Data Notes

Albion market information is community-reported and can be delayed or incomplete. Rest-market data is requested from the API using its `Arthurs Rest Smugglers Network`, `Merlyns Rest Smugglers Network`, and `Morganas Rest Smugglers Network` location names. The upstream history endpoint returns approximately one month of daily data and currently ignores requested date parameters, so date ranges are applied in the browser.

## Architecture

- React for interface state and components
- Vite for development, tests, and static builds
- Chart.js for market-history charts
- A bundled item-name-to-ID catalog for fast local search
- Browser `localStorage` for chart preferences only; market responses are always refreshed

## License

MIT
