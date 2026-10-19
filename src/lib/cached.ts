import "server-only";
import { unstable_cache } from "next/cache";
import { scanToken } from "./scan";

// One scan per token per minute, shared by the page, its preview image and the API.
export const cachedScan = (address: string) =>
  unstable_cache(() => scanToken(address), ["scan", address.toLowerCase()], { revalidate: 60 })();
