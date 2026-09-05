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

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# Fiestify

## WhatsApp result notifications

Publishing a program's results (Results page → Publish) posts the top-3
placements to a WhatsApp group via [CallMeBot](https://www.callmebot.com/blog/free-api-whatsapp-messages/).
One-time setup:

1. Create the WhatsApp group and add CallMeBot's number
   (`+34 644 51 95 23`) to it.
2. From your phone, send this exact message to the group:
   `I allow callmebot to send messages to this group`
3. CallMeBot replies privately with a Group ID and API key.
4. Set `CALLMEBOT_GROUP_ID` and `CALLMEBOT_APIKEY` in `.env.local` to those
   values.

If either variable is unset, publishing still works — the notification is
skipped with a warning logged instead of blocking the publish action.

