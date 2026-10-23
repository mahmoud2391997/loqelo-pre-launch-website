# Loqelo frontend demo

Run `pnpm install`, then `pnpm --filter @workspace/loqelo run dev`.
Open http://localhost:5173.

Build the static demo with `pnpm --filter @workspace/loqelo run build`.
Publish the contents of `artifacts/loqelo/dist/public` to any static host.

The demo uses the supplied Loqelo branding, product screenshots and promotional video. English, Polish and Arabic are available, including right-to-left Arabic layout. Initial language follows the browser preference.

Both forms validate required fields and show a demo confirmation. Contact details are never stored or transmitted. Analytics are disabled. Only language, country and privacy preferences are stored in the browser. No database, server, paid subscription or email service is needed.

The original backend remains in the repository for potential future integration; this frontend does not call it.
