import { api } from "./api";

export async function login(email: string, password: string) {
  const data = await api.post<{ access_token: string }>("/auth/login", { email, password });
  localStorage.setItem("access_token", data.access_token);
}

export async function register(email: string, password: string, role = "pilot") {
  const data = await api.post<{ access_token: string }>("/auth/register", { email, password, role });
  localStorage.setItem("access_token", data.access_token);
}

export function logout() {
  localStorage.removeItem("access_token");
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}
