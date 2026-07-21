import axios from "axios";
import useAuthStore from "@/store/authStore";
import { toast } from "@/store/uiStore";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 15000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (response) => {
    const body = response.data;
    if (
      body &&
      typeof body === "object" &&
      Object.prototype.hasOwnProperty.call(body, "success")
    ) {
      if (
        body.data &&
        typeof body.data === "object" &&
        !Array.isArray(body.data)
      ) {
        return { ...body.data, success: body.success, message: body.message };
      }
      return body.data ?? body;
    }
    return body;
  },
  (error) => {
    const status = error.response?.status;
    const requestPath = error.config?.url || "";
    const currentPath = window.location.pathname;
    const isAuthRequest =
      requestPath.includes("/auth/login") ||
      requestPath.includes("/auth/register");
    const isAuthPage = [
      "/login",
      "/register",
      "/register/role",
      "/forgot-password",
      "/reset-password",
    ].includes(currentPath);
    const message =
      error.response?.data?.message ||
      (error.request
        ? "Unable to connect to server. Please try again."
        : "Something went wrong");
    const normalizedError = {
      message,
      status,
      data: error.response?.data,
      response: error.response,
    };

    if (status === 401 && !isAuthRequest && !isAuthPage) {
      useAuthStore.getState().logout();
      window.history.pushState({}, "", "/login");
      window.dispatchEvent(new PopStateEvent("popstate"));
    } else if (status === 403) {
      toast.error(
        "Access Denied",
        "You do not have permission to perform this action",
      );
    } else if (status === 500) {
      toast.error(
        "Server Error",
        "An unexpected error occurred. Please try again.",
      );
    }

    return Promise.reject(normalizedError);
  },
);

export default api;
