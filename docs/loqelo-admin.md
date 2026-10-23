# Loqelo website: owner notes

## Waitlist exports

Contact details are stored in the private project database. There is no public contact export URL.

From the project shell, run:

```sh
pnpm --filter @workspace/scripts run export:waitlist
```

The command writes a timestamped CSV into `generated-artifacts/`, with email, audience, country, optional account type, language, consent time/version, and sign-up time. Treat that CSV as private contact data; it is excluded from Git and deployments.

## Analytics export

Analytics are first-party and are recorded only after a visitor accepts optional analytics. The event store contains anonymous visitor IDs, country, language, audience, event type, and time. It does not receive email addresses, form text, or IP addresses.

Run:

```sh
pnpm --filter @workspace/scripts run export:analytics
```

The resulting CSV groups daily unique visitors and customer/provider sign-ups by country and includes a basic conversion percentage. Visitors who decline analytics are not counted.

## Supplied promo video

The promo video is stored in App Storage and served publicly as a read-only website asset. To upload the supplied archive again, run:

```sh
pnpm --filter @workspace/api-server run upload:loqelo-promo
```

## Editing and language

The landing-page copy and translations live in the Loqelo web artifact source. English, Polish, and Arabic are available; the initial suggestion uses country/language hints and visitors can switch language at any time.
