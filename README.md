# Angadi - storefront-web

**Angadi** is "shop" in Telugu, Tamil and Kannada. In the town this serves it
needs no explaining; outside it, it sounds like a name rather than a
description. The mark is a shopfront - a scalloped awning over a doorway -
because every delivery app in India already owns the scooter and the
lightning bolt, and a shop is what this is actually about. It lives in
`src/components/Brand.tsx` and the favicon is generated from the same SVG,
so the mark has exactly one definition.

The customer app. Vite + React 18 + TypeScript, talking to **angadi-api** (the storefront endpoints under `/api/store/v1`)
on :8081. Runs on **:5174**, next to the ops console on :5173.

A PWA-shaped SPA rather than Next.js: this is an app behind a search box, not
a set of pages you win SEO with, and a plain SPA is a much smaller dependency
tree and a faster dev loop. If SEO on product pages matters later, that is a
reason to move — not before.

---

## Run it

Needs **Node 20+**, with `angadi-api` already running.

```bash
npm install
npm run dev          # http://localhost:5174
```

Vite proxies `/api` to `http://localhost:8081`, so the browser makes
same-origin calls: no CORS preflight on every request, and production (both
behind one reverse proxy) behaves like development. Point it elsewhere with
`STORE_API=http://host:8081 npm run dev`.

### Signing in

There is no signup form. Type any Indian mobile number, get a code, type it
in — a number we have never seen gets an account at that moment. The demo
customers are `9000000001` through `9000000006`; any other number works too
and creates a new shopper.

**The code prints in the storefront-api console.** Search that log for
`MESSAGE (dev only)`.

---

## The screens

| Route | What it is |
|---|---|
| `/` | Home: offers, categories, shops near you, one shop given room, and what people are buying. |
| `/c/:slug` | One category, with a rail across the others so nobody has to go back to change their mind. |
| `/shops` | Every shop, open ones first, sorted by distance if location was allowed. |
| `/shops/:slug` | One shop from the inside, with **that shop's** prices — not the town's cheapest. |
| `/search` | English name, local name or brand. |
| `/cart` | The basket, grouped by shop. |
| `/checkout` | Where, when, how to pay — and a button that says what is missing. |
| `/orders`, `/orders/:id` | Your orders and live tracking, including answering a change found while shopping. |
| `/addresses` | Saved addresses, each checked against the delivery polygon when saved. |
| `/item/:kind/:slug` | The full product page: gallery, ingredients, storage, origin, and every shop that sells it. Has a URL, so it can be shared. |
| `/terms`, `/privacy` | A working first draft, written plainly. Needs a lawyer before launch - see the note at the top of `LegalPage.tsx`. |
| `/signin` | Phone, code, done. |

Nothing is behind a route guard. Browsing is open; the pages that need an
account say so and offer a sign-in button, which beats being bounced to a
login screen with no explanation. The wall goes up at the first write —
adding to the basket — and we remember where you were, so verifying a code
drops you back on the same product.

---

## Design notes

The palette, type scale and spacing live in `tailwind.config.ts`; the
component classes live in `src/styles/index.css`. Change them there, not in
individual components.

**It is deliberately nothing like the ops console.** The console is a cool
grey instrument panel built to be read for eight hours. This is a shop: warm
cream, generous spacing, the food louder than the interface, and one strong
colour reserved for the button that adds something to a basket. Green reads
as fresh produce in India without anyone being told, and it is not the blue
every delivery app uses.

**One card component, two kinds of thing.** A `Tile` is the same record
whether it is a single product or a group of sizes, and `ProductTile` renders
both. That is what stops a grid looking like two apps stitched together, and
it means the day something else gets grouped, no new component is needed.

**The product sheet makes both choices for you.** Smallest size, cheapest
shop that actually has it and is open. Almost nobody changes either; the ones
who do are the ones who care, so the choice is visible but never in the way.

**Images are public_ids, never URLs.** The server sends a Cloudinary
`public_id`; `src/lib/media.ts` builds the URL at render time with
`f_auto,q_auto,dpr_auto` and a crop sized to the box actually being drawn.
The component knows how big the box is; the server does not. See the header
of that file for what each parameter buys.

**No photograph is not a broken photograph.** With no image — which is every
item on day one — `Art` paints a deterministic wash of two warm colours
derived from the item's own name, with its initials on it. The same tomato is
the same colour on every screen and every reload, so a grid reads as designed
rather than as missing data. Nothing in this app waits for a photo shoot.

**One `Price` component, everywhere.** What you pay, the struck-out MRP, and
the percent saved - in that order and that weight, defined once in
`ProductTile.tsx`. No card can shout the saving louder than the price, and a
strike-through can never go missing on one screen and not another. The old
price only appears when there is a real one: an MRP equal to the price is
noise, and a fake strike-through is the fastest way to stop being believed.

**Rails use `items-stretch`.** Without it a flex child sizes to its own
content, so a card with a two-line name is taller than one with a single
line and the row looks broken. Every tile also has a fixed-height name block,
so prices across a row sit on one baseline.

**Search answers while you type.** `SearchBox` debounces 180ms, keeps the
previous results on screen while the next load so the list never blinks, and
returns shops and products together - somebody typing "tul" is as likely to
want the Tulasi flower stall as tulsi leaves. Arrow keys and Enter work.

**Money never touches a float.** Prices cross the wire as integer paise and
stay that way until `money()` draws them.

---

## Things worth knowing before you change something

**Cart mutations return the whole cart.** Every one of them writes straight
into the query cache rather than invalidating, so the header count, the
totals and the lines cannot disagree for a frame.

**Refresh is single-flight** (`src/lib/api.ts`). The home page fires several
queries at once; on a stale token that would be several refresh requests, and
because refresh tokens rotate, all but the first would present a used token —
which the server correctly treats as theft and answers by revoking the whole
family. The shopper would be signed out mid-basket.

**Order tracking polls, then stops.** `useOrder` refetches every 30 seconds
while an order is moving and returns `false` once it is delivered or
cancelled. Polling a finished order forever is how a phone battery gets
blamed on a grocery app.

**Location is optional everywhere.** It only sorts shops by distance and
shows "1.2 km away". Nothing asks for it on load — the prompt appears when
somebody taps the location chip, which is the moment it makes sense to them.
