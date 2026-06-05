import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
});

// Attach token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('agentflow_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('agentflow_token');
      localStorage.removeItem('agentflow_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  me: () => api.get('/auth/me'),
};

// Pipelines
export const pipelineAPI = {
  list: () => api.get('/pipelines'),
  get: (id) => api.get(`/pipelines/${id}`),
  create: (data) => api.post('/pipelines', data),
  update: (id, data) => api.put(`/pipelines/${id}`, data),
  delete: (id) => api.delete(`/pipelines/${id}`),
};

// Executions
export const executionAPI = {
  list: () => api.get('/executions'),
  get: (id) => api.get(`/executions/${id}`),
  start: (data) => api.post('/executions', data),
  approve: (id) => api.post(`/executions/${id}/approve`),
  reject: (id) => api.post(`/executions/${id}/reject`),
};

export default api;
