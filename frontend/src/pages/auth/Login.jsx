import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link, useNavigate } from "react-router-dom";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Button, Alert } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { useLogin } from "@/hooks/useAuth";
import { useState } from "react";

const schema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export default function Login() {
  const navigate = useNavigate();
  const { mutate: login, isPending } = useLogin();
  const [error, setError] = useState("");

  const {
    register,
    handleSubmit,
    resetField,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (data) => {
    setError("");

    login(data, {
      onError: (err) => {
        setError(err?.message || "Invalid email or password");
        resetField("password");
      },
    });
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Welcome back</h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          Sign in to your LocalSkill account
        </p>
      </div>

      {error && (
        <Alert
          type="error"
          message={error}
          className="mb-5"
          dismissible
          onClose={() => setError("")}
        />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@company.com"
          icon={Mail}
          error={errors.email?.message}
          {...register("email")}
        />
        <Input
          label="Password"
          type="password"
          placeholder="••••••••"
          icon={Lock}
          error={errors.password?.message}
          {...register("password")}
        />

        <div className="flex justify-end">
          <Link
            to="/forgot-password"
            className="text-sm text-blue-600 hover:underline"
          >
            Forgot your password?
          </Link>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
          disabled={isPending}
          iconRight={ArrowRight}
        >
          Sign In
        </Button>
      </form>

      {/* ... rest of your component (social login / register link) remains the same */}

      <div className="mt-6">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-200" />
          </div>
          <div className="relative flex justify-center text-xs text-slate-400">
            <span className="bg-slate-50 px-3">or continue with</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          {["Google", "LinkedIn"].map((provider) => (
            <button
              key={provider}
              type="button"
              className="flex items-center justify-center gap-2 h-10 border border-slate-200 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            >
              {provider}
            </button>
          ))}
        </div>
      </div>

      <p className="text-center text-sm text-slate-500 mt-8">
        Don't have an account?{" "}
        <button
          onClick={() => navigate("/register/role")}
          className="text-blue-600 font-medium hover:underline"
        >
          Create account
        </button>
      </p>
    </div>
  );
}
