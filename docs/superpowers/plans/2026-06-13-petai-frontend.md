# PetAI Mind - 前端应用实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 用Next.js 14+构建完整的前端应用，包含登录、Dashboard、宠物管理、AI问诊（传图识病+对话医生）、智能食谱，集成SSE流式传输。

**Architecture:** Next.js 14 App Router + shadcn/ui + Tailwind CSS + ECharts，前后端通过REST API和SSE通信，Token存localStorage。

**Tech Stack:** Next.js 14, React 18, shadcn/ui, Tailwind CSS, ECharts, EventSource API

---

## 文件结构总览

```
apps/web/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx              # 登录页
│   ├── (dashboard)/
│   │   ├── layout.tsx                   # 主布局（侧边栏）
│   │   ├── page.tsx                     # Dashboard首页
│   │   ├── pets/
│   │   │   ├── page.tsx                 # 宠物列表
│   │   │   ├── new/page.tsx             # 新建宠物
│   │   │   └── [id]/page.tsx            # 宠物详情/编辑
│   │   ├── consultation/
│   │   │   ├── page.tsx                 # 问诊大厅
│   │   │   ├── image/page.tsx           # 传图识病
│   │   │   └── chat/[sessionId]/page.tsx # AI对话
│   │   └── recipe/page.tsx              # 智能食谱
│   ├── layout.tsx                       # 根布局
│   └── globals.css                      # 全局样式
├── components/
│   ├── ui/                              # shadcn/ui组件
│   ├── layout/
│   │   ├── sidebar.tsx                  # 侧边栏导航
│   │   └── header.tsx                   # 顶部栏
│   ├── pet/
│   │   ├── pet-card.tsx                 # 宠物卡片
│   │   ├── pet-form.tsx                 # 宠物表单
│   │   └── weight-chart.tsx             # 体重趋势图
│   ├── consultation/
│   │   ├── chat-bubble.tsx              # 聊天气泡
│   │   ├── chat-input.tsx               # 输入框
│   │   ├── diagnosis-report.tsx         # 诊断报告卡片
│   │   └── sse-stream.tsx               # SSE流式组件
│   └── recipe/
│       └── recipe-card.tsx              # 食谱卡片
├── lib/
│   ├── api.ts                           # API客户端
│   ├── auth.ts                          # 认证工具
│   ├── sse.ts                           # SSE工具
│   └── utils.ts                         # 通用工具
├── next.config.js
├── tailwind.config.ts
├── package.json
└── tsconfig.json
```

---

### Task 1: Next.js项目初始化

**Files:**
- Create: `ai-pet/apps/web/package.json`
- Create: `ai-pet/apps/web/next.config.js`
- Create: `ai-pet/apps/web/tailwind.config.ts`
- Create: `ai-pet/apps/web/tsconfig.json`
- Create: `ai-pet/apps/web/app/layout.tsx`
- Create: `ai-pet/apps/web/app/globals.css`

- [ ] **Step 1: 创建package.json**

```json
{
  "name": "@ai-pet/web",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --port 3000",
    "build": "next build",
    "start": "next start"
  },
  "dependencies": {
    "next": "^14.2.0",
    "react": "^18.3.0",
    "react-dom": "^18.3.0",
    "echarts": "^5.5.0",
    "echarts-for-react": "^3.0.2",
    "class-variance-authority": "^0.7.0",
    "clsx": "^2.1.0",
    "tailwind-merge": "^2.2.0",
    "lucide-react": "^0.344.0"
  },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/react": "^18.2.0",
    "@types/react-dom": "^18.2.0",
    "autoprefixer": "^10.4.17",
    "postcss": "^8.4.33",
    "tailwindcss": "^3.4.1",
    "typescript": "^5.3.3"
  }
}
```

- [ ] **Step 2: 创建next.config.js**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://127.0.0.1:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;
```

- [ ] **Step 3: 创建tailwind.config.ts**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8',
        },
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 4: 创建tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "es5",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": true,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

- [ ] **Step 5: 创建根布局**

```tsx
// apps/web/app/layout.tsx
import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '宠爱智囊 - PetAI Mind',
  description: '智能宠物健康管理系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  );
}
```

- [ ] **Step 6: 创建全局样式**

```css
/* apps/web/app/globals.css */
@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
  }
}

body {
  color: #1a1a1a;
}
```

- [ ] **Step 7: 安装依赖**

```bash
cd D:/桌面/AiPet/ai-pet/apps/web
pnpm install
```

- [ ] **Step 8: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: initialize Next.js frontend with Tailwind"
```

---

### Task 2: API客户端和认证工具

**Files:**
- Create: `ai-pet/apps/web/lib/api.ts`
- Create: `ai-pet/apps/web/lib/auth.ts`
- Create: `ai-pet/apps/web/lib/utils.ts`

- [ ] **Step 1: 创建API客户端**

```ts
// apps/web/lib/api.ts
const API_BASE = '/api';

async function getHeaders(): Promise<HeadersInit> {
  const headers: HeadersInit = { 'Content-Type': 'application/json' };
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, { headers: await getHeaders() });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiPut<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'PUT',
    headers: await getHeaders(),
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}

export async function apiDelete(path: string): Promise<void> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'DELETE',
    headers: await getHeaders(),
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
}

export async function apiUpload<T>(path: string, formData: FormData): Promise<T> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  const headers: HeadersInit = {};
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${API_BASE}${path}`, { method: 'POST', headers, body: formData });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json();
}
```

- [ ] **Step 2: 创建认证工具**

```ts
// apps/web/lib/auth.ts
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
```

- [ ] **Step 3: 创建通用工具**

```ts
// apps/web/lib/utils.ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString('zh-CN');
}

export function formatWeight(weight: number | null): string {
  return weight ? `${weight} kg` : '未记录';
}
```

- [ ] **Step 4: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add API client, auth utils, and helpers"
```

---

### Task 3: 登录页

**Files:**
- Create: `ai-pet/apps/web/app/(auth)/login/page.tsx`

- [ ] **Step 1: 创建登录页**

```tsx
// apps/web/app/(auth)/login/page.tsx
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { setToken, setUser } from '@/lib/auth';

interface LoginResponse {
  token: string;
  user: { id: string; username: string; nickname: string | null; avatar_url: string | null; points_balance: number };
}

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = await apiPost<LoginResponse>('/auth/login', { username, password });
      setToken(data.token);
      setUser(data.user);
      router.push('/');
    } catch {
      setError('用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">🐾 宠爱智囊</h1>
          <p className="text-gray-500 mt-2">PetAI Mind - 智能宠物健康管理</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入用户名"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="请输入密码"
              required
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>测试账号：user1 / 123456</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add login page"
```

---

### Task 4: 主布局和Dashboard

**Files:**
- Create: `ai-pet/apps/web/components/layout/sidebar.tsx`
- Create: `ai-pet/apps/web/app/(dashboard)/layout.tsx`
- Create: `ai-pet/apps/web/app/(dashboard)/page.tsx`

- [ ] **Step 1: 创建侧边栏**

```tsx
// apps/web/components/layout/sidebar.tsx
'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logout, getUser } from '@/lib/auth';
import { Home, PawPrint, Stethoscope, ChefHat, LogOut } from 'lucide-react';

const navItems = [
  { href: '/', label: '首页', icon: Home },
  { href: '/pets', label: '宠物档案', icon: PawPrint },
  { href: '/consultation', label: 'AI问诊', icon: Stethoscope },
  { href: '/recipe', label: '智能食谱', icon: ChefHat },
];

export function Sidebar() {
  const pathname = usePathname();
  const user = getUser();

  return (
    <aside className="w-64 bg-white border-r border-gray-200 flex flex-col">
      <div className="p-6 border-b border-gray-200">
        <h1 className="text-xl font-bold text-gray-900">🐾 宠爱智囊</h1>
        <p className="text-sm text-gray-500 mt-1">{user?.nickname || user?.username}</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <button
          onClick={logout}
          className="flex items-center gap-3 w-full px-4 py-3 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors"
        >
          <LogOut size={20} />
          退出登录
        </button>
      </div>
    </aside>
  );
}
```

- [ ] **Step 2: 创建Dashboard布局**

```tsx
// apps/web/app/(dashboard)/layout.tsx
'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { isLoggedIn } from '@/lib/auth';
import { Sidebar } from '@/components/layout/sidebar';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) router.push('/login');
  }, [router]);

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 p-8 bg-gray-50">{children}</main>
    </div>
  );
}
```

- [ ] **Step 3: 创建Dashboard首页**

```tsx
// apps/web/app/(dashboard)/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet } from '@/lib/api';
import { PawPrint, Stethoscope, ChefHat, TrendingUp } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  weight_kg: number | null;
}

export default function DashboardPage() {
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets).catch(() => {});
  }, []);

  const quickLinks = [
    { href: '/consultation/image', label: '传图识病', icon: Stethoscope, color: 'bg-red-50 text-red-700' },
    { href: '/consultation', label: 'AI对话医生', icon: Stethoscope, color: 'bg-blue-50 text-blue-700' },
    { href: '/recipe', label: '智能食谱', icon: ChefHat, color: 'bg-green-50 text-green-700' },
    { href: '/pets', label: '宠物档案', icon: PawPrint, color: 'bg-purple-50 text-purple-700' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-gray-900 mb-6">仪表盘</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {quickLinks.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`${link.color} p-6 rounded-xl hover:shadow-md transition-shadow`}
            >
              <Icon size={28} className="mb-3" />
              <h3 className="font-medium">{link.label}</h3>
            </Link>
          );
        })}
      </div>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-4 flex items-center gap-2">
          <PawPrint size={20} />
          我的宠物
        </h2>
        {pets.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p>还没有添加宠物</p>
            <Link href="/pets/new" className="text-blue-600 hover:underline mt-2 inline-block">
              立即添加
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pets.map((pet) => (
              <Link
                key={pet.id}
                href={`/pets/${pet.id}`}
                className="border border-gray-200 rounded-lg p-4 hover:border-blue-300 transition-colors"
              >
                <h3 className="font-medium text-gray-900">{pet.name}</h3>
                <p className="text-sm text-gray-500">{pet.breed}</p>
                <p className="text-sm text-gray-500 mt-1">{pet.weight_kg ? `${pet.weight_kg} kg` : '未记录体重'}</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add dashboard layout and homepage"
```

---

### Task 5: 宠物档案页面

**Files:**
- Create: `ai-pet/apps/web/app/(dashboard)/pets/page.tsx`
- Create: `ai-pet/apps/web/app/(dashboard)/pets/new/page.tsx`
- Create: `ai-pet/apps/web/app/(dashboard)/pets/[id]/page.tsx`
- Create: `ai-pet/apps/web/components/pet/pet-form.tsx`

- [ ] **Step 1: 宠物列表页**

```tsx
// apps/web/app/(dashboard)/pets/page.tsx
'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { apiGet, apiDelete } from '@/lib/api';
import { Plus, Trash2, Edit } from 'lucide-react';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  neutered: boolean;
  weight_kg: number | null;
  created_at: string;
}

export default function PetsPage() {
  const [pets, setPets] = useState<Pet[]>([]);

  useEffect(() => {
    apiGet<Pet[]>('/pets').then(setPets);
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除这只宠物？')) return;
    await apiDelete(`/pets/${id}`);
    setPets(pets.filter(p => p.id !== id));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">宠物档案</h1>
        <Link href="/pets/new" className="bg-blue-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-700">
          <Plus size={18} /> 添加宠物
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {pets.map((pet) => (
          <div key={pet.id} className="bg-white rounded-xl shadow-sm p-6">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-medium">{pet.name}</h3>
                <p className="text-gray-500 text-sm">{pet.breed} · {pet.gender === 'male' ? '公' : '母'}</p>
                <p className="text-gray-500 text-sm">{pet.weight_kg ? `${pet.weight_kg} kg` : '未记录体重'}</p>
              </div>
              <div className="flex gap-2">
                <Link href={`/pets/${pet.id}`} className="text-gray-400 hover:text-blue-600">
                  <Edit size={18} />
                </Link>
                <button onClick={() => handleDelete(pet.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {pets.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          <p className="text-lg">还没有添加宠物</p>
          <Link href="/pets/new" className="text-blue-600 hover:underline mt-2 inline-block">
            立即添加第一只宠物
          </Link>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 宠物表单组件**

```tsx
// apps/web/components/pet/pet-form.tsx
'use client';

import { useState } from 'react';

interface PetFormData {
  name: string;
  species: string;
  breed: string;
  gender: string;
  neutered: boolean;
  birthday: string;
  weight_kg: string;
  medical_history: string[];
  allergies: string[];
}

interface Props {
  initialData?: Partial<PetFormData>;
  onSubmit: (data: PetFormData) => Promise<void>;
  submitLabel?: string;
}

export function PetForm({ initialData, onSubmit, submitLabel = '保存' }: Props) {
  const [form, setForm] = useState<PetFormData>({
    name: initialData?.name || '',
    species: initialData?.species || 'cat',
    breed: initialData?.breed || '',
    gender: initialData?.gender || 'male',
    neutered: initialData?.neutered || false,
    birthday: initialData?.birthday || '',
    weight_kg: initialData?.weight_kg?.toString() || '',
    medical_history: initialData?.medical_history || [],
    allergies: initialData?.allergies || [],
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmit(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">宠物昵称 *</label>
          <input type="text" value={form.name} onChange={e => setForm({...form, name: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">种类 *</label>
          <select value={form.species} onChange={e => setForm({...form, species: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg">
            <option value="cat">猫</option>
            <option value="dog">狗</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">品种 *</label>
          <input type="text" value={form.breed} onChange={e => setForm({...form, breed: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg" placeholder="如：英短、金毛" required />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">性别 *</label>
          <select value={form.gender} onChange={e => setForm({...form, gender: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg">
            <option value="male">公</option>
            <option value="female">母</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生日</label>
          <input type="date" value={form.birthday} onChange={e => setForm({...form, birthday: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">体重 (kg)</label>
          <input type="number" step="0.1" value={form.weight_kg} onChange={e => setForm({...form, weight_kg: e.target.value})}
            className="w-full px-3 py-2 border rounded-lg" placeholder="4.5" />
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input type="checkbox" id="neutered" checked={form.neutered} onChange={e => setForm({...form, neutered: e.target.checked})} />
        <label htmlFor="neutered" className="text-sm text-gray-700">已绝育</label>
      </div>

      <button type="submit" disabled={loading}
        className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50">
        {loading ? '保存中...' : submitLabel}
      </button>
    </form>
  );
}
```

- [ ] **Step 3: 新建宠物页**

```tsx
// apps/web/app/(dashboard)/pets/new/page.tsx
'use client';

import { useRouter } from 'next/navigation';
import { apiPost } from '@/lib/api';
import { PetForm } from '@/components/pet/pet-form';

export default function NewPetPage() {
  const router = useRouter();

  const handleSubmit = async (data: any) => {
    await apiPost('/pets', {
      ...data,
      weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null,
    });
    router.push('/pets');
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">添加宠物</h1>
      <div className="bg-white rounded-xl shadow-sm p-6">
        <PetForm onSubmit={handleSubmit} submitLabel="创建档案" />
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 宠物详情页**

```tsx
// apps/web/app/(dashboard)/pets/[id]/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { apiGet, apiPut, apiPost } from '@/lib/api';
import { PetForm } from '@/components/pet/pet-form';
import { formatDate, formatWeight } from '@/lib/utils';

interface Pet {
  id: string;
  name: string;
  species: string;
  breed: string;
  gender: string;
  neutered: boolean;
  birthday: string | null;
  weight_kg: number | null;
  medical_history: string[];
  allergies: string[];
}

interface WeightRecord {
  id: string;
  weight_kg: number;
  recorded_at: string;
}

export default function PetDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const [pet, setPet] = useState<Pet | null>(null);
  const [weights, setWeights] = useState<WeightRecord[]>([]);
  const [newWeight, setNewWeight] = useState('');

  useEffect(() => {
    apiGet<Pet>(`/pets/${id}`).then(setPet);
    apiGet<WeightRecord[]>(`/pets/${id}/weight/history`).then(setWeights);
  }, [id]);

  const handleUpdate = async (data: any) => {
    await apiPut(`/pets/${id}`, { ...data, weight_kg: data.weight_kg ? parseFloat(data.weight_kg) : null });
    router.push('/pets');
  };

  const handleAddWeight = async () => {
    if (!newWeight) return;
    const record = await apiPost<WeightRecord>(`/pets/${id}/weight`, {
      weight_kg: parseFloat(newWeight),
      recorded_at: new Date().toISOString().split('T')[0],
    });
    setWeights([record, ...weights]);
    setNewWeight('');
  };

  if (!pet) return <div>加载中...</div>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">{pet.name}</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">基本信息</h2>
          <PetForm initialData={pet} onSubmit={handleUpdate} submitLabel="更新档案" />
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">体重记录</h2>
          <div className="flex gap-2 mb-4">
            <input type="number" step="0.1" value={newWeight} onChange={e => setNewWeight(e.target.value)}
              placeholder="体重(kg)" className="flex-1 px-3 py-2 border rounded-lg" />
            <button onClick={handleAddWeight} className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
              记录
            </button>
          </div>
          <div className="space-y-2">
            {weights.map(w => (
              <div key={w.id} className="flex justify-between py-2 border-b">
                <span className="text-gray-500">{formatDate(w.recorded_at)}</span>
                <span className="font-medium">{w.weight_kg} kg</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add pet management pages (list, create, detail)"
```

---

### Task 6: AI问诊页面（SSE流式）

**Files:**
- Create: `ai-pet/apps/web/lib/sse.ts`
- Create: `ai-pet/apps/web/app/(dashboard)/consultation/page.tsx`
- Create: `ai-pet/apps/web/app/(dashboard)/consultation/image/page.tsx`
- Create: `ai-pet/apps/web/app/(dashboard)/consultation/chat/[sessionId]/page.tsx`
- Create: `ai-pet/apps/web/components/consultation/chat-bubble.tsx`

- [ ] **Step 1: 创建SSE工具**

```ts
// apps/web/lib/sse.ts
export function streamSSE(
  url: string,
  formData: FormData,
  onChunk: (content: string) => void,
  onDone: () => void,
  onError: (error: string) => void,
): () => void {
  const token = localStorage.getItem('token');
  let cancelled = false;

  const controller = new AbortController();

  fetch(url, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
    body: formData,
    signal: controller.signal,
  })
    .then(async (response) => {
      if (!response.ok) {
        onError(`HTTP error: ${response.status}`);
        return;
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done || cancelled) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));
              if (data.type === 'text') onChunk(data.content);
              if (data.type === 'done') { onDone(); return; }
              if (data.type === 'error') { onError(data.content); return; }
            } catch {}
          }
        }
      }
      onDone();
    })
    .catch((err) => {
      if (!cancelled) onError(err.message);
    });

  return () => {
    cancelled = true;
    controller.abort();
  };
}
```

- [ ] **Step 2: 创建聊天气泡组件**

```tsx
// apps/web/components/consultation/chat-bubble.tsx
interface Props {
  role: 'user' | 'assistant';
  content: string;
  isLoading?: boolean;
}

export function ChatBubble({ role, content, isLoading }: Props) {
  const isUser = role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-[80%] rounded-2xl px-4 py-3 ${
        isUser ? 'bg-blue-600 text-white' : 'bg-white border border-gray-200'
      }`}>
        <div className="text-sm whitespace-pre-wrap">
          {content || (isLoading ? '思考中...' : '')}
          {isLoading && <span className="animate-pulse">▌</span>}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: 创建问诊大厅页**

```tsx
// apps/web/app/(dashboard)/consultation/page.tsx
'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { Camera, MessageSquare, ArrowRight } from 'lucide-react';

interface Pet { id: string; name: string; }

export default function ConsultationPage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState('');

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">AI问诊大厅</h1>

      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">选择宠物</label>
        <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)}
          className="w-full max-w-xs px-3 py-2 border rounded-lg">
          <option value="">请选择宠物</option>
          {pets.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link href={selectedPet ? `/consultation/image?petId=${selectedPet}` : '#'}
          className={`bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow ${!selectedPet ? 'opacity-50 pointer-events-none' : ''}`}>
          <Camera size={40} className="text-red-500 mb-4" />
          <h2 className="text-xl font-medium mb-2">传图识病</h2>
          <p className="text-gray-500 mb-4">上传宠物患处照片，AI快速分析可能的病因和护理建议</p>
          <span className="text-blue-600 flex items-center gap-1">开始诊断 <ArrowRight size={16} /></span>
        </Link>

        <button onClick={async () => {
          if (!selectedPet) return;
          const res = await apiPost<{id: string}>('/consultation/chat/start', { pet_id: selectedPet });
          window.location.href = `/consultation/chat/${res.id}`;
        }}
          className={`bg-white rounded-xl shadow-sm p-8 hover:shadow-md transition-shadow text-left ${!selectedPet ? 'opacity-50 pointer-events-none' : ''}`}>
          <MessageSquare size={40} className="text-blue-500 mb-4" />
          <h2 className="text-xl font-medium mb-2">AI对话医生</h2>
          <p className="text-gray-500 mb-4">通过多轮对话，让AI帮你逐步分析宠物健康问题</p>
          <span className="text-blue-600 flex items-center gap-1">开始问诊 <ArrowRight size={16} /></span>
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: 创建传图识病页**

```tsx
// apps/web/app/(dashboard)/consultation/image/page.tsx
'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChatBubble } from '@/components/consultation/chat-bubble';
import { streamSSE } from '@/lib/sse';
import { Upload, Send } from 'lucide-react';

export default function ImageDiagnosisPage() {
  const searchParams = useSearchParams();
  const petId = searchParams.get('petId');
  const [text, setText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = () => {
    if (!text || !petId) return;

    const formData = new FormData();
    formData.append('pet_id', petId);
    formData.append('text', text);
    images.forEach(img => formData.append('images', img));

    setLoading(true);
    setResponse('');

    streamSSE(
      '/api/consultation/image',
      formData,
      (chunk) => setResponse(prev => prev + chunk),
      () => setLoading(false),
      (err) => { setResponse(`错误: ${err}`); setLoading(false); },
    );
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">传图识病</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">上传信息</h2>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">症状描述 *</label>
            <textarea value={text} onChange={e => setText(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg h-32" placeholder="请描述宠物的症状..." />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">上传图片（最多3张）</label>
            <input type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files || []).slice(0, 3))}
              className="w-full" />
          </div>

          <button onClick={handleSubmit} disabled={loading || !text}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            <Send size={18} />
            {loading ? '分析中...' : '开始诊断'}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6">
          <h2 className="text-lg font-medium mb-4">诊断结果</h2>
          {response ? (
            <div className="prose prose-sm max-w-none whitespace-pre-wrap">{response}</div>
          ) : (
            <div className="text-center py-12 text-gray-400">
              <Upload size={48} className="mx-auto mb-4" />
              <p>上传图片并描述症状，AI将为您分析</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: 创建AI对话页**

```tsx
// apps/web/app/(dashboard)/consultation/chat/[sessionId]/page.tsx
'use client';

import { useEffect, useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { apiGet } from '@/lib/api';
import { ChatBubble } from '@/components/consultation/chat-bubble';
import { streamSSE } from '@/lib/sse';
import { Send } from 'lucide-react';

interface Message { id: string; role: string; content: string; created_at: string; }

export default function ChatPage() {
  const { sessionId } = useParams();
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [streamingContent, setStreamingContent] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    apiGet<Message[]>(`/consultation/chat/${sessionId}/history`).then(setMessages);
  }, [sessionId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streamingContent]);

  const handleSend = () => {
    if (!input || loading) return;

    const userMsg: Message = { id: Date.now().toString(), role: 'user', content: input, created_at: new Date().toISOString() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    setStreamingContent('');

    const formData = new FormData();
    formData.append('text', userMsg.content);

    streamSSE(
      `/api/consultation/chat/${sessionId}`,
      formData,
      (chunk) => setStreamingContent(prev => prev + chunk),
      () => {
        if (streamingContent) {
          setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: streamingContent, created_at: new Date().toISOString() }]);
        }
        setStreamingContent('');
        setLoading(false);
      },
      (err) => {
        setMessages(prev => [...prev, { id: Date.now().toString(), role: 'assistant', content: `错误: ${err}`, created_at: new Date().toISOString() }]);
        setLoading(false);
      },
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <h1 className="text-2xl font-bold mb-4">AI对话医生</h1>

      <div className="flex-1 overflow-y-auto bg-white rounded-xl shadow-sm p-6 mb-4">
        {messages.map(msg => (
          <ChatBubble key={msg.id} role={msg.role as 'user' | 'assistant'} content={msg.content} />
        ))}
        {loading && <ChatBubble role="assistant" content={streamingContent} isLoading />}
        <div ref={bottomRef} />
      </div>

      <div className="flex gap-2">
        <input type="text" value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          className="flex-1 px-4 py-3 border rounded-xl" placeholder="描述宠物的症状..." disabled={loading} />
        <button onClick={handleSend} disabled={loading || !input}
          className="bg-blue-600 text-white px-6 py-3 rounded-xl hover:bg-blue-700 disabled:opacity-50">
          <Send size={20} />
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 6: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add AI consultation pages with SSE streaming"
```

---

### Task 7: 智能食谱页

**Files:**
- Create: `ai-pet/apps/web/app/(dashboard)/recipe/page.tsx`
- Create: `ai-pet/apps/web/components/recipe/recipe-card.tsx`

- [ ] **Step 1: 创建食谱卡片组件**

```tsx
// apps/web/components/recipe/recipe-card.tsx
interface FoodItem {
  name: string;
  amount_g: number;
}

interface RecipeData {
  daily_calories: number;
  food_items: {
    main_food?: { name: string; amount_g: number };
    supplements?: FoodItem[];
    nutrition_ratio?: { protein: number; fat: number; carb: number };
    raw_response?: string;
  };
  rer?: number;
  factor?: number;
}

export function RecipeCard({ recipe }: { recipe: RecipeData }) {
  const { food_items } = recipe;

  if (food_items.raw_response) {
    return (
      <div className="bg-white rounded-xl shadow-sm p-6">
        <h3 className="text-lg font-medium mb-2">食谱建议</h3>
        <p className="whitespace-pre-wrap text-gray-700">{food_items.raw_response}</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-medium">今日食谱</h3>
        <span className="text-2xl font-bold text-blue-600">{recipe.daily_calories} kcal</span>
      </div>

      {food_items.main_food && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">🥩 主食</h4>
          <div className="flex justify-between py-2 border-b">
            <span>{food_items.main_food.name}</span>
            <span className="font-medium">{food_items.main_food.amount_g}g</span>
          </div>
        </div>
      )}

      {food_items.supplements && food_items.supplements.length > 0 && (
        <div className="mb-4">
          <h4 className="text-sm font-medium text-gray-500 mb-2">🥗 自制辅食</h4>
          {food_items.supplements.map((item, i) => (
            <div key={i} className="flex justify-between py-2 border-b">
              <span>{item.name}</span>
              <span className="font-medium">{item.amount_g}g</span>
            </div>
          ))}
        </div>
      )}

      {food_items.nutrition_ratio && (
        <div>
          <h4 className="text-sm font-medium text-gray-500 mb-2">📈 营养配比</h4>
          <div className="flex gap-4">
            <span>蛋白质 {food_items.nutrition_ratio.protein}%</span>
            <span>脂肪 {food_items.nutrition_ratio.fat}%</span>
            <span>碳水 {food_items.nutrition_ratio.carb}%</span>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: 创建食谱页面**

```tsx
// apps/web/app/(dashboard)/recipe/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { apiGet, apiPost } from '@/lib/api';
import { RecipeCard } from '@/components/recipe/recipe-card';
import { ChefHat, Loader2 } from 'lucide-react';

interface Pet { id: string; name: string; weight_kg: number | null; }

export default function RecipePage() {
  const [pets, setPets] = useState<Pet[]>([]);
  const [selectedPet, setSelectedPet] = useState('');
  const [recipe, setRecipe] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { apiGet<Pet[]>('/pets').then(setPets); }, []);

  const handleGenerate = async () => {
    if (!selectedPet) return;
    setLoading(true);
    setError('');
    setRecipe(null);

    try {
      const data = await apiPost('/recipe/generate', { pet_id: selectedPet });
      if ((data as any).error) {
        setError((data as any).error);
      } else {
        setRecipe(data);
      }
    } catch {
      setError('生成食谱失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">智能食谱</h1>

      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <div className="flex items-end gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">选择宠物</label>
            <select value={selectedPet} onChange={e => setSelectedPet(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg">
              <option value="">请选择宠物</option>
              {pets.map(p => <option key={p.id} value={p.id}>{p.name} {p.weight_kg ? `(${p.weight_kg}kg)` : '(未记录体重)'}</option>)}
            </select>
          </div>
          <button onClick={handleGenerate} disabled={loading || !selectedPet}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center gap-2">
            {loading ? <Loader2 size={18} className="animate-spin" /> : <ChefHat size={18} />}
            {loading ? '生成中...' : '生成食谱'}
          </button>
        </div>
        {error && <p className="text-red-500 mt-2">{error}</p>}
      </div>

      {recipe && <RecipeCard recipe={recipe} />}

      {!recipe && !loading && (
        <div className="text-center py-12 text-gray-400">
          <ChefHat size={64} className="mx-auto mb-4" />
          <p className="text-lg">选择宠物并点击"生成食谱"</p>
          <p className="text-sm mt-1">AI将根据宠物的体重、品种和健康状况生成专属食谱</p>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd D:/桌面/AiPet/ai-pet
git add -A
git commit -m "feat: add recipe page with AI generation"
```

---

## 自检清单

- [x] **Spec覆盖率**: 登录(Task 3)、Dashboard(Task 4)、宠物管理(Task 5)、传图识病(Task 6)、AI对话(Task 6)、食谱(Task 7) — 全部覆盖
- [x] **占位符扫描**: 无TBD/TODO
- [x] **类型一致性**: API调用路径与后端一致

---

## 执行选择

计划已保存。两种执行方式：

**1. Subagent-Driven**

**2. Inline Execution**

选哪种？
