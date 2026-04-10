const BASE = '/api';

async function request(method, path, { body, headers: extra } = {}) {
  const url = `${BASE}${path}`;
  const headers = { ...extra };

  let reqBody;
  if (body !== undefined && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(body);
  } else {
    reqBody = body;
  }

  const res = await fetch(url, { method, headers, body: reqBody });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    const err = new Error(`${res.status}: ${text || res.statusText}`);
    err.status = res.status;
    throw err;
  }

  const ct = res.headers.get('content-type') || '';
  return ct.includes('application/json') ? res.json() : res.text();
}

export const api = {
  get: (path) => request('GET', path),
  post: (path, body) => request('POST', path, { body }),
  put: (path, body) => request('PUT', path, { body }),
  patch: (path, body) => request('PATCH', path, { body }),
  del: (path) => request('DELETE', path),
  uploadFile: (path, formData) => request('POST', path, { body: formData }),
};
