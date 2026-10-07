const request = async (path, options = {}) => {
  const token = localStorage.getItem('token');
  const headers = new Headers(options.headers || {});
  if (!(options.body instanceof FormData)) headers.set('Content-Type', 'application/json');
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const response = await fetch(`/api${path}`, { 
    ...options, 
    headers 
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    if (response.status === 401) window.dispatchEvent(new Event('auth-expired'));
    throw new Error(data.message || `Request failed (${response.status})`);
  }
  return data;
};

export const api = {
  login: body => request('/auth/login', { 
    method: 'POST', 
    body: JSON.stringify(body) 
  }),
  register: body => request('/auth/register', { 
    method: 'POST', 
    body: JSON.stringify(body) 
  }),
  templates: () => request('/templates'),
  saveTemplate: body => request('/templates', { 
    method: 'POST', 
    body: JSON.stringify(body) 
  }),
  deleteTemplate: id => request(`/templates/${encodeURIComponent(id)}`, { 
    method: 'DELETE' 
  }),
  sendMail: body => request('/mail/send', { 
    method: 'POST', 
    body 
  }),
};