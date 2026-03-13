import { ClientAdminLayout } from "@/components/client-admin-layout";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ClientAdminLayout>{children}</ClientAdminLayout>;
}
