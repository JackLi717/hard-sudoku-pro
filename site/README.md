# Platon Games website

This is the long-term static website for Platon Sudoku. The source of truth is this repository, not the retired ReadyTradie application. Cloudflare Pages serves `site/public` with no application server, build step, analytics script, or access gate.

## URLs

- Developer website: `https://readytradie.com/` (`https://www.readytradie.com/` also serves the site)
- Platon Sudoku privacy policy: `https://readytradie.com/platon-sudoku/privacy/`
- AdMob authorized sellers: `https://readytradie.com/app-ads.txt`
- Contact: `admin@readytradie.com`

## Local preview

From `site/`, run `npm ci` once and `npm run dev`. Wrangler serves the exact `public` directory. The site also works as plain static HTML; do not add analytics, forms, or third-party scripts without updating the privacy policy.

## Deploy

1. In Cloudflare, keep the `readytradie.com` DNS zone and all mail-related DNS records under the account you control.
2. Use the Cloudflare Pages project `platon-games-site`, with production branch `main`. It was created as a Direct Upload project on 30 September 2026; Cloudflare does not allow converting this project to Git integration later. Do not deploy the old `mygig-frontend` directory.
3. From `site/`, run `npm ci` and `npm run deploy` after signing in with `npx wrangler login` or setting a scoped `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID` outside the repository. Never commit credentials.
4. Keep `readytradie.com` and `www.readytradie.com` attached to `platon-games-site` under **Custom domains**. Both DNS CNAME records point to `platon-games-site.pages.dev`. The root domain was detached from `mygig-frontend` when this site replaced it; that old Pages project was not deleted. Preserve MX, SPF, DKIM, and DMARC records for `admin@readytradie.com`.
5. Verify the three URLs above and the `www` homepage. `/app-ads.txt` must return the exact single line in `public/app-ads.txt` as plain text; the privacy page must be reachable without login. If a browser ad blocker blocks `/app-ads.txt`, check the HTTP response independently instead of changing the path.
6. Once the domain is live, set the Google Play developer website to `https://readytradie.com/` and privacy policy to `https://readytradie.com/platon-sudoku/privacy/`. Update the AdMob privacy-message policy URL. When the app can be found in Play, link it in AdMob and request an `app-ads.txt` check.

The AdMob publisher line came from this account's AdMob **Set up app-ads.txt** dialog on 30 September 2026. If the publisher account changes, update the file from the new account's own snippet before deploying. Google may take up to 24 hours to detect a new Play developer website and crawl the file. On 30 September, the Play developer website was published and its privacy URL was sent for review; the AdMob consent-message privacy URL was updated while the message remained a draft.
