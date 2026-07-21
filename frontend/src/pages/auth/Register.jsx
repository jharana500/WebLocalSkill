import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate, useSearchParams } from "react-router-dom";
import { User, Mail, Lock, Building2, ArrowRight } from "lucide-react";
import { Button, Alert, Badge } from "@/components/ui";
import { Input } from "@/components/ui/Input";
import { useRegister } from "@/hooks/useAuth";
import { useState } from "react";

const jobSeekerSchema = z
  .object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

const companySchema = z
  .object({
    name: z.string().min(2, "Your name is required"),
    companyName: z.string().min(2, "Company name is required"),
    email: z.string().email("Enter a valid email address"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

export default function Register() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const role = searchParams.get("role") || "job_seeker";
  const { mutate: register, isPending } = useRegister();
  const [error, setError] = useState("");

  const isCompany = role === "company";
  const schema = isCompany ? companySchema : jobSeekerSchema;

  const {
    register: reg,
    handleSubmit,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = (data) => {
    setError("");
    const [firstName, ...lastNameParts] = data.name.trim().split(/\s+/);
    register(
      {
        ...data,
        firstName: firstName || data.name.trim(),
        lastName: lastNameParts.join(" "),
        role,
      },
      {
        onError: (err) => setError(err.message || "Registration failed"),
      },
    );
  };

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <div className="flex items-center justify-center gap-2 mb-3">
          <Badge variant={isCompany ? "indigo" : "primary"} size="md">
            {isCompany ? "🏢 Company Account" : "👤 Job Seeker Account"}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold text-slate-900">
          Create your account
        </h1>
        <p className="text-slate-500 mt-1.5 text-sm">
          {isCompany
            ? "Start hiring Nepal's best talent"
            : "Start your job search on LocalSkill"}
        </p>
      </div>

      {error && (
        <Alert type="error" message={error} className="mb-5" dismissible />
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full Name"
          placeholder={isCompany ? "Your full name" : "Your full name"}
          icon={User}
          required
          error={errors.name?.message}
          {...reg("name")}
        />

        {isCompany && (
          <Input
            label="Company Name"
            placeholder="Your company name"
            icon={Building2}
            required
            error={errors.companyName?.message}
            {...reg("companyName")}
          />
        )}

        <Input
          label="Email address"
          type="email"
          placeholder={isCompany ? "company@email.com" : "you@email.com"}
          icon={Mail}
          required
          error={errors.email?.message}
          {...reg("email")}
        />

        <Input
          label="Password"
          type="password"
          placeholder="Create a strong password"
          icon={Lock}
          hint="Minimum 8 characters"
          required
          error={errors.password?.message}
          {...reg("password")}
        />

        <Input
          label="Confirm Password"
          type="password"
          placeholder="Repeat your password"
          icon={Lock}
          required
          error={errors.confirmPassword?.message}
          {...reg("confirmPassword")}
        />

        <p className="text-xs text-slate-500">
          By creating an account, you agree to LocalSkill's{" "}
          <a href="/terms" className="text-blue-600 hover:underline">
            Terms of Service
          </a>{" "}
          and{" "}
          <a href="/privacy" className="text-blue-600 hover:underline">
            Privacy Policy
          </a>
          .
        </p>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={isPending}
          disabled={isPending}
          iconRight={ArrowRight}
        >
          Create Account
        </Button>
      </form>

      <p className="text-center text-sm text-slate-500 mt-8">
        Already have an account?{" "}
        <button
          onClick={() => navigate("/login")}
          className="text-blue-600 font-medium hover:underline"
        >
          Sign in
        </button>
      </p>

      <div className="mt-4 text-center">
        <button
          onClick={() => navigate("/register/role")}
          className="text-xs text-slate-400 hover:text-slate-600 underline"
        >
          ← Change account type
        </button>
      </div>
    </div>
  );
}
