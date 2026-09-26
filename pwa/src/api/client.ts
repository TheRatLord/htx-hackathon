/** An API failure. `code` is the server's error code in lower case ("stop_not_found"), or "network". */
export class ApiError extends Error {
  constructor(
    public code: string,
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export async function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params ?? {})) if (v !== undefined && v !== "") query.set(k, String(v));
  const qs = query.toString();
  let res: Response;
  try {
    res = await fetch(`/api${path}${qs ? `?${qs}` : ""}`, { headers: { Accept: "application/json" } });
  } catch {
    throw new ApiError("network", 0, "We couldn't reach RideMETRO. Check your connection and try again.");
  }
  const body = (await res.json().catch(() => null)) as { error?: { code?: string; message?: string } } | null;
  if (!res.ok) {
    const code = body?.error?.code?.toLowerCase() ?? "unknown";
    throw new ApiError(code, res.status, body?.error?.message ?? `Request failed (HTTP ${res.status}).`);
  }
  return body as T;
}
