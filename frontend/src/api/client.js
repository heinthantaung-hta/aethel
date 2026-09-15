const API_BASE = '/api';

async function request(endpoint, options = {}, customToken = null) {
  const url = `${API_BASE}${endpoint}`;
  const token = customToken || localStorage.getItem('aethel_token');

  const headers = { 'Content-Type': 'application/json', ...options.headers };

  if (options.body instanceof FormData) delete headers['Content-Type'];
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const response = await fetch(url, { ...options, headers });

  if (response.status === 204) return null;

  const data = await response.json();

  if (!response.ok) {
    if (response.status === 401 && !endpoint.startsWith('/auth/')) {
      localStorage.removeItem('aethel_token');
      window.location.href = '/login';
      return;
    }
    const error = new Error(data.message || 'An error occurred');
    error.status = response.status;
    error.data = data;
    throw error;
  }

  return data;
}

export const api = {
  // Auth
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  signup: (data) => request('/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  getMe: (token) => request('/auth/me', {}, token),

  // Email verification
  verifyEmail: (data) => request('/auth/verify-email', { method: 'POST', body: JSON.stringify(data) }),
  resendCode: (data) => request('/auth/resend-code', { method: 'POST', body: JSON.stringify(data) }),

  // 2FA
  setup2FA: () => request('/auth/setup-2fa', { method: 'POST' }),
  confirm2FA: (code) => request('/auth/confirm-2fa', { method: 'POST', body: JSON.stringify({ code }) }),
  verify2FA: (data) => request('/auth/verify-2fa', { method: 'POST', body: JSON.stringify(data) }),
  disable2FA: (password) => request('/auth/disable-2fa', { method: 'POST', body: JSON.stringify({ password }) }),

  // Profile
  updateProfile: (data) => request('/profile', { method: 'PUT', body: JSON.stringify(data) }),
  uploadAvatar: (formData) => request('/profile/avatar', { method: 'POST', body: formData }),
  deleteAvatar: () => request('/profile/avatar', { method: 'DELETE' }),
  getPublicProfile: (username) => request(`/profile/u/${username}`),

  // Media items
  getAll: () => request('/media'),
  getById: (id) => request(`/media/${id}`),
  getLatest: () => request('/media/latest'),
  getStats: () => request('/media/stats'),
  getBacklog: () => request('/media/backlog'),
  getBacklogNext: () => request('/media/backlog-next'),
  getTypes: () => request('/media/types'),
  getGenres: () => request('/media/genres'),
  create: (data) => request('/media', { method: 'POST', body: JSON.stringify(data) }),
  update: (id, data) => request(`/media/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateStatus: (id, status) =>
    request(`/media/${id}/status`, { method: 'PATCH', body: JSON.stringify({ completion_status: status }) }),
  updateRating: (id, rating) =>
    request(`/media/${id}/rating`, { method: 'PATCH', body: JSON.stringify({ rating }) }),
  delete: (id) => request(`/media/${id}`, { method: 'DELETE' }),

  // TMDB Movie Search
  searchMovies: (q) => request(`/movies/search?q=${encodeURIComponent(q)}`),
  getMovieDetails: (tmdbId) => request(`/movies/tmdb/${tmdbId}`),

  // Posts (Social Feed)
  getPosts: () => request('/posts'),
  getPost: (id) => request(`/posts/${id}`),
  createPost: (data) => request('/posts', { method: 'POST', body: JSON.stringify(data) }),
  editPost: (id, data) => request(`/posts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deletePost: (id) => request(`/posts/${id}`, { method: 'DELETE' }),
  toggleLove: (id) => request(`/posts/${id}/love`, { method: 'POST' }),
  getComments: (id) => request(`/posts/${id}/comments`),
  addComment: (id, body) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ body }) }),
  addReply: (id, body, parentId) => request(`/posts/${id}/comments`, { method: 'POST', body: JSON.stringify({ body, parent_comment_id: parentId }) }),
  editComment: (id, body) => request(`/posts/comments/${id}`, { method: 'PUT', body: JSON.stringify({ body }) }),
  deleteComment: (id) => request(`/posts/comments/${id}`, { method: 'DELETE' }),

  // Reports
  submitReport: (data) => request('/reports', { method: 'POST', body: JSON.stringify(data) }),

  // Admin
  adminGetPosts: (status) => request(`/admin/posts${status ? `?status=${status}` : ''}`),
  adminGetUsers: () => request('/admin/users'),
  adminUpdatePostStatus: (id, status) =>
    request(`/admin/posts/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }),
  adminDeletePost: (id) => request(`/admin/posts/${id}`, { method: 'DELETE' }),
  adminDeleteComment: (id) => request(`/admin/comments/${id}`, { method: 'DELETE' }),
  adminBanUser: (id, banned) =>
    request(`/admin/users/${id}/ban`, { method: 'PATCH', body: JSON.stringify({ banned }) }),
  adminGetReports: (status) => request(`/admin/reports${status ? `?status=${status}` : ''}`),
  adminUpdateReport: (id, data) =>
    request(`/admin/reports/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  adminGetReportCount: () => request('/admin/reports/count'),

  // What's New — TMDB movie feeds
  getNowPlaying: () => request('/movies/now-playing'),
  getUpcoming:   () => request('/movies/upcoming'),
  getPopular:    () => request('/movies/popular'),
  getTrending:   () => request('/movies/trending'),
};

