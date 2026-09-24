import AuthLayout from "@/app/components/AuthLayout";
import LoginForm from "@/app/components/auth/LoginForm";

export const metadata = {
  title: "Login · Nextcent",
  description: "Login to your Nextcent account.",
};

export default function LoginPage() {
  return (
    <AuthLayout>
      <LoginForm />
    </AuthLayout>
  );
}