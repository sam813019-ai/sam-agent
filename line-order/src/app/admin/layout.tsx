import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'HERA 系統後台',
  description: 'HERA 後台管理系統',
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
