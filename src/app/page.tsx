import { redirect } from "next/navigation";

// Root "/" always redirects — middleware handles auth-based routing.
// This just ensures no blank page is shown.
export default function RootPage() {
  redirect("/dashboard");
}
