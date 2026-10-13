# Platon Games website

This is the long-term static website for Platon Sudoku. The source of truth is this repository, not the retired ReadyTradie application. Cloudflare Pages serves `site/public` with no application server, build step, analytics script, or access gate.

## URLs

- Developer website: `https://readytradie.com/` (`https://www.readytradie.com/` also serves the site)
- Platon Sudoku game page: `https://readytradie.com/platon-sudoku/`
- Platon Sudoku privacy policy: `https://readytradie.com/platon-sudoku/privacy/`
- AdMob authorized sellers: `https://readytradie.com/app-ads.txt`
- Contact: `admin@readytradie.com`

## Product page and search discovery

The homepage leads to the dedicated English Sudoku page. It uses the current ASO positioning and three genuine Android 1.0.16 (19) screenshots, copied without alteration from `.local/google-play/listing/en-GB/screenshots/phone/` into `public/platon-sudoku/images/`. Product-only styles live in `public/games.css`; the existing `styles.css` and policy layouts are preserved. Native HTML disclosures provide the FAQ without JavaScript.

The current Google Play button is explicitly a **closed test for approved testers**, linking to `https://play.google.com/apps/testing/com.platongames.sudoku`. It does not recruit or automatically approve testers. Once the app is publicly downloadable, update the homepage, game-page buttons, FAQ, availability text and metadata together to the public listing `https://play.google.com/store/apps/details?id=com.platongames.sudoku`. Confirm public access before changing this wording; do not change the existing closed-test track or opt-in link.

Homepage and game-page titles, descriptions, canonical links and Open Graph metadata support discovery. `/robots.txt` permits crawling and points to `/sitemap.xml`, which lists these two product-discovery URLs. A real `404.html` prevents missing URLs from silently returning the homepage through Pages' SPA fallback. The homepage verification meta tag belongs to the current Google Search Console HTTPS URL-prefix property; retain it after verification. Verification, sitemap submission and actual indexing are separate states, recorded in the [ASO tracker](../docs/operations/aso-tracker.md).

Use Search Console for web impressions, clicks, queries and pages; report Play external referrals separately from Play Search/Explore. No website analytics script, tracking pixel, signup form or new cookie flow is introduced. Search Console does not measure clicks on the Google Play button or establish installs; report unavailable conversion data as unavailable.

Before deploying, compare both live privacy policies and `app-ads.txt` with the local files. This website is shared: a newer live Bottle Harmony policy must not be replaced by a stale local copy. When a policy is outside the approved change, stage the **current live origin bytes** in a disposable deployment directory alongside the approved website changes, preserving the unrelated local file.

## Local preview

From `site/`, run `npm ci` once and `npm run dev`. Wrangler serves the exact `public` directory. The site also works as plain static HTML; do not add analytics, forms, or third-party scripts without updating the privacy policy.

## Deploy

1. In Cloudflare, keep the `readytradie.com` DNS zone and all mail-related DNS records under the account you control.
2. Use the Cloudflare Pages project `platon-games-site`, with production branch `main`. It was created as a Direct Upload project on 30 September 2026; Cloudflare does not allow converting this project to Git integration later. Do not deploy the old `mygig-frontend` directory.
3. From `site/`, run `npm ci` and `npm run deploy` after signing in with `npx wrangler login` or setting a scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` outside the repository. Never commit credentials.
4. Keep `readytradie.com` and `www.readytradie.com` attached to `platon-games-site` under **Custom domains**. Both DNS CNAME records point to `platon-games-site.pages.dev`. The root domain was detached from `mygig-frontend` when this site replaced it; that old Pages project was not deleted. Preserve MX, SPF, DKIM, and DMARC records for `admin@readytradie.com`.
5. Verify the URLs above and the `www` homepage, plus `/robots.txt`, `/sitemap.xml` and a nonexistent path (404). `/app-ads.txt` must return the exact single line in `public/app-ads.txt` as plain text; the privacy page must be reachable without login. If a browser ad blocker blocks `/app-ads.txt`, check the HTTP response independently instead of changing the path.
6. Once the domain is live, set the Google Play developer website to `https://readytradie.com/` and privacy policy to `https://readytradie.com/platon-sudoku/privacy/`. Update the AdMob privacy-message policy URL. When the app can be found in Play, link it in AdMob and request an `app-ads.txt` check.

The AdMob publisher line came from this account's AdMob **Set up app-ads.txt** dialog on 30 September 2026. If the publisher account changes, update the file from the new account's own snippet before deploying. Google may take up to 24 hours to detect a new Play developer website and crawl the file. On 30 September, the Play developer website was published and its privacy URL was sent for review; the AdMob consent-message privacy URL was updated while the message remained a draft.

On 9 October 2026, the updated Sudoku policy (dated 8 October) was published as Pages deployment `adb483e4`. A temporary deployment snapshot retained the live homepage, stylesheet, app-ads.txt and Bottle Harmony policy; these files were checked against their prior live bytes. The Sudoku policy now describes optional Firebase Analytics and Crashlytics with independent choices, both off by default. The canonical policy URL is unchanged.

On 13 October 2026, the approved homepage, Sudoku product page, real screenshots, crawl files and Search Console homepage tag were published as Pages deployment `37f772d2`. Desktop and 320/390/768-pixel layout checks, internal links, image sources, native FAQ and SEO metadata passed. The public root/`www` site and game page serve successfully; missing paths return a real 404. The deployment snapshot retained the current **10 October** live Bottle Harmony policy rather than this checkout's older 8 October copy. Both live privacy policies and `app-ads.txt` were verified byte-for-byte against their pre-deployment origin content. No DNS, mail, Play release or tester configuration was changed. Search Console ownership was verified with the HTML tag; sitemap and indexing progress are maintained in the ASO tracker rather than inferred from deployment success.
