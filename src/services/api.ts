import axios from "axios";

const apiBase = import.meta.env.VITE_API_BASE_URL || "";

const api = axios.create({
  baseURL: apiBase ? `${apiBase}/api` : "/api",
});

export function setAuthToken(token: string) {
  api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
}

export default api;
