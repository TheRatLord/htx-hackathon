// Platform stop names for the bay diagram ("Northwest Transit Center - Platform 2"). The TC
// detail has only stop ids, so the names come from the static stops file the map also loads
// (precached by the service worker). TODO(requests.md): a shared stop-name lookup in src/lib.

import { useEffect, useState } from "react";
import type { ClientStop } from "../../../api/types.ts";

let names: Promise<Map<string, string>> | null = null;
const loadNames = () =>
  (names ??= fetch("/data/stops.json")
    .then((r) => r.json() as Promise<ClientStop[]>)
    .then((stops) => new Map(stops.map((s) => [s.id, s.name])))
    .catch(() => {
      names = null;
      return new Map<string, string>();
    }));

/** Stop id → name; empty until loaded (labels then fall back to "Stop #79"). */
export function usePlatformNames(): Map<string, string> {
  const [map, setMap] = useState<Map<string, string>>(new Map());
  useEffect(() => {
    let live = true;
    void loadNames().then((m) => live && setMap(m));
    return () => {
      live = false;
    };
  }, []);
  return map;
}
