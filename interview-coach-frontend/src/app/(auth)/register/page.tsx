import AuthCard from "@/components/auth/AuthCard";

// The register route simply renders the same AuthCard.
// You could extend AuthCard to accept a defaultMode prop if needed.
export default function RegisterPage() {
  return <AuthCard />;
}
