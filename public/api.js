export async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    ...options,
    headers: {
      Accept: "application/json",
      ...options.headers,
    },
  });

  const contentType = response.headers.get("content-type") || "";
  const payload =
    response.status !== 204 && contentType.includes("application/json")
      ? await response.json()
      : null;

  if (!response.ok) {
    const apiError = payload?.error || {};
    const error = new Error(apiError.message || `Request failed (${response.status})`);
    error.status = response.status;
    error.fields = apiError.fields || {};
    throw error;
  }

  return payload?.data ?? null;
}
