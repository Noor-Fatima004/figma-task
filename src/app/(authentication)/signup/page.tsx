import AuthLayout from "@/app/components/AuthLayout";
import SignupForm from "@/app/components/auth/SignupForm";

export const metadata = {
  title: "Sign up · Nextcent",
  description: "Create your Nextcent account.",
};

export default function SignupPage() {
  return (
    <AuthLayout>
      <SignupForm />
    </AuthLayout>
  );
}