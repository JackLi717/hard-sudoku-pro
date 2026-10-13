# Platon Games website

This is the shared static website for Platon Sudoku and Bottle Harmony. The source of truth is this repository, not the retired ReadyTradie application. Cloudflare Pages serves `site/public` with no application server, build step, analytics script, or access gate.

## URLs

- Developer website: `https://readytradie.com/` (`https://www.readytradie.com/` also serves the site)
- Platon Sudoku game page: `https://readytradie.com/platon-sudoku/`
- Bottle Harmony game pages: `https://readytradie.com/bottle-harmony/` and `https://readytradie.com/bottle-harmony/zh/`
- Sudoku beginner guide: `https://readytradie.com/guides/how-to-play-sudoku/`
- Water sort beginner guide: `https://readytradie.com/guides/how-to-play-water-sort/`
- Platon Sudoku privacy policy: `https://readytradie.com/platon-sudoku/privacy/`
- Bottle Harmony privacy policy: `https://readytradie.com/bottle-harmony/privacy.html`
- AdMob authorized sellers: `https://readytradie.com/app-ads.txt`
- Contact: `admin@readytradie.com`

## Product page and search discovery

The homepage leads to the dedicated English Sudoku page. It uses the current ASO positioning and three genuine Android 1.0.16 (19) screenshots, copied without alteration from `.local/google-play/listing/en-GB/screenshots/phone/` into `public/platon-sudoku/images/`. Product-only styles live in `public/games.css`; the existing `styles.css` and policy layouts are preserved. Native HTML disclosures provide the FAQ without JavaScript.

The current Google Play button is explicitly a **closed test for approved testers**, linking to `https://play.google.com/apps/testing/com.platongames.sudoku`. It does not recruit or automatically approve testers. Once the app is publicly downloadable, update the homepage, game-page buttons, FAQ, availability text and metadata together to the public listing `https://play.google.com/store/apps/details?id=com.platongames.sudoku`. Confirm public access before changing this wording; do not change the existing closed-test track or opt-in link.

Homepage, product-page and guide titles, descriptions, canonical links and Open Graph metadata support discovery. `/robots.txt` permits crawling and points to `/sitemap.xml`, which lists six canonical discovery URLs: the homepage, three product-language pages and two English guides. A real `404.html` prevents missing URLs from silently returning the homepage through Pages' SPA fallback. The homepage verification meta tag belongs to the current Google Search Console HTTPS URL-prefix property; retain it after verification. Verification, sitemap submission and actual indexing are separate states, recorded in the [ASO tracker](../docs/operations/aso-tracker.md).

Use Search Console for web impressions, clicks, queries and pages; report Play external referrals separately from Play Search/Explore. No website analytics script, tracking pixel, signup form or new cookie flow is introduced. Search Console does not measure clicks on the Google Play button or establish installs; report unavailable conversion data as unavailable.

Before deploying, compare both live privacy policies and `app-ads.txt` with the local files. This website is shared: a newer live Bottle Harmony policy must not be replaced by a stale local copy. When a policy is outside the approved change, stage the **current live origin bytes** in a disposable deployment directory alongside the approved website changes, preserving the unrelated local file.

For sitemap verification, use the full `https://readytradie.com/sitemap.xml` in Search Console. Check the live test's actual source and **More info** (XML and HTTP 200), the robots report and Manual actions, as well as the sitemap report itself. An accepted submission or successful live test is not proof that the sitemap report processed it. The 13 October evening check confirmed **Success**, two discovered pages, and **Page is indexed** for the homepage and Sudoku page. The live sitemap also includes Bottle Harmony's English and Simplified Chinese pages; their indexing is tracked separately. Current status and follow-up belong in the ASO tracker.

## AI discovery and product facts

The homepage identifies Platon Games with `Organization` and `WebSite` JSON-LD. The Sudoku page and both Bottle Harmony language pages use `WebPage` and a shared game identity typed as `VideoGame` / `MobileApplication`. Their visible **Who it's for** sections describe the intended players, existing gameplay and installation conditions. Structured descriptions, features, screenshots and closed-test restrictions must remain consistent with the visible page. Preserve the distinction between Sudoku's approved-testers-only access and Bottle Harmony's existing group → test opt-in → installation steps.

These semantic annotations support machine understanding; they do not establish eligibility for Google's software-app rich results or guarantee AI recommendations. Do not add invented ratings, reviews, prices or public download offers to satisfy a validator. `/robots.txt` already permits search crawlers; there is no need to add an AI-specific file as a prerequisite. A simulated crawler User-Agent returning 200 is an accessibility check, not evidence that an AI provider has visited. Record verified provider visits only from trustworthy platform reports or verified crawler logs.

`public/bottle-harmony/` now includes the current deployed English/Chinese product pages, CSS and images, reconciled from the Bottle Harmony repository against the Pages origin. Shared-site publication uses this repository's complete `public` tree. Future product-file refreshes from the game repository must merge the approved audience copy and JSON-LD instead of overwriting them with an older copy. The privacy policy still follows the dedicated policy-source workflow below; preserve newer live policy bytes when it is outside the approved change.

On 13 October 2026, deployment `3441abf1` published the approved audience descriptions and semantic metadata on the four discovery pages. The upload preserved every other current origin file byte-for-byte, including both policies, existing screenshots, styles and crawl files. Source and live checks covered JSON validity, visible facts, internal links, canonical URLs, 320/768/1280-pixel layouts, public HTTP responses and real 404s. Google accepted indexing requests for both Bottle Harmony language pages; actual indexing remains separate from that acceptance and is recorded in the ASO tracker.

## Organic search and guides

The approved SEO scope is the existing four discovery pages plus two English guides. The homepage links to both guides; each product links to its relevant guide, and the guides link to the product pages and each other. Titles and prominent headings state the puzzle type and page purpose, without promising public downloads during closed testing. Product pages and guides include visible breadcrumbs with matching `BreadcrumbList` data. Guide `Article` data identifies Platon Games as the author and publisher; it does not invent qualifications, reviews or ratings.

The Sudoku guide uses an unchanged existing content puzzle and verifies that the illustrated cell has exactly one candidate. The water-sort guide labels all colors in text and gives a complete, mechanically checked three-pour miniature example. The guides are static explanations, with no playable web game, executable client script, gated content or new analytics. Keep these worked examples correct when editing their prose or markup.

Canonical URLs use `https://readytradie.com/` and descriptive directory paths. The `www` alias retains the same canonical preference. `_headers` sets `noindex` only on the stable Pages origin and its deployment/branch subdomains, leaving the production domain indexable. Do not block those duplicate origins in robots.txt before a crawler can read the noindex header. Existing images use one-day browser caching, without an immutable promise for unversioned files; HTML and unversioned styles continue to revalidate. Bottle Harmony CSS references use the CSS SHA-256's first twelve characters as a query version and must be updated together after CSS changes.

Run `npm run check` from `site/` to verify canonical pages, unique metadata, language reciprocals, structured facts, local links/anchors, the worked examples and the recovery worker tests. Check the six pages at mobile, tablet and desktop widths before publishing. Preserve both live policies, `app-ads.txt`, screenshots and `/sw.js` when deploying.

Track Search Console Web impressions, clicks, query intent, CTR and landing pages in the [ASO tracker](../docs/operations/aso-tracker.md). Separate brand queries from rules/learning queries and website search from Play acquisition. The query themes are editorial hypotheses, not measured keyword volumes. Use complete reporting weeks when data is available; indexing acceptance and lab performance scores are not evidence of traffic or install growth. Expand beyond these two guides only after reviewing real query gaps and agreeing the new content scope.

References: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [titles](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet), [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [Cloudflare header rules](https://developers.cloudflare.com/pages/configuration/headers/).

The complete first SEO round was published on 13 October 2026 as deployment `0aa0d6c6`. Six-page metadata/link/example checks and 320/768/1280-pixel layouts passed. Production pages remained indexable while Pages origins carried noindex; images used the intended caching headers. The existing sitemap was submitted once after adding the guides, and Search Console reported **Success / 6 discovered pages**. Actual indexing, performance reports and traffic follow-up are recorded in the ASO tracker. Both live policies, advertising authorization, screenshots and the worker recovery were preserved.

## Retired ReadyTradie cache recovery

`public/sw.js` deliberately replaces the retired ReadyTradie worker at its original root-scoped update URL. It activates immediately, takes over affected windows, unregisters its own registration and reloads those controlled windows at their existing URL. It has no fetch handler, precache, cache deletion or website-data reset. Current site pages do not register it. Keep this recovery URL available for returning browsers with an older registration, and preserve its JavaScript MIME type and `Cache-Control: no-store` headers; changing its URL would leave the old worker unaffected. The response is excluded from search indexing.

Run `npm test` from `site/` for its lifecycle, exact-URL recovery, closed-tab and already-unregistered cases. This follows [Chrome's service-worker recovery approach](https://developer.chrome.com/docs/workbox/remove-buggy-service-workers), with no new caching behavior for the static website.

Deployment `578e49f8` published this recovery on 13 October 2026. The affected Chrome session was reproduced before publication and recovered to the real Sudoku page afterward. All 21 public files matched the upload snapshot; existing product pages, policies and assets were preserved. The four worker tests and targeted ESLint checks passed.

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

## Bottle Harmony

The Bottle Harmony page is copied from `/Users/lixiaohu/work/bottle-harmony/store/website/bottle-harmony/privacy.html`, generated from that game’s policy source. Refresh that file with `npm run brand:render` in the Bottle Harmony repository, then copy it into `site/public/bottle-harmony/privacy.html` before deploying. The games retain separate code and builds; this project shares website hosting only. This page describes the offline, ad-free game and must not inherit the Sudoku advertising policy. The 13 October SEO commit records the existing 10 October live origin policy as the source baseline, without changing the published policy; the older local copy was preserved in the working directory and must not overwrite that baseline during deployment.

On 8 October 2026, Bottle Harmony’s English-only policy was deployed as Pages deployment `a1dd538e`. The upload snapshot preserved the existing live Sudoku policy from 30 September; the newer local Sudoku policy dated 4 October was not included in this Bottle Harmony deployment. Existing homepage, stylesheet and app-ads.txt content were preserved and checked after deployment. Pages redirects the `.html` policy URL to `/bottle-harmony/privacy`; both resolve publicly.

On 9 October 2026, the updated Sudoku policy (dated 8 October) was published as Pages deployment `adb483e4`. A temporary deployment snapshot retained the live homepage, stylesheet, app-ads.txt and Bottle Harmony policy; these files were checked against their prior live bytes. The Sudoku policy now describes optional Firebase Analytics and Crashlytics with independent choices, both off by default. The canonical policy URL is unchanged.

On 13 October 2026, the approved homepage, Sudoku product page, real screenshots, crawl files and Search Console homepage tag were published as Pages deployment `37f772d2`. Desktop and 320/390/768-pixel layout checks, internal links, image sources, native FAQ and SEO metadata passed. The public root/`www` site and game page serve successfully; missing paths return a real 404. The deployment snapshot retained the current **10 October** live Bottle Harmony policy rather than this checkout's older 8 October copy. Both live privacy policies and `app-ads.txt` were verified byte-for-byte against their pre-deployment origin content. No DNS, mail, Play release or tester configuration was changed. Search Console ownership was verified with the HTML tag; sitemap and indexing progress are maintained in the ASO tracker rather than inferred from deployment success.
