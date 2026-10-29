import { createFileRoute, redirect } from "@tanstack/react-router";

// The demo page is the uploaded InkGuard frontend, served verbatim from
// public/inkguard/index.html. "/" redirects straight to it.
export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InkGuard — Nothing ships that you can't prove" },
      {
        name: "description",
        content:
          "InkGuard checks ad copy against your approved brand rules and approved facts, and shows the page, the quote and the owner behind every flag.",
      },
      { property: "og:title", content: "InkGuard — Nothing ships that you can't prove" },
      {
        property: "og:description",
        content:
          "Paste the draft. Get the receipts: banned terms, conflicting numbers, expired facts — every finding with its proof.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  beforeLoad: () => {
    throw redirect({ href: "/inkguard/index.html", replace: true });
  },
});
