import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "HERA(凱麗@hera__2013)",
  description: "加入會員",
};

export default function RegisterLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
