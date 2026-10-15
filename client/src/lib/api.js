// A small wrapper around fetch for talking to the SplitEase API.

export class ApiError extends Error {
  constructor(status, message, field) {
    super(message);
    this.status = status;
    this.field = field;
  }
}

let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body) {
  const options = { method, credentials: 'same-origin', headers: {} };
  if (body instanceof FormData) {
    options.body = body;
  } else if (body !== undefined) {
    options.headers['Content-Type'] = 'application/json';
    options.body = JSON.stringify(body);
  }

  let response;
  try {
    response = await fetch(`/api${path}`, options);
  } catch {
    throw new ApiError(0, 'Could not reach the server. Check that it is running and try again.');
  }

  let data = null;
  try {
    data = await response.json();
  } catch {
    // Not every response has a body.
  }

  if (!response.ok) {
    if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized();
    throw new ApiError(
      response.status,
      data?.error || 'Something went wrong. Try again.',
      data?.field,
    );
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, body),
  patch: (path, body) => request('PATCH', path, body),
  delete: (path) => request('DELETE', path),
};
