import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import UnsubscribeWatchlistPage, { metadata as unsubscribeMetadata } from "../app/watchlist/unsubscribe/page";
import VerifyWatchlistPage, { metadata as verifyMetadata } from "../app/watchlist/verify/page";

describe("watchlist token pages", () => {
  it("requires a deliberate confirmation POST and is not indexed", async () => {
    const html = renderToStaticMarkup(
      await VerifyWatchlistPage({ searchParams: Promise.resolve({ token: "fixture-token" }) }),
    );
    expect(html).toContain("Confirm signup");
    expect(html).toContain('name="token"');
    expect(html).toContain('value="fixture-token"');
    expect(verifyMetadata.robots).toEqual({ index: false, follow: false });
  });

  it("keeps unsubscribe responses generic and requires a button press", async () => {
    const html = renderToStaticMarkup(
      await UnsubscribeWatchlistPage({ searchParams: Promise.resolve({ token: "fixture-token" }) }),
    );
    expect(html).toContain("Process unsubscribe");
    expect(html).toContain("cannot reveal whether an address was subscribed");
    expect(unsubscribeMetadata.robots).toEqual({ index: false, follow: false });
  });
});
