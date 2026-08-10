const LOCAL_HOSTNAMES = new Set(["127.0.0.1", "localhost"]);

export class ConvexEnvironmentError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConvexEnvironmentError";
  }
}

export function getOptionalConvexUrl(value: string | undefined): string | null {
  const candidate = value?.trim();

  if (!candidate) {
    return null;
  }

  let url: URL;

  try {
    url = new URL(candidate);
  } catch {
    throw new ConvexEnvironmentError(
      "NEXT_PUBLIC_CONVEX_URL must be a valid absolute URL.",
    );
  }

  const isSecure = url.protocol === "https:";
  const isLocal = url.protocol === "http:" && LOCAL_HOSTNAMES.has(url.hostname);

  if (!isSecure && !isLocal) {
    throw new ConvexEnvironmentError(
      "NEXT_PUBLIC_CONVEX_URL must use HTTPS, except for an HTTP localhost deployment.",
    );
  }

  return url.toString().replace(/\/$/, "");
}

export function requireConvexUrl(value: string | undefined): string {
  const url = getOptionalConvexUrl(value);

  if (!url) {
    throw new ConvexEnvironmentError(
      "NEXT_PUBLIC_CONVEX_URL is required. Run `npx convex dev` to configure a local deployment.",
    );
  }

  return url;
}
