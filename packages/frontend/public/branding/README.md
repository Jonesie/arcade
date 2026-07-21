# Branding assets (not committed)

This folder is for real photos/imagery tied to this specific site's
identity — e.g. the actual Dog House (Christchurch) storefront photo used as
a background behind the cabinet. Deliberately **not** committed to git:
this repo is public, and this kind of image usually isn't something we hold
redistribution rights to.

To add the background photo:

1. Drop the file in here as `doghouse-1985.jpg` (or update the filename
   referenced in `packages/frontend/src/components/Cabinet.module.scss`'s
   `.root` background if you use a different name/extension).
2. That's it locally — Vite serves everything under `public/` at the site
   root, so `/branding/doghouse-1985.jpg` just works.
3. On the deployed server, copy the file into the running container the
   same way (or bind-mount it), the same pattern already used for Lorna's
   audio and jonesie.net.nz's avatars in `~/dev/home_nginx`.

Until the file exists, the background rule just doesn't render anything —
no error, it falls back to the plain dark background underneath.
