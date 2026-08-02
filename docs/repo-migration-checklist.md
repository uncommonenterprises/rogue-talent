# Repo migration — public fork → private repo

**Status: NOT STARTED. Do not begin until Neil says go.**

Why a duplicate and not a visibility flip: `uncommonenterprises/rogue-talent` is a
GitHub **fork** of `sharetribe/web-template`. GitHub blocks changing a fork's
visibility to private, so we duplicate the history into a fresh private repo and
retire the fork.

## Sequencing (agreed) — do NOT overlap Railway changes
1. **Neil rotates the Sharetribe client secret** and updates Railway env vars
   (`SHARETRIBE_SDK_CLIENT_SECRET`, and the client id if a new app was made).
2. **Verify a test booking works** end-to-end on the Railway dev URL *after* the
   rotation redeploy (privileged transitions use the secret — this is the check
   that rotation didn't break checkout).
3. **Only then run this migration.** One Railway-affecting change at a time: the
   secret rotation and the repo re-point must not happen in the same window.

---

## Migration checklist

### A. Create the private repo
1. On GitHub: **New repository** → owner `uncommonenterprises`, name
   `rogue-talent` (or a new name if you want to keep the old one live briefly),
   **Private**, do **not** initialize with README/license (empty).

### B. Copy the full history
2. From a clean clone of the current repo:
   ```
   git clone --mirror https://github.com/uncommonenterprises/rogue-talent.git rt-mirror
   cd rt-mirror
   git push --mirror https://github.com/uncommonenterprises/<new-private-repo>.git
   ```
   (~33 MB; a couple of minutes. `--mirror` carries all branches + tags. Issues,
   PRs, stars, webhooks and branch protection do **not** transfer — we have none
   of note; `forkCount` is 0.)

### C. Re-point local working copies
3. In your working clone:
   ```
   git remote set-url origin https://github.com/uncommonenterprises/<new-private-repo>.git
   git remote -v   # confirm
   ```
4. **Re-arm the git hooks path** (this is LOCAL config — it does NOT survive a
   clone or a remote change, so it must be re-run on every clone/machine):
   ```
   git config core.hooksPath .githooks
   git config core.hooksPath   # must print: .githooks
   ```
   Verify the secret-blocking hook is active by staging a throwaway file with a
   fake `sk_live_…` string and confirming the commit is blocked.

### D. Reconnect Railway (do this in its own window — see Sequencing)
5. Railway → the Rogue Talent service → **Settings → Source** → disconnect the
   old GitHub repo, then **connect** the new private repo. Re-authorize the
   GitHub app for the new repo if prompted.
6. Confirm the deploy branch is `main` and auto-deploy is on.
7. **Env vars stay put** — they live on the Railway *service*, not the repo, so
   they survive. Spot-check that `SHARETRIBE_SDK_CLIENT_SECRET` (post-rotation)
   and the rest are still present.
8. Trigger a deploy (push a trivial commit or use "Deploy"), wait ~5 min, and
   verify the site loads at the Railway URL.

### E. Verify, then retire the old repo
9. Smoke test on the Railway URL: homepage, search, a test booking (privileged
   path), and confirm the build came from the new repo.
10. Update any other clones / CI / docs that reference the old clone URL.
11. **Archive** (not delete first) the old public fork on GitHub so nothing new
    can push to it; delete once you're confident nothing depended on it.

### F. Post-migration guardrails still hold
12. Confirm on the new repo: **Settings → Code security** → secret scanning +
    push protection enabled (these are free on private repos only with GitHub
    Advanced Security — if unavailable on the plan, the committed pre-commit
    hook from step 4 is the backstop, so step 4 is not optional).
13. The `.githooks` pre-commit hook and the `ux-reports` approval gate travel
    with the code automatically (they're committed) — only `core.hooksPath`
    needs the one-time re-arm in step 4.

---

**Reminder that migration is not remediation:** going private does not un-expose
the already-leaked secret (it was public; assume compromised). Rotation in step 1
of Sequencing is what fixes the leak; private only prevents future exposure.
