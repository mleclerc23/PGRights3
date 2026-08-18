# Deploying Playground Rights Initiative

This folder is a complete, ready-to-deploy site:

```
index.html          the app
functions/api/data.js   the shared-storage backend (Cloudflare Pages Function)
```

Data (items, steps, contacts, etc.) is stored centrally in Cloudflare KV, so
everyone who visits the site with the password sees and edits the same data.

Because it uses a backend function, you'll deploy it through **GitHub +
Cloudflare's Git integration** rather than dragging files into the
dashboard — Cloudflare's drag-and-drop upload doesn't support the
`/functions` folder, only the Git-connected and command-line paths do.

---

## 1. Put the code on GitHub

1. Go to [github.com/new](https://github.com/new) and create a new repository
   (public or private both work — e.g. `rights-tracker`).
2. Upload these three items into it — either drag them into the GitHub web
   UI ("Add file" > "Upload files"), or if you're comfortable with git:
   ```
   git init
   git add .
   git commit -m "Initial site"
   git branch -M main
   git remote add origin https://github.com/<you>/rights-tracker.git
   git push -u origin main
   ```

## 2. Create the Cloudflare Pages project

1. Log into the [Cloudflare dashboard](https://dash.cloudflare.com) (free
   account is fine).
2. Go to **Workers & Pages** > **Create application** > **Pages** >
   **Connect to Git**.
3. Authorize GitHub and pick the repository you just created.
4. Build settings: leave **Framework preset** as "None" and the **Build
   command** blank — there's nothing to build, it's a static file plus a
   function. Set **Build output directory** to `/` (the repo root).
5. Click **Save and Deploy**. After a minute you'll have a working site at
   `https://rights-tracker.pages.dev` (or similar) — but it won't save data
   yet, because the KV storage isn't connected. That's the next step.

## 3. Create the KV namespace and connect it

1. In the dashboard, go to **Storage & Databases** > **KV** > **Create a
   namespace**. Name it something like `rights-tracker-data`.
2. Go back to **Workers & Pages**, open your Pages project, go to
   **Settings** > **Bindings** > **Add** > **KV namespace**.
3. Set **Variable name** to exactly `TRACKER_KV` (the function code expects
   this exact name), and select the namespace you just created.
4. Still in **Settings**, go to **Environment variables** > **Add
   variable**. Add:
   - Name: `APP_PASSWORD`
   - Value: `PGrights26` (must match `ACCESS_PASSWORD` in `index.html` —
     if you ever change the password in the HTML, update this too)
5. **Redeploy** the project (Settings > Deployments > ⋯ > Retry deployment,
   or just push any small commit) so the new bindings take effect.

At this point the site should fully work at your `*.pages.dev` address —
open it, enter the password, and confirm changes you make are still there
after a full page reload (that's the KV storage working).

## 4. Register and connect your domain

If you don't have a domain yet, the simplest path is registering it
directly through Cloudflare — it puts DNS and hosting in one place with no
extra nameserver setup:

1. In the dashboard, go to **Domain Registration** > search for the domain
   you want > follow the checkout flow (Cloudflare sells at close to
   wholesale price, no markup).
2. Once it's registered, go back to your **Pages project** > **Custom
   domains** > **Set up a custom domain** > enter your domain > follow the
   prompts. Since the domain is already on Cloudflare, DNS records are
   added automatically and it's usually live within a few minutes.

If you already own a domain elsewhere (Namecheap, GoDaddy, Squarespace,
etc.), you have two options:
- **Point it at Cloudflare fully**: add the domain to Cloudflare
  (**Add a domain**), then update your domain's nameservers at your
  registrar to the two Cloudflare nameservers shown — this can take a few
  hours to propagate. Then follow the same **Custom domains** step above.
- **Just point a subdomain**: at your existing DNS provider, add a `CNAME`
  record (e.g. `tracker` -> `rights-tracker.pages.dev`), then add that
  same subdomain under **Custom domains** in your Pages project.

---

## Notes and limitations

- **The password is not real security.** It's client-side (visible in
  `index.html`'s source) and the API checks a matching header — enough to
  keep casual visitors and search engines out, not a determined party.
  Don't put anything in here you wouldn't want a motivated outsider to see.
- **Last write wins.** If two people edit the same field at the same
  moment, whichever save lands last overwrites the other — same as the
  in-app editing model already assumes.
- **To change the password later**, update `ACCESS_PASSWORD` in
  `index.html` *and* the `APP_PASSWORD` environment variable in the Pages
  project settings (they must match), then redeploy.
