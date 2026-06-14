import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: '宠爱智囊 - PetAI Mind',
  description: '智能宠物健康管理系统',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen">{children}</body>
    </html>
  );
}
