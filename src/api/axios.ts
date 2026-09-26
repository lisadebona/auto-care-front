import axios, { type AxiosError } from 'axios';

const apiClient = axios.create({
  baseURL: 'http://localhost:8000',
  withCredentials: true,
  withXSRFToken: true,
  headers: {
    'Content-Type': 'application/json',
    Accept: 'application/json',
  },
});

export const setupInterceptors = (onUnauthorized?: () => void): void => {
  apiClient.interceptors.response.use(
    (response) => response,
    (error: AxiosError) => {
      if (error.response?.status === 401) {
        onUnauthorized?.();
      }
      return Promise.reject(error);
    },
  );
};

export const postForm = (url: string, data: FormData) => apiClient.post(url, data, {
  headers: { 'Content-Type': 'multipart/form-data' },
  transformRequest: [(body, headers) => {
    if (body instanceof FormData) {
      delete headers['Content-Type'];
    }

    return body;
  }],
});

export default apiClient;
