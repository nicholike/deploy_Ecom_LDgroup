import { API_BASE_URL } from "../config/env";

type ApiBody = BodyInit | Record<string, unknown> | undefined | null;

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  body?: ApiBody;
  headers?: HeadersInit;
  authToken?: string | null;
}

export async function apiClient<TResponse = unknown>(
  endpoint: string,
  options: ApiRequestOptions = {},
): Promise<TResponse> {
  const { body, headers, authToken, ...restOptions } = options;

  const finalHeaders = new Headers(headers ?? {});

  let finalBody: BodyInit | undefined;
  if (body instanceof FormData || typeof body === "string" || body instanceof Blob) {
    finalBody = body as BodyInit;
  } else if (body !== undefined && body !== null) {
    finalHeaders.set("Content-Type", "application/json");
    finalBody = JSON.stringify(body);
  }

  if (authToken) {
    finalHeaders.set("Authorization", `Bearer ${authToken}`);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...restOptions,
    headers: finalHeaders,
    body: finalBody,
  });

  const hasContent = response.status !== 204;
  let data: any = null;

  if (hasContent) {
    const text = await response.text();
    data = text ? JSON.parse(text) : null;
  }

  const unwrapPayload = () => {
    if (data && typeof data === "object" && "success" in data && "data" in data) {
      const envelope = data as { success: boolean; data: unknown; message?: unknown };
      if (envelope.success) {
        return envelope.data as TResponse;
      }
      const message =
        (typeof envelope.message === "string" && envelope.message) || response.statusText || "Request failed";
      throw new Error(message);
    }

    return data as TResponse;
  };

  if (!response.ok) {
    const message =
      (data && typeof data === "object" && "message" in data && data.message) ||
      response.statusText ||
      "Request failed";
    throw new Error(String(message));
  }

  return unwrapPayload();
}
