import { useMutation, useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import useAuthStore from "@/store/authStore";
import { authService } from "@/services/authService";
import { toast } from "@/store/uiStore";

export function useLogin() {
  const { login } = useAuthStore();
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.login,
    onSuccess: (data) => {
      login(data.user, data.token);
      toast.success("Welcome back", "You have signed in successfully.");
      const role = data.user.role;
      if (role === "admin") navigate("/admin/dashboard", { replace: true });
      else if (role === "company")
        navigate("/company/dashboard", { replace: true });
      else navigate("/dashboard", { replace: true });
    },
    onError: (err) => {
      toast.error("Login failed", err.message || "Invalid credentials");
    },
  });
}

export function useRegister() {
  const navigate = useNavigate();

  return useMutation({
    mutationFn: authService.register,
    onSuccess: () => {
      toast.success(
        "Account created",
        "You can now sign in with your new account.",
      );
      navigate("/login");
    },
    onError: (err) => {
      toast.error("Registration failed", err.message || "Something went wrong");
    },
  });
}

export function useLogout() {
  const { logout } = useAuthStore();
  const navigate = useNavigate();

  return () => {
    logout();
    navigate("/");
    toast.success("Signed out", "You have been successfully signed out.");
  };
}

export function useCurrentUser() {
  const { isAuthenticated, token } = useAuthStore();
  const { setUser } = useAuthStore();

  return useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const data = await authService.getMe();
      setUser(data.user);
      return data.user;
    },
    enabled: isAuthenticated && !!token,
    staleTime: 1000 * 60 * 10,
  });
}
