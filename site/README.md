# Platon Games website

This is the shared static website for Platon Sudoku and Bottle Harmony. The source of truth is this repository, not the retired ReadyTradie application. Cloudflare Pages serves `site/public` with no application server, build step, analytics script, or access gate.

## URLs

- Developer website: `https://readytradie.com/` (`https://www.readytradie.com/` also serves the site)
- Platon Sudoku game pages: English `https://readytradie.com/platon-sudoku/`, German `/platon-sudoku/de/`, Japanese `/platon-sudoku/ja/`, Korean `/platon-sudoku/ko/`, French `/platon-sudoku/fr/`, Spanish `/platon-sudoku/es/`, Brazilian Portuguese `/platon-sudoku/pt-br/`, Traditional Chinese `/platon-sudoku/zh-hant/`
- Additional Sudoku language paths: `it/`, `id/`, `ru/`, `zh-hans/`, `vi/`, `hi/`, `uk/`, `ro/`, `fi/`, `ar/`, `tr/`, `th/`, `pl/`, `nl/`, `ms/`, `fil/` under `/platon-sudoku/`
- Bottle Harmony game pages: `https://readytradie.com/bottle-harmony/` and `https://readytradie.com/bottle-harmony/zh/`
- Sudoku beginner guide: `https://readytradie.com/guides/how-to-play-sudoku/`
- Water sort beginner guide: `https://readytradie.com/guides/how-to-play-water-sort/`
- Platon Sudoku privacy policy: `https://readytradie.com/platon-sudoku/privacy/`
- Bottle Harmony privacy policy: `https://readytradie.com/bottle-harmony/privacy.html`
- AdMob authorized sellers: `https://readytradie.com/app-ads.txt`
- Contact: `admin@readytradie.com`

## Product page and search discovery

The homepage leads to 24 localized Sudoku product pages. They use the current ASO positioning and genuine Android 1.0.16 (19) screenshots. English images remain in `public/platon-sudoku/images/`; German, Japanese, Korean, French, Spanish, Brazilian Portuguese and Traditional Chinese images are copied without alteration from the matching `.local/google-play/listing/<locale>/screenshots/phone/` into the matching `de/`, `ja/`, `ko/`, `fr/`, `es/`, `pt-br/` and `zh-hant/` image subdirectories. Product-only styles live in `public/games.css`; the existing `styles.css` and policy layouts are preserved. Native HTML disclosures provide the FAQ without JavaScript.

The Sudoku buttons and locally hosted QR code point to `https://play.google.com/store/apps/details?id=com.platongames.sudoku`. Public product copy is written for long-term use: describe the game and link to Google Play for device/region availability. Do not put temporary review, submission, approval or launch-progress notices in visible copy, QR captions, FAQs, descriptions or structured data. Keep operational release status in internal release documents; a website update does not establish app availability. The existing closed-test track and opt-in link are unchanged.

The approved scope for this update is Sudoku content only: evergreen product copy, Google Play links and QR code, English/German/Japanese/Korean/French/Spanish/Brazilian Portuguese/Traditional Chinese product pages, corresponding screenshots, language navigation, sitemap and checks. Keep the existing visual design. Do not change Bottle Harmony or either privacy policy. Each language has its own canonical URL, reciprocal `hreflang` links (with English as `x-default`), translated product text and image descriptions. Links to the existing English guide and policy are labeled as English on non-English pages. The shared QR PNG encodes the exact public listing URL, without a third-party QR service, tracking parameter or executable script.

The approved follow-up batch adds French (`fr`), Spanish (`es`), Brazilian Portuguese (`pt-BR`) and Traditional Chinese (`zh-Hant`) product pages, with the same design and genuine localized screenshots. Existing Sudoku pages and the homepage only gain the corresponding language navigation and alternate links; the sitemap and checks expand to 13 discovery URLs. Bottle Harmony and both policies remain outside this batch. Each new page receives its own canonical URL, translated metadata, visible copy, FAQ and image descriptions.

The next approved batch completes the remaining 16 app languages: Italian (`it`), Indonesian (`id`), Russian (`ru`), Simplified Chinese (`zh-Hans`, URL `zh-hans`), Vietnamese (`vi`), Hindi (`hi`), Ukrainian (`uk`), Romanian (`ro`), Finnish (`fi`), Arabic (`ar`), Turkish (`tr`), Thai (`th`), Polish (`pl`), Dutch (`nl`), Malay (`ms`) and Filipino (`fil`). Each has translated product copy, metadata, FAQ, image descriptions, its own canonical and reciprocal alternates for all 24 versions. The three unchanged real app captures per language come from the corresponding existing store-listing directory. Existing guides and policies are linked with their English language identified; they are not translated in this batch. Arabic uses RTL layout, and Arabic, Hindi, Thai and Chinese headings receive appropriate spacing and line height.

The homepage Sudoku entry and all 24 product pages use a collapsed native HTML language dropdown with ordinary crawlable links, current-language identification, a scrollable panel and at least 44-pixel link targets. It works without JavaScript, cookies, automatic redirects or language detection. Opening it overlays the page instead of moving the content. A CSS content fingerprint in the stylesheet URL prevents previously cached product styles from leaving the new menu unstyled. Preserve the existing design, Bottle Harmony, both privacy policies and all unrelated unfinished app work. Static checks cover 29 discovery pages, reciprocal alternates, menu choices, RTL direction, assets and existing examples. Browser verification covers all 25 affected pages at 320, 390, 768 and 1280 pixels, including overflow, loaded hero images, menu bounds, default collapsed state, scrolling and target sizes. Translation uses the existing localized ASO material and author review; it is not an independent native-speaker review.

On 18 October 2026, deployment `ff5ab8ca` applied the user's evergreen-copy correction: removed temporary review/approval/download-opening notices from all 24 Sudoku product pages, homepage Sudoku entry, guide CTA, QR captions, FAQ, descriptions and structured data. Download FAQs now link to Google Play for device/region availability. All 26 changed HTML pages passed source and staged checks; the 117 deployed files and 24 public product URLs were verified, preserving 91 existing public files byte-for-byte. Existing gameplay copy, images, menus, Bottle Harmony and both policies remain unchanged. This change does not claim the app is publicly available.

On 18 October 2026, deployment `7617c2d4` published the completed 24-language site and compact menu. All 117 public deployment files match the approved package; 42 existing origin files, including Bottle Harmony and both policies, remain byte-identical. The custom domain serves all 24 product URLs and the 29-URL sitemap, with the existing Cloudflare email-protection transformation accounted for in DOM comparison. The refreshed CSS fingerprint was verified in a browser that had cached the old styles: the 390-pixel menu loads correctly, starts collapsed, expands to 24 links and produces no horizontal overflow. Keyboard toggling, navigation to the last menu item and all 16 new download FAQs passed. Existing eight-language product copy, structured data and images were preserved. No Search Console requests were made in this website batch.

On 18 October 2026, deployment `99793d49` published the four-language expansion. All nine affected pages (homepage plus eight Sudoku languages) passed 320/390/768/1280-pixel browser checks for overflow, image loading, language navigation and native FAQ behavior; actual mobile viewport dimensions were also checked. The 12 new screenshot files match their source app captures exactly. Source and staged checks cover all 13 discovery URLs and eight reciprocal language versions. All 53 public deployment files match the approved upload; 30 pre-existing origin files, including Bottle Harmony and both policies, were preserved byte-for-byte. The public URLs return HTTP 200 without noindex, the www alias works and missing paths return 404. Search Console accepted the existing sitemap URL and reports Success / 13 discovered pages; individual indexing requests and actual indexing are separate states.

On 18 October 2026, deployment `485ccfcf` published this Sudoku release update to the existing site. The homepage and four Sudoku product pages passed 320/390/768/1280-pixel browser checks, including real rendered QR decoding and native FAQ behavior. Local and deployment checks covered nine sitemap pages, canonical URLs, reciprocal languages, structured facts and links; the four recovery-worker tests passed. All 37 deployed public files matched the validated upload. The 19 unchanged origin files, including the newer live Bottle Harmony pages, both privacy policies, advertising authorization and recovery worker, were preserved byte-for-byte; unrelated repository copies remain untouched. Public pages returned HTTP 200 without noindex, the www alias worked and a missing path returned 404. Search indexing and public Play download availability are not established by website publication.

Homepage, product-page and guide titles, descriptions, canonical links and Open Graph metadata support discovery. `/robots.txt` permits crawling and points to `/sitemap.xml`, which lists 29 canonical discovery URLs: the homepage, 24 Sudoku language pages, two Bottle Harmony language pages and two English guides. A real `404.html` prevents missing URLs from silently returning the homepage through Pages' SPA fallback. The homepage verification meta tag belongs to the current Google Search Console HTTPS URL-prefix property; retain it after verification. Verification, sitemap submission and actual indexing are separate states, recorded in the [ASO tracker](../docs/operations/aso-tracker.md).

Use Search Console for web impressions, clicks, queries and pages; report Play external referrals separately from Play Search/Explore. No website analytics script, tracking pixel, signup form or new cookie flow is introduced. Search Console does not measure clicks on the Google Play button or establish installs; report unavailable conversion data as unavailable.

Before deploying, compare both live privacy policies and `app-ads.txt` with the local files. This website is shared: a newer live Bottle Harmony policy must not be replaced by a stale local copy. When a policy is outside the approved change, stage the **current live origin bytes** in a disposable deployment directory alongside the approved website changes, preserving the unrelated local file.

For sitemap verification, use the full `https://readytradie.com/sitemap.xml` in Search Console. Check the live test's actual source and **More info** (XML and HTTP 200), the robots report and Manual actions, as well as the sitemap report itself. An accepted submission or successful live test is not proof that the sitemap report processed it. The 13 October evening check confirmed **Success**, two discovered pages, and **Page is indexed** for the homepage and Sudoku page. The live sitemap also includes Bottle Harmony's English and Simplified Chinese pages; their indexing is tracked separately. Current status and follow-up belong in the ASO tracker.

## AI discovery and product facts

The homepage identifies Platon Games with `Organization` and `WebSite` JSON-LD. The Sudoku page and both Bottle Harmony language pages use `WebPage` and a shared game identity typed as `VideoGame` / `MobileApplication`. Their visible **Who it's for** sections describe the intended players, existing gameplay and installation conditions. Structured descriptions, features, screenshots and availability must remain consistent with the visible page. Keep Sudoku's product copy evergreen and retain Bottle Harmony's existing group → test opt-in → installation steps.

These semantic annotations support machine understanding; they do not establish eligibility for Google's software-app rich results or guarantee AI recommendations. Do not add invented ratings, reviews, prices or public download offers to satisfy a validator. `/robots.txt` already permits search crawlers; there is no need to add an AI-specific file as a prerequisite. A simulated crawler User-Agent returning 200 is an accessibility check, not evidence that an AI provider has visited. Record verified provider visits only from trustworthy platform reports or verified crawler logs.

`public/bottle-harmony/` now includes the current deployed English/Chinese product pages, CSS and images, reconciled from the Bottle Harmony repository against the Pages origin. Shared-site publication uses this repository's complete `public` tree. Future product-file refreshes from the game repository must merge the approved audience copy and JSON-LD instead of overwriting them with an older copy. The privacy policy still follows the dedicated policy-source workflow below; preserve newer live policy bytes when it is outside the approved change.

On 13 October 2026, deployment `3441abf1` published the approved audience descriptions and semantic metadata on the four discovery pages. The upload preserved every other current origin file byte-for-byte, including both policies, existing screenshots, styles and crawl files. Source and live checks covered JSON validity, visible facts, internal links, canonical URLs, 320/768/1280-pixel layouts, public HTTP responses and real 404s. Google accepted indexing requests for both Bottle Harmony language pages; actual indexing remains separate from that acceptance and is recorded in the ASO tracker.

## Organic search and guides

The initial SEO round covered four discovery pages plus two English guides; the approved Sudoku release update adds German, Japanese and Korean product pages. The homepage links to both guides; each product links to its relevant guide, and the guides link to the product pages and each other. Titles and prominent headings state the puzzle type and page purpose, without promising public downloads during closed testing. Product pages and guides include visible breadcrumbs with matching `BreadcrumbList` data. Guide `Article` data identifies Platon Games as the author and publisher; it does not invent qualifications, reviews or ratings.

The Sudoku guide uses an unchanged existing content puzzle and verifies that the illustrated cell has exactly one candidate. The water-sort guide labels all colors in text and gives a complete, mechanically checked three-pour miniature example. The guides are static explanations, with no playable web game, executable client script, gated content or new analytics. Keep these worked examples correct when editing their prose or markup.

Canonical URLs use `https://readytradie.com/` and descriptive directory paths. The `www` alias retains the same canonical preference. `_headers` sets `noindex` only on the stable Pages origin and its deployment/branch subdomains, leaving the production domain indexable. Do not block those duplicate origins in robots.txt before a crawler can read the noindex header. Existing images use one-day browser caching, without an immutable promise for unversioned files; HTML and unversioned styles continue to revalidate. Bottle Harmony CSS references use the CSS SHA-256's first twelve characters as a query version and must be updated together after CSS changes.

Run `npm run check` from `site/` to verify canonical pages, unique metadata, language reciprocals, Sudoku store/QR entries, structured facts, local links/anchors, the worked examples and the recovery worker tests. Check changed pages at mobile, tablet and desktop widths before publishing. Preserve both live policies, `app-ads.txt`, screenshots and `/sw.js` when deploying.

Track Search Console Web impressions, clicks, query intent, CTR and landing pages in the [ASO tracker](../docs/operations/aso-tracker.md). Separate brand queries from rules/learning queries and website search from Play acquisition. The query themes are editorial hypotheses, not measured keyword volumes. Use complete reporting weeks when data is available; indexing acceptance and lab performance scores are not evidence of traffic or install growth. Expand beyond these two guides only after reviewing real query gaps and agreeing the new content scope.

References: [Google SEO starter guide](https://developers.google.com/search/docs/fundamentals/seo-starter-guide), [titles](https://developers.google.com/search/docs/appearance/title-link), [snippets](https://developers.google.com/search/docs/appearance/snippet), [localized versions](https://developers.google.com/search/docs/specialty/international/localized-versions), [Cloudflare header rules](https://developers.cloudflare.com/pages/configuration/headers/).

The complete first SEO round was published on 13 October 2026 as deployment `0aa0d6c6`. Six-page metadata/link/example checks and 320/768/1280-pixel layouts passed. Production pages remained indexable while Pages origins carried noindex; images used the intended caching headers. The existing sitemap was submitted once after adding the guides, and Search Console reported **Success / 6 discovered pages**. Actual indexing, performance reports and traffic follow-up are recorded in the ASO tracker. Both live policies, advertising authorization, screenshots and the worker recovery were preserved.

## Multilingual long-tail content review

On 18 October 2026, the approved Sudoku SEO review compared all 24 existing product pages with 42 native-language publisher/reference pages. It assessed 144 relevant expressions and added 110 that were previously absent under the documented matching method. Three native HTML FAQ answers per language explain beginner rules, candidate notes and free offline play with accurate hint limits and optional online services. These 72 answers use the existing FAQ layout; titles, descriptions, language navigation, canonical/hreflang links, homepage, guides, screenshots, Bottle Harmony and privacy policies are unchanged.

Deployment `64852706` published this review. All 24 public product pages, 117 deployed files and 96 page/viewport checks passed; 93 unchanged origin files, including the homepage, guides, Bottle Harmony and both policies, were preserved byte-for-byte. Canonical/hreflang links and the existing 29-URL sitemap remain unchanged.

The current [language audit](seo/sudoku-language-audit.json) records source URLs, short observed terms, editorial intent combinations, before/after expression counts, the exact added answers and excluded intents. Search-index text and direct page access are labeled separately. Counts exclude language-picker labels and structured data, normalize Unicode/punctuation/whitespace, and use substring matching for Chinese, Japanese, Korean and Thai. They are not search volume, independent query counts, keyword difficulty or verified exposure growth; some topics were already described even when an exact expression was absent. There was no independent native-speaker review or fresh Search Console query sample in this round.

New coverage is selective and reader-focused: no keyword lists in the product UI, copied competitor prose, new landing pages, meta-keyword tags or FAQ rich-result promises. Printing, browser play, imported-puzzle solvers, unimplemented variants, daily new puzzles, cloud save, unlimited free hints and cognitive benefits are excluded. The approach follows Google's [helpful-content guidance](https://developers.google.com/search/docs/fundamentals/creating-helpful-content) and [spam policies](https://developers.google.com/search/docs/essentials/spam-policies).

| Language | Expressions newly covered in this review | Reference example |
| --- | --- | --- |
| en | Sudoku for beginners; Sudoku pencil marks; candidate notes; free offline Sudoku | [Publisher reference](https://sudoku.com/how-to-play/sudoku-rules-for-beginners/) |
| de | Sudoku für Anfänger; Kandidaten notieren; Notizen in Sudoku; Sudoku kostenlos offline | [Publisher reference](https://www.sudoku.de/sudoku_anleitung.php) |
| ja | 初心者向けナンプレ; 候補数字; 無料でオフライン; 当てずっぽう | [Publisher reference](https://www.nikoli.co.jp/ja/puzzles/sudoku/) |
| ko | 초보자를 위한 스도쿠; 후보 숫자; 무료 오프라인 스도쿠 | [Publisher reference](https://ttanpan.com/guide/sudoku) |
| fr | candidats en sudoku; sudoku gratuit hors ligne | [Publisher reference](https://sudokufr.fr/comment-resoudre-un-sudoku/) |
| es | candidatos en sudoku; sudoku gratis sin conexión | [Publisher reference](https://sudoku.com.es/reglas-de-sudoku/) |
| pt-BR | como jogar sudoku; candidatos no sudoku; sudoku grátis offline; sem chutar | [Publisher reference](https://puzzled.com.br/articles/como-jogar-sudoku) |
| zh-Hant | 數獨初學者; 數獨候選數; 免費離線數獨; 不必猜測 | [Publisher reference](https://onlinesudoku.io/zh-tw/blog/how-to-learn-sudoku-step-by-step) |
| it | sudoku per principianti; regole del sudoku; note dei candidati; candidati nel sudoku; sudoku gratis offline; senza indovinare | [Publisher reference](https://www.sudokufreeonline.com/it-IT/guides/what-is-sudoku) |
| id | sudoku untuk pemula; cara bermain sudoku; catatan kandidat; kandidat sudoku; sudoku gratis offline | [Publisher reference](https://www.sudokufreeonline.com/id-ID/guides/how-to-play-sudoku-first-steps) |
| ru | судоку для начинающих; правила судоку; заметки кандидатов; кандидаты в судоку; судоку бесплатно офлайн | [Publisher reference](https://sudokuslate.com/ru/rules) |
| zh-Hans | 数独新手入门; 数独规则; 数独候选数; 免费离线数独; 不靠猜测 | [Publisher reference](https://iplaysudoku.com/zh/learn/sudoku-pencil-marks) |
| vi | sudoku cho người mới bắt đầu; cách chơi sudoku; ghi chú ứng viên; ứng viên trong sudoku; sudoku miễn phí ngoại tuyến; không đoán | [Publisher reference](https://www.sudoku100.com/vi/beginner/) |
| hi | शुरुआती लोगों के लिए सुडोकू; सुडोकू कैसे खेलें; सुडोकू के नियम; सुडोकू में नोट्स; मुफ़्त ऑफ़लाइन सुडोकू | [Publisher reference](https://sudokuslate.com/hi/rules) |
| uk | судоку для початківців; правила судоку; нотатки кандидатів; кандидати в судоку; безкоштовне судоку офлайн | [Publisher reference](https://sudokupro.app/uk/how-to-play) |
| ro | sudoku pentru începători; reguli sudoku; notițe de candidați; candidații în sudoku; sudoku gratuit offline; fără ghicit | [Publisher reference](https://sudokupro.app/ro/blog/sudoku-rules-complete-beginners-guide-with-examples) |
| fi | sudoku aloittelijoille; sudokun säännöt; ehdokasmerkinnät; sudokun muistiinpanot; ilmainen sudoku offline; ilman arvaamista | [Publisher reference](https://www.sudokuhot.com/fi/rules) |
| ar | سودوكو للمبتدئين; قواعد السودوكو; ملاحظات المرشحين; سودوكو مجانية دون اتصال | [Publisher reference](https://e-sudoku.com/ar/how-to-play) |
| tr | yeni başlayanlar için sudoku; sudoku nasıl oynanır; aday notları; sudoku adayları; ücretsiz çevrimdışı sudoku | [Publisher reference](https://sudoku2gether.com/tr/rules) |
| th | ซูโดกุสำหรับมือใหม่; วิธีเล่นซูโดกุ; จดโน้ตซูโดกุ; ซูโดกุออฟไลน์ฟรี | [Publisher reference](https://th.sudokucloud.com/tutorial) |
| pl | sudoku dla początkujących; zasady sudoku; notatki kandydatów; kandydaci w sudoku; darmowe sudoku offline | [Publisher reference](https://sudoku247online.com/pl/how-to-play) |
| nl | sudoku voor beginners; sudoku regels; potloodnotities; kandidaatgetallen; gratis sudoku offline; zonder gokken | [Publisher reference](https://e-sudoku.com/nl/how-to-play) |
| ms | sudoku untuk pemula; cara bermain sudoku; nota calon; calon sudoku; sudoku percuma luar talian | [Publisher reference](https://sudokupro.app/ms/blog/sudoku-scanning-techniques-for-beginners-row-column-and-box-sweeps) |
| fil | sudoku para sa baguhan; paano maglaro ng sudoku; mga kandidato sa sudoku; tala ng kandidato; libreng sudoku offline | [Publisher reference](https://sudokuslate.com/tl/learn/candidates) |

Measure results after crawling/indexing using Search Console impressions, clicks, queries and pages over comparable complete periods. Requested indexing, phrase coverage and successful publication do not establish ranking or traffic gains.

## App-derived Sudoku courses

The approved course expansion includes every current App course: three basic
courses, 27 core concepts (including their diagram variants and recognition
questions), and all 100 examples across 40 techniques. Two supporting guides
answer pencil-mark and stuck-puzzle questions. A directory organizes the content
by topic and difficulty. This produces 73 URLs per language, 1,752 course URLs
across the existing 24 languages; these are localized versions, not 1,752
different courses. The existing English beginner-guide URL remains available.

`npm run courses:build` reads the App's existing course repositories, localized
article copy and validated walkthrough presentation at build time. It writes
static HTML and shared SVG diagrams under `public/guides/sudoku/`, without
changing any App source, content database, monetization, progress or runtime.
The course-only stylesheet preserves the existing guide design. Each page names
Platon Sudoku App as its teaching source, contains the complete explanation and
has direct Google Play links near the top and bottom. Product pages gain only
a localized course-directory link. Bottle Harmony, its guide, both policies and
the existing shared stylesheets remain outside this change.

Course generation and checking use the repository's existing TypeScript
dependency: install the root JavaScript dependencies first. No native App build
is required; preview and hosting still serve the generated static files.

Technique variants share one page rather than separate near-duplicate URLs.
Intermediate positions explicitly disclose earlier candidate eliminations.
Core-concept diagrams are labeled partial teaching diagrams, not complete
playable puzzles. Temporary assumptions remain candidate-level marks; the
result image distinguishes actual placements and eliminations. Readers can
open a diagram at full size. Native HTML disclosures expose every proof step
without JavaScript. A collapsed language menu switches to the same course in
another language. Each localized page has a self-canonical, reciprocal
alternates, Article or CollectionPage metadata, breadcrumbs and a sitemap entry.
Teaching translations come from the App; new website attribution, candidate
context, legend and guide labels are author-reviewed, without an independent
native-speaker review.

`npm run check` verifies reproducible output, coverage of every App example in
every language, source fingerprints, board candidates and final deductions,
preserved speculative-candidate semantics, download links, all local links,
metadata, language alternatives and the existing service-worker tests. Identical
natural titles across different languages are allowed; titles and descriptions
must be unique within each language. Browser QA covers the English, German,
Japanese and Korean directories and Hidden Pair courses at 320 and 1280 pixels,
all remaining language directories at 390 pixels, all 24 product-page entries
at 320 pixels, Arabic RTL, language switching and advanced proof presentation.
Publication and successful checks do not establish indexing or traffic growth.

Publish this expansion from a staged `public` copy that preserves the current
origin's unchanged files. The local Bottle Harmony English page, Chinese page
and policy differ from the current published baseline; uploading this checkout
directly would overwrite them. Their existing origin bytes must be retained,
as in earlier Sudoku deployments. Do not replace those repository files as part
of the Sudoku course change.

Production deployment `e1eda24d` published these courses on 18 October 2026.
Source and staged checks passed for all 1,781 sitemap URLs; every language
contains all 100 validated App examples. The upload included 3,914 assets and
the existing headers configuration. Post-publication checks verified 96 public
course URLs across all 24 languages, the exact sitemap, stylesheet and a shared
diagram. All 91 protected files match the previous deployment byte-for-byte,
including the current Bottle Harmony pages and both privacy policies. No
Search Console indexing requests, App release changes or Git commits were made
in this course-publication task.

## Retired ReadyTradie cache recovery

`public/sw.js` deliberately replaces the retired ReadyTradie worker at its original root-scoped update URL. It activates immediately, takes over affected windows, unregisters its own registration and reloads those controlled windows at their existing URL. It has no fetch handler, precache, cache deletion or website-data reset. Current site pages do not register it. Keep this recovery URL available for returning browsers with an older registration, and preserve its JavaScript MIME type and `Cache-Control: no-store` headers; changing its URL would leave the old worker unaffected. The response is excluded from search indexing.

Run `npm test` from `site/` for its lifecycle, exact-URL recovery, closed-tab and already-unregistered cases. This follows [Chrome's service-worker recovery approach](https://developer.chrome.com/docs/workbox/remove-buggy-service-workers), with no new caching behavior for the static website.

Deployment `578e49f8` published this recovery on 13 October 2026. The affected Chrome session was reproduced before publication and recovered to the real Sudoku page afterward. All 21 public files matched the upload snapshot; existing product pages, policies and assets were preserved. The four worker tests and targeted ESLint checks passed.

## Local preview

From `site/`, run `npm ci` once and `npm run dev`. Wrangler serves the exact `public` directory. The site also works as plain static HTML; do not add analytics, forms, or third-party scripts without updating the privacy policy.

## Deploy

Every deployment replaces the complete published package, including the Pages
configuration files. Keep `public/_headers` and `public/_redirects` in every
upload, including temporary packages used for a change to only one game. The
`/index.php https://readytradie.com/ 301` rule must remain present; omitting
`_redirects` removes the live redirect even when the repository still has it.
Preserve the latest production assets when preparing a partial update. Run
`python3 scripts/check_deploy.py /absolute/path/to/staged/public` on the actual
upload directory before calling Wrangler. `npm run deploy` checks `public`
automatically. After publication, verify `/index.php` returns 301 to the
canonical homepage, the destination returns 200, and a nonexistent path still
returns 404.

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
