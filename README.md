This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Cloudinary image storage

All uploaded gallery images and profile avatars use Cloudinary. Product media refers to gallery records, while category and brand images reference the same gallery records. Gallery records store the secure URL and Cloudinary public ID; the binary data field remains optional only for legacy records until migration.

1. Create a Cloudinary account at [cloudinary.com](https://cloudinary.com/).
2. In the Cloudinary Console dashboard, copy the **Cloud name**, **API Key**, and **API Secret**.
3. Add those values to the matching variables in the root `.env.local` file. Set `CLOUDINARY_FOLDER=nextcent` (or another root folder if desired). The API secret is used only by server-side code. Restart the Next.js server after editing environment values.
4. Preview the migration without uploading anything with `npm run migrate:images -- --dry-run`.
5. With MongoDB and Cloudinary credentials configured, run `npm run migrate:images`. It uploads existing MongoDB gallery image data, user-avatar data URIs, references to local files, and every image in `public/` using stable Cloudinary IDs. The script is safe to rerun and does not remove local files.

The site uses `CLOUDINARY_CLOUD_NAME` in the client only to construct delivery URLs for bundled public artwork. Cloud name is public information; the API key and API secret are never exposed to client code. Do not commit `.env.local`.

## Admin invoices

Invoices are generated for new orders and synchronized when an order is paid, refunded, or cancelled. Existing orders can be backfilled with `npm run backfill:invoices`; the script skips orders that already have an invoice, so it is safe to rerun. Configure `MONGODB_URI` in `.env.local` and back up production data before running the backfill.

Invoice email delivery requires an SMTP account. Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, and `SMTP_FROM` in `.env.local`; PDF downloads and print views do not require SMTP. Invoice and counter indexes are managed by the Mongoose models.

### Cloudinary acceptance checks

After setting credentials and starting the app:

- Upload a valid image in Gallery; response and MongoDB record should contain a `https://res.cloudinary.com/` URL and a `publicId`.
- Upload a renamed text/SVG file; the endpoint should reject it with HTTP 400.
- Delete an unused gallery image; it should disappear from MongoDB and Cloudinary.
- Reference an image from a product, category, brand, or user and try deleting it; the request should return HTTP 409 and the Cloudinary asset should remain.
- Run `npm run migrate:images` twice; the second run should report existing public IDs and should not create duplicate Cloudinary assets.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
