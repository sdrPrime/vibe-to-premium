# Vibe-to-Premium landing page (draft v1)

Static site with no build step, ready for GitHub Pages (repo root, branch deploy). Every path is relative, so it works under `https://sdrprime.github.io/vibe-to-premium/`.

- `index.html` is the landing page. The comment at the top lists every placeholder to swap before launch.
- `components.html` is the styleguide (noindex).
- `404.html` is self-contained and its home link works under a project subpath.
- `tokens.css` holds the design tokens. `styles.css` has base styles and components, `site.css` has the landing sections.
- `config.js` is the **only file to edit to wire services** (PSI key + Tally form IDs). It loads before `app.js` and `landing.js`.
- `app.js` covers theme, toast, reveal, accordion and email capture and the Tally hand-off helper. `landing.js` covers the compare slider, spots, heart counter, PSI audit and intake scoring.
- `.nojekyll`, `favicon.svg`, `og-image.png` (1200×630).
- `screenshots/` is for review only. You can delete it before publishing.

## Wiring services (all in `config.js`)

```js
window.V2P_CONFIG = {
  PSI_API_KEY: '…',                     // config.js line 6 (set)
  TALLY_RETAINER_FORM_ID: '',           // config.js line 10 (blank for launch)
  TALLY_WAITLIST_FORM_ID: '',           // config.js line 11 (blank for launch)
  CONTACT_EMAIL: 'hello@REPLACE-ME.com' // config.js line 15: REPLACE with Dhaval's real address before launch
};
```

### PageSpeed Insights key (instant audit)

Paste the key between the quotes on **`config.js` line 6**, for example `PSI_API_KEY: 'AIza...',`. `landing.js` adds `&key=...` to the PSI request only when the value isn't empty. Leave it empty and the audit uses Google's shared keyless quota, which often returns HTTP 429. When that happens the page shows a friendly fallback.

**Is it safe to commit?** Yes. A GitHub Pages site has no server, so any key the browser uses is public by design. That's fine for a Google **browser key** if, in Google Cloud Console → Credentials, it's restricted to:
- API restrictions: **PageSpeed Insights API only**
- Application restrictions: **Websites (HTTP referrers)**: `https://sdrprime.github.io/*`

Someone who copies it can only run PageSpeed audits from that origin, and the PSI API itself is free. Never put a key for a paid or billed API here.

### Tally forms

Put each form's ID between the quotes on the line shown. The ID is the part after `tally.so/r/` in the form's share link.

| Config key | Line | On-page form |
|---|---|---|
| `TALLY_RETAINER_FORM_ID` | `config.js` line 10 | Design Partner application (`form[data-intake]`) |
| `TALLY_WAITLIST_FORM_ID` | `config.js` line 11 | Weekly teardown email list (`form[data-capture]`) |

How it works:
1. The custom on-page form validates and scores the application instantly in the browser.
2. If an ID is set, the Tally embed script (`https://tally.so/widgets/embed.js`) loads. It only loads once the visitor focuses or taps that form, so the first page load stays fast.
3. A Tally popup opens with every answer passed as hidden fields. The visitor presses Submit in Tally.
4. The on-page result (tier, fit meter and next step) then appears.
5. If the script is blocked, the page opens the prefilled link `https://tally.so/r/<id>?field=value...` in a new tab instead.

With an empty ID (the launch setup), the form opens the visitor's email app instead: a `mailto:` to `CONTACT_EMAIL` with a prefilled subject and body. The application version includes every answer plus the intake score and tier. The waitlist version includes the visitor's email. The page still shows the instant intake result, along with "Your email app should open; just hit send" and a clickable fallback link.

### Contact email (blocker)

`CONTACT_EMAIL` on `config.js` line 15 is still the placeholder `hello@REPLACE-ME.com`. Put Dhaval's real address there before launch, or applications will go nowhere.

**Hidden fields to create in Tally.** Add a "Hidden fields" block and use these names exactly, all lowercase:

Design Partner application (`TALLY_RETAINER_FORM_ID`):
`app_name`, `app_url`, `builder`, `users`, `funding`, `launch`, `budget`, `email`, `intake_score`, `intake_tier`, `source`

- `builder`: `lovable` | `cursor` | `bolt` | `v0` | `other`
- `users`: `none` | `lt100` | `100-1k` | `1k+`
- `funding`: `bootstrapped-pre` | `bootstrapped-rev` | `preseed` | `seed+`
- `launch`: `live` | `30d` | `90d` | `none`
- `budget`: `yes` | `maybe` | `no`
- `intake_score`: a number from 0 to 12
- `intake_tier`: `qualified` | `maybe` | `not-yet`
- `source`: `landing-v1`

Email list (`TALLY_WAITLIST_FORM_ID`): `email`, `source` (`landing-v1-waitlist`)

Each Tally form only needs the hidden fields plus a short "Confirm & submit" page. Turn on respondent emails (autoresponder) and self email notifications in each form's Tally settings.

### Manual numbers

`data-spots-left="5"` on the sprint card in `index.html` is updated **by hand** after each sale. The dots and the "5 of 5 founding spots left" text update from it. When it reaches 0, the card switches to a waitlist.
