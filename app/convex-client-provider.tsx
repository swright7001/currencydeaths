"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { type ReactNode, useMemo } from "react";

type ConvexClientProviderProps = Readonly<{
  children: ReactNode;
  url: string | null;
}>;

export function ConvexClientProvider({
  children,
  url,
}: ConvexClientProviderProps) {
  const client = useMemo(() => (url ? new ConvexReactClient(url) : null), [url]);

  if (!client) {
    return children;
  }

  return <ConvexProvider client={client}>{children}</ConvexProvider>;
}
