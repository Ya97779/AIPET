export interface User {
  id: string;
  username: string;
  nickname: string | null;
  avatar_url: string | null;
  points_balance: number;
}

export function getToken(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('token');
}

export function setToken(token: string): void {
  localStorage.setItem('token', token);
}

export function removeToken(): void {
  localStorage.removeItem('token');
}

export function getUser(): User | null {
  if (typeof window === 'undefined') return null;
  const data = localStorage.getItem('user');
  return data ? JSON.parse(data) : null;
}

export function setUser(user: User): void {
  localStorage.setItem('user', JSON.stringify(user));
}

export function isLoggedIn(): boolean {
  return !!getToken();
}

export function logout(): void {
  removeToken();
  localStorage.removeItem('user');
  window.location.href = '/login';
}
