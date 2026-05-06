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

## Step 5 — Point your domain at GitHub (Squarespace / Google Workspace)

You bought the domain through Google when setting up your email. That means:

- The registration itself was handled by Google Domains, which Google sold to **Squarespace** in 2023. By now your domain is almost certainly managed through Squarespace, even though your email still runs on Google Workspace.
- Your **email is on Google Workspace**, which means there are **MX records** and probably **SPF / DKIM / DMARC TXT records** already in place on the DNS for `yesandeverything.com`.

> 🚨 **CRITICAL — DO NOT DELETE EMAIL RECORDS.**
> When you edit DNS, leave every existing **MX**, **TXT**, and **SPF** record exactly as it is. Deleting any of them will silently break your Google Workspace email delivery. You're only **adding** new records (four A, one CNAME) and **only deleting** old A records that point at a parking page on `@`. If you see records labeled `mx`, `spf`, `_dmarc`, `google._domainkey`, or anything containing "google" or "@aspmx" — leave them alone.

### 5a — Get to your DNS settings

Try these in order; whichever loads your domain first is the right one:

1. **Squarespace**: https://account.squarespace.com/domains — sign in with the same Google account you used when buying the domain (Squarespace usually offers Google sign-in for migrated domains). Click `yesandeverything.com` → **DNS Settings** (or **DNS**).
2. **Google Workspace Admin Console** (fallback): https://admin.google.com → **Account** → **Domains** → **Manage domains** → click `yesandeverything.com` → **Advanced DNS settings** or **Manage DNS**. This may redirect you to Squarespace.

You should land on a page showing a list of DNS records (MX, TXT, possibly some A or CNAME records).

### 5b — Add the GitHub records

Add **all four** of these A records on the apex (host shown as `@` or left blank for "root domain"):

| Type | Host | Value           |
|------|------|-----------------|
| A    | @    | 185.199.108.153 |
| A    | @    | 185.199.109.153 |
| A    | @    | 185.199.110.153 |
| A    | @    | 185.199.111.153 |

Add **one CNAME** so `www.yesandeverything.com` also works:

| Type  | Host | Value                       |
|-------|------|-----------------------------|
| CNAME | www  | theprophetkane.github.io    |

> If Squarespace's UI rejects the CNAME value because it ends without a dot, that's fine — it'll auto-canonicalize. If it requires a trailing dot, use `theprophetkane.github.io.`

### 5c — Remove only conflicting A records

If — and only if — there are existing **A records on `@`** pointing at a Squarespace parking page (you'll see IPs like `198.185.159.x` or `198.49.23.x`), **delete those four**. They will conflict with GitHub's IPs.

If you also see an existing **CNAME on `www`** pointing somewhere else (like a Squarespace site), delete it before adding the GitHub one.

**Do not delete anything else.** A safe pre-flight check: write down (or screenshot) the list of records before you change anything. If something breaks, you can put it back.

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
