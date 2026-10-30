# PWA Base Layer

A copyable foundation for installable, offline-capable apps: **React + Vite,
Tailwind CSS + shadcn/ui, vite-plugin-pwa + Workbox**, and GitHub Pages deployment.
The demo is intentionally small; reusable browser modules live in `src/lib`.

## Run and verify

Use Node.js 22.12 or newer (`nvm use` selects the repository version).

```sh
npm ci
npm run dev
npm test
npm run build
npm run preview
```

Service workers are disabled during development. Test offline behavior against the
production build served by `preview`, after a successful online visit. HTTPS is
required in production; browsers permit localhost for development.

```sh
npx playwright install chromium
npm run test:e2e
# Or test everything after installing the browser:
npm run check
```

To verify a repository subpath locally, use the same base for build and tests:

```sh
BASE_PATH=/sample-app/ npm run build
BASE_PATH=/sample-app/ npm run test:e2e
```

## Deploy

The Pages workflow tests, builds, and uploads only `dist/`, then deploys on pushes
to `main` or manual runs. Pull requests run checks without deploying. In the new
repository's **Settings → Pages**, select **GitHub Actions** as the source.
Publishing occurs when that workflow runs. The deployed site is available at
https://infoe-labs.github.io/pwa-base-layer/.

The workflow infers `/repository-name/` for project Pages and `/` for repositories
named `*.github.io`. Set the repository Actions variable `BASE_PATH` to `/` for a
custom domain, or another absolute directory path ending in `/`. For any other
static host, build with the intended `BASE_PATH` and upload `dist/` to that path.
Never serve the repository root, `.git`, or local configuration as the web root.
There is no backend or server-side secret configuration.

## Installation on phones

Android browsers that emit `beforeinstallprompt` get an **Install app** button.
It prompts only after a tap. Browser-menu instructions remain available when the
API is absent. iPhone/iPad users get **Safari → Share → Add to Home Screen**
instructions, including **Open as Web App** when shown. The manifest includes
standalone display, scoped identity/start paths, regular and maskable PNG icons;
Apple standalone metadata and a 180px touch icon are included. Installed mode
hides the installation guidance. Availability and menu wording vary by browser.
Real Android/iOS device installation still needs manual verification; browser
emulation cannot verify operating-system home-screen behavior.

## Reuse in another repository

Read [the copy-over guide](docs/REUSE.md) before copying. Change the public app ID,
branding, icons, deployment base, and feature namespaces before release. Keep the
privacy policy. Do not copy `.git`, local hooks, secrets, build output, or installed
dependencies. Hooks require separate local installation in each checkout.

Use [the storage contract](docs/STORAGE.md) for retention, migration, deletion,
quota handling, and same-origin limitations. Use shadcn components under
`src/components/ui` and Tailwind utilities for mobile-first UI. `components.json`
and the `@/` alias support adding further components with the shadcn CLI.

## Offline and privacy defaults

Only revisioned build assets are precached. Requests outside that explicit asset
list go to the network; API responses, third-party resources, and arbitrary
navigation URLs are not cached. Unknown offline routes do not silently return the
app shell. This base has no router; use hash routing for Pages or explicitly design
navigation behavior before adding routes.

Updates wait for the user to choose **Update and reload**. An unsaved demo note
blocks that action. Workbox removes obsolete entries only from this app's shell
cache; it does not sweep other apps' caches. Cached public app files remain until
updated or browser/site data is cleared. There is no runtime content cache.

The demo stores a user-entered note in IndexedDB for 24 hours. It sends no note
content over the network. Expired notes are removed on access and by cleanup on
startup/every minute while the app is open. Closed apps cannot guarantee scheduled
erasure; expired data may physically remain until the app runs again or site data
is cleared. **Delete demo data** clears only the demo feature's current-version
IndexedDB and localStorage records. It preserves app assets and other namespaces.
No analytics, external fonts, remote runtime scripts, automatic persistence
requests, permissions, or sync are included. Hosting providers still receive
normal asset requests and may retain access logs outside this app's control.

## Inspiration

These projects informed the design; their application code was not copied:

- [jfa-pwa-toolkit](https://github.com/jfadev/jfa-pwa-toolkit): modular installation and offline capabilities.
- [Simple PWA](https://github.com/nikkifurls/simplepwa): small installable app shell and explicit precaching.
- [PWA offline storage overview](https://github.com/mhadaily/pwa-offline-storage): storage choices and tradeoffs.
- [Offline storage in a PWA](https://github.com/johnnyreilly/offline-storage-in-a-pwa/blob/master/BLOG.md): asynchronous IndexedDB key/value ergonomics.

This project follows privacy-centric development practices. Privacy requirements
apply to implementation, dependencies, development tools, and publication.
See [AGENTS.md](AGENTS.md) for the policy every contributing agent must follow.

## Data handling

Collect only what a feature needs, prefer processing in memory, and minimize
retained data. Document what is collected, why, where it goes, how long it stays,
and how it is deleted whenever a feature introduces data handling.

Keep personal data, credentials, user content, and raw request or response bodies
out of logs and diagnostics. Use synthetic test fixtures. Review dependencies
for telemetry, logging, caching, and unnecessary network requests.

Browser storage, service-worker caches, and offline content also retain data.
Choose their contents deliberately and define expiration and deletion behavior.
Never put secrets in client bundles, public assets, service workers, or caches.

## Repository privacy

Treat tracked files, Git metadata, pull requests, release artifacts, and CI logs
as public. Keep personal identities, machine details, local paths, credentials,
and deployment configuration local. Store secrets in ignored local files with
restrictive permissions; never pass secrets directly as command-line arguments.

The `.gitignore` and commit policy originate from the sibling `infoe-bots`
project. Local identity checks belong only in `.git/hooks`, never tracked files.
Hooks are not included in clones: each checkout needs its local privacy hooks
installed and an explicitly approved repository-local Git identity configured
before committing. Never infer or copy an identity from another repository,
and never bypass a rejected privacy check.

Before each commit and push, inspect staged content and outgoing commits for
sensitive content and approved author/committer metadata, and run the local
hooks normally. Ignore rules and identity hooks supplement this review; they
do not provide comprehensive secret or personal-data detection.
