# Deploy yesandeverything.com

You've got the site files. Here's the path from here to a live page on your domain. Ten to fifteen minutes of clicking, then a wait for DNS + HTTPS to settle.

## What's in this folder

- `index.html` — the site
- `404.html` — fallback for unknown paths
- `CNAME` — tells GitHub Pages your custom domain
- `.nojekyll` — disables Jekyll processing on GitHub Pages
- `robots.txt` — lets crawlers index the page

You don't need to touch any of these to deploy. Just push them to GitHub.

---

## Step 1 — Create a GitHub repo

1. Go to https://github.com/new while signed in as **TheProphetKane**.
2. Repository name: **`yesandeverything`** (lowercase; the name doesn't have to match the domain, but this keeps things tidy).
3. Visibility: **Public** — required for the free GitHub Pages tier with custom domains.
4. **Do not** check "Add a README" or "Add .gitignore" — leave it empty so it doesn't conflict with what we're pushing.
5. Click **Create repository**.

## Step 2 — Push this folder to the repo

Open PowerShell and run, one block at a time:

```powershell
cd X:\YesAndEverything

git init -b main
git add .
git commit -m "initial site"
git remote add origin https://github.com/TheProphetKane/yesandeverything.git
git push -u origin main
```

If `git push` asks you to authenticate, sign in with your browser when prompted (GitHub CLI / Git Credential Manager handles this automatically on Windows).

## Step 3 — Turn on GitHub Pages

1. Go to https://github.com/TheProphetKane/yesandeverything/settings/pages
2. Under **Build and deployment** → **Source**, choose **Deploy from a branch**.
3. Branch: **`main`**, folder: **`/ (root)`**. Click **Save**.
4. Wait ~30–60 seconds. Refresh the page. You should see a banner that says *"Your site is live at https://theprophetkane.github.io/yesandeverything/"*. Click it — confirm it loads.

If it does, the site itself is fine. Now we point your domain at it.

## Step 4 — Tell GitHub about your custom domain

Still on the Pages settings page:

1. In the **Custom domain** field, type `yesandeverything.com` and click **Save**.
2. GitHub will start a DNS check that will fail until step 5 is done. That's expected.
3. Leave **Enforce HTTPS** unchecked for now. We'll come back and tick it once the certificate provisions.

The `CNAME` file in your repo already has `yesandeverything.com` in it, so GitHub will keep this setting locked in.

## Step 5 — Point your domain at GitHub

This is the part that depends on **where you bought yesandeverything.com**. Go to that registrar's control panel (Namecheap, Cloudflare, Google Domains/Squarespace, GoDaddy, Porkbun, etc.) and find the **DNS settings** for the domain.

Add **all four** of these A records for the apex domain (`@` means "the root domain itself"):

| Type | Host/Name | Value           | TTL  |
|------|-----------|-----------------|------|
| A    | @         | 185.199.108.153 | auto |
| A    | @         | 185.199.109.153 | auto |
| A    | @         | 185.199.110.153 | auto |
| A    | @         | 185.199.111.153 | auto |

Then add this **CNAME record** so `www.yesandeverything.com` also works:

| Type  | Host/Name | Value                          | TTL  |
|-------|-----------|--------------------------------|------|
| CNAME | www       | theprophetkane.github.io.      | auto |

> Notes for specific registrars:
> - **Cloudflare**: set the four A records to **DNS only** (gray cloud), not Proxied, until HTTPS provisions. You can flip back to proxied later if you want.
> - **Namecheap/GoDaddy**: their UI uses the same fields above. If they require a value in the Host column instead of `@`, leave it blank or use `@`.
> - **Squarespace/Google Domains**: same pattern, just menus.

If the registrar already has any other A records on `@` (like a parking page), **delete them**.

## Step 6 — Wait for DNS + HTTPS

DNS changes can take anywhere from 5 minutes to an hour to propagate. You can check progress at:

- https://dnschecker.org/?type=A&query=yesandeverything.com — should show all four GitHub IPs.
- The GitHub Pages settings page — the DNS check banner will turn green when ready.

Once GitHub confirms the domain, the **Enforce HTTPS** checkbox will go from grayed-out to clickable. Click it. Wait another ~15 minutes for the certificate.

## Step 7 — Confirm

Visit `https://yesandeverything.com` in a private/incognito window. You should see the dark page with your two projects and the no-soliciting notice. The URL bar should show a padlock (HTTPS).

You're done.

---

## Editing later

When you want to update text, add a project, or change anything:

```powershell
cd X:\YesAndEverything
# edit index.html in your editor of choice
git add index.html
git commit -m "describe what changed"
git push
```

GitHub Pages redeploys automatically — usually within 30 seconds.

## If something breaks

- **Blank page or 404 on yesandeverything.com after DNS propagates**: re-check the four A records, make sure they're pointed at the IPs above and not at the registrar's parking page.
- **"Domain does not resolve to GitHub Pages"** in repo settings: DNS hasn't fully propagated yet. Wait, refresh.
- **HTTPS checkbox stays grayed out for >24 hours**: try removing the custom domain in Pages settings, save, re-add it, save. This kicks off a fresh certificate request.
- **Site shows old content after pushing changes**: hard-refresh (Ctrl+Shift+R). GitHub Pages caches aggressively.

That's it. Once it's live the solicitors get a polite redirect and you stop having to argue with them.
