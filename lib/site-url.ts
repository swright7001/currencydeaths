const LOCAL_SITE_URL = "http://localhost:3000";

export class SiteUrlConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SiteUrlConfigurationError";
  }
}

function asProviderOrigin(value: string | undefined): string | undefined {
  const candidate = value?.trim();
  if (!candidate) return undefined;
  return candidate.includes("://") ? candidate : `https://${candidate}`;
}

function providerSiteUrl(): string | undefined {
  return asProviderOrigin(
    process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL,
  );
}

export function resolveSiteUrl(
  value = process.env.CURRENCYDEATHS_SITE_URL,
  providerValue = providerSiteUrl(),
): URL {
  const candidate = value?.trim() || asProviderOrigin(providerValue) || LOCAL_SITE_URL;
  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new SiteUrlConfigurationError(
      "CURRENCYDEATHS_SITE_URL must be an absolute HTTP(S) origin.",
    );
  }

  const isLocalHttp =
    url.protocol === "http:" &&
    (url.hostname === "localhost" || url.hostname === "127.0.0.1");
  if (url.protocol !== "https:" && !isLocalHttp) {
    throw new SiteUrlConfigurationError(
      "CURRENCYDEATHS_SITE_URL must use HTTPS outside local development.",
    );
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new SiteUrlConfigurationError(
      "CURRENCYDEATHS_SITE_URL must contain only an origin, without credentials, path, query, or fragment.",
    );
  }

  return url;
}

export function absoluteSiteUrl(pathname: string, origin = resolveSiteUrl()): string {
  if (!pathname.startsWith("/")) {
    throw new SiteUrlConfigurationError("Site URL paths must begin with a slash.");
  }
  return new URL(pathname, origin).toString();
}
