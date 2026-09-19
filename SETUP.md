# One-time developer setup

This remains one vanilla HTML/CSS/JavaScript GitHub Pages website. Supabase provides Auth, Postgres and Storage. The storefront uses native `fetch`; only the admin page loads the official Supabase JS client (pinned to 2.57.4) for its managed session and uploads. No build or application server is needed.

**Do not publish the updated storefront before completing the steps below.** The checked-in public configuration is intentionally blank. Without it, product loading shows a friendly failure message; existing booking/contact navigation remains usable.

## 1. Create the backend and owner

1. Create a Supabase project in an account you control. Choose the appropriate region and keep the generated database password private.
2. In Authentication settings, keep Email/password authentication enabled. Disable **Allow new users to sign up** (the label may appear under Sign In / Providers or Auth settings). Disable anonymous sign-ins and unused social providers.
3. In Authentication → Users → Add user → Create user, create the owner's email/password account. Confirm the email there for this manually provisioned account. Give the credentials to the owner privately; do not add them to this repository.
4. Copy that user's UUID.
5. In Auth URL Configuration, set Site URL to `https://kawingtam.github.io/SpaBooking/`. This login uses email/password directly and does not require an OAuth redirect. If you later use Supabase recovery emails, configure and test that recovery flow separately; this interface does not include password reset.

## 2. Run the single setup file

Open `supabase-setup.sql`. In the owner authorization block, replace:

```sql
declare owner_id uuid := null;
```

with the UUID you copied, enclosed in single quotes. It is an identifier, not a secret. Run the **entire file once** in the new project's SQL Editor as the default privileged role. It runs in a transaction and creates:

- `products`, with small text-based descriptions/highlights, stable text IDs, visibility, display order and timestamps.
- `admin_users`, with one membership tied to `auth.users(id)`.
- A trigger that updates `updated_at` automatically.
- Product and membership RLS policies and explicit grants.
- Public `product-images` Storage bucket, a 10 MB file limit and JPEG/PNG/WebP allowlist.
- Owner-only Storage read/list/write policies.
- The existing six **example** products with their original IDs: `serum-1`, `serum-2`, `mask-1`, `mask-2`, `body-1`, `body-2`.

This is a one-time setup for a fresh project, not an idempotent migration runner. If it fails, resolve the error before rerunning; do not drop an existing live catalog. If you intentionally left the owner UUID null, use Table Editor → `admin_users` → Insert row → `user_id` and paste the existing Auth user's UUID. No browser user can grant this membership.

The examples retain their existing descriptions. Usage and highlights are blank because the original catalog supplied none. Replace example content/photos or hide it before presenting the shop as a real catalog. Without a photo, the storefront renders the existing style of sample packaging.

No extra index is added for this small catalog beyond primary keys.

## 3. Configure the website

Find the Project URL and **publishable key** in the project's Connect dialog or API settings. A legacy `anon` key also works. Edit `supabase-config.js`:

```js
window.SPA_CONFIG = {
    url: 'https://YOUR_PROJECT.supabase.co',
    publishableKey: 'sb_publishable_YOUR_PUBLIC_KEY'
};
```

These two values are intentionally public. Never use `sb_secret_…`, `service_role`, a database password or owner password. RLS protects writes; the public key is not an admin password. Both pages read this same file.

## 4. Preview and publish

From the repository directory, serve the files with `python3 -m http.server 8000`, then visit `http://localhost:8000/products.html` and `http://localhost:8000/admin.html`. Use localhost or HTTPS (UUID creation requires a secure context). Test the deployment checklist below before pushing.

Commit the changes to the same SpaBooking repository and publish using its existing GitHub Pages branch/root settings. No second repository is required. The URLs will be:

- Shop: `https://kawingtam.github.io/SpaBooking/products.html`
- Owner: `https://kawingtam.github.io/SpaBooking/admin.html`

Share the owner URL and `OWNER-GUIDE.md` privately. Keeping this URL unlisted is convenience only; the database policies enforce authorization.

## 5. Deployment verification — required on the real project

Use disposable test products/images. Do not send WhatsApp messages or purchases.

1. Signed out: storefront loads only active rows, ordered by `sort_order` then ID. Open details, add from both places, change quantities, reload, remove. Inspect the generated WhatsApp URL without sending anything.
2. Owner: log in, reload to verify the session, create a test product and upload a phone photo. Confirm it appears publicly on reload. Edit its title and photo; verify both update.
3. Hide it: public reload removes it and any saved cart entry; admin still shows Hidden. Show it again. Check deletion cancellation, then delete the disposable product deliberately.
4. Disconnect the network while saving/uploading: entered fields remain; retry works and does not create a second product. Reconnect before retrying.
5. With a public/anonymous API client, verify product INSERT/UPDATE/DELETE and Storage upload/update/delete are denied. UPDATE/DELETE can return success with **zero affected rows** under RLS; verify that the stored data did not change.
6. Manually create a temporary second Auth user **without** adding it to `admin_users`. Repeat those write attempts and hidden-product reads with its session. It must not get owner access. It must also be unable to insert/update membership rows. Remove the temporary user after testing.
7. With the owner session, verify product and Storage writes succeed. Check RLS is enabled for products/admin_users and that no other broad policies exist. Storage is RLS-enabled by Supabase; review its policies too.
8. Test actual iPhone and Android photo library/camera choices. They depend on the browser/OS and cannot be proven by resizing a desktop viewport. HEIC-only files are rejected with guidance to choose JPEG/PNG/WebP; no image converter is installed.
9. Log out and ensure management controls disappear. Confirm booking, contact and navigation still work if product loading fails.

A public image bucket makes image URLs readable even after a product is hidden; visibility hides the product listing, not previously shared image URLs. Do not upload private photos.

## Runnable checks

No installation required for application logic checks:

```sh
node check-cart.cjs
node check-admin.cjs
```

An optional PostgreSQL RLS check uses PGlite in a **temporary test directory**, not as a production dependency:

```sh
npm install --prefix /tmp/spabooking-security --no-save --package-lock=false @electric-sql/pglite
PGLITE_MODULE=/tmp/spabooking-security/node_modules/@electric-sql/pglite/dist/index.js node check-security.mjs
```

This executes the actual setup SQL in PostgreSQL with minimal Supabase-provided role/Auth/Storage table stubs. It tests database policies, not hosted Auth or Storage HTTP enforcement. Keep the deployment verification above.

## Deliberate limits

- The live catalog is read from Supabase on page load, back-navigation and the Reload Products button. No realtime subscription or background polling.
- Files are uploaded under unique names before saving the product, avoiding stale image caches. Old managed images are removed after successful replacement/deletion. Failed/abandoned or ambiguous saves can leave an unused image; automatic sweeping is deliberately omitted to avoid deleting an image whose save actually committed. Add a cleanup job only if usage warrants it.
- A single owner workflow is assumed. No simultaneous-editor conflict UI, inventory, prices, order database, customer accounts or analytics.
- Sessions use the Supabase client's normal persistence; passwords are submitted to Auth and are never written by the app to storage or the product table.

## Official references

- [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
- [Supabase JavaScript installation](https://supabase.com/docs/reference/javascript/installing)
