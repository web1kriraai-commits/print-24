import React, { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import BackButton from "../components/BackButton";
import {
  Printer,
  Mail,
  Lock,
  AlertCircle,
  ArrowRight,
  Loader,
} from "lucide-react";
import { API_BASE_URL_WITH_API } from "../lib/apiConfig";
import { scrollToInvalidField } from "../lib/validationUtils";

interface LoginResponse {
  success: boolean;
  token?: string;
  user?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  message?: string;
}

const Login: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });
  const [errors, setErrors] = useState<{
    email?: string;
    password?: string;
    general?: string;
  }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Get success message from registration redirect
  const successMessage = location.state?.message;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    // Clear specific error when user types
    if (errors[name as keyof typeof errors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }));
    }
    if (errors.general) {
      setErrors((prev) => ({ ...prev, general: undefined }));
    }
  };

  const validate = () => {
    const newErrors: { email?: string; password?: string } = {};

    if (!formData.email) {
      newErrors.email = "Email is required";
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = "Please enter a valid email address";
    }

    if (!formData.password) {
      newErrors.password = "Password is required";
    }

    setErrors(newErrors);
    
    // Auto-scroll to first invalid field
    if (Object.keys(newErrors).length > 0) {
      const firstErrorField = Object.keys(newErrors)[0];
      scrollToInvalidField(firstErrorField, firstErrorField);
    }
    
    return Object.keys(newErrors).length === 0;
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;

    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL_WITH_API}/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
        }),
      });

      const text = await response.text();

      // Check if server returned HTML (ngrok/browser warning)
      if (text.startsWith("<!DOCTYPE") || text.startsWith("<html")) {
        throw new Error(
          "Received HTML instead of JSON (Ngrok blocked request)"
        );
      }

      const data = JSON.parse(text);

      if (!response.ok) {
        setErrors({
          general: data.message || "Login failed. Please check credentials.",
        });
        return;
      }

      // Success
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));

      // Redirect based on role
      if (data.user.role === "admin") {
        navigate("/admin/dashboard");
      } else if (data.user.role === "emp") {
        navigate("/employee/dashboard");
      } else {
        navigate("/");
      }
    } catch (error) {
      console.error("Login error:", error);
      setErrors({
        general: "Network error. Please check if the server is running.",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-cream-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-cream-200 rounded-full blur-3xl opacity-40 pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-96 h-96 bg-cream-300 rounded-full blur-3xl opacity-40 pointer-events-none" />

      {/* Back Button */}
      <div className="absolute top-4 left-4 z-20">
        <BackButton fallbackPath="/" label="Back to Home" className="text-cream-600 hover:text-cream-900" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-md w-full space-y-6 sm:space-y-8 bg-white p-6 sm:p-8 md:p-10 rounded-2xl sm:rounded-3xl shadow-xl border border-cream-100 relative z-10"
      >
        <div className="text-center">
          <div className="mx-auto h-12 w-12 sm:h-16 sm:w-16 bg-cream-900 rounded-full flex items-center justify-center text-cream-50 mb-3 sm:mb-4 shadow-lg">
            <Printer size={24} className="sm:w-8 sm:h-8" />
          </div>
          <h2 className="font-serif text-2xl sm:text-3xl font-bold text-cream-900">
            Welcome Back
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-cream-600">
            Sign in to manage your prints and orders
          </p>
        </div>

        {/* Success Message from Registration */}
        {successMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
          >
            <AlertCircle size={16} />
            {successMessage}
          </motion.div>
        )}

        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          {errors.general && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2"
            >
              <AlertCircle size={16} />
              {errors.general}
            </motion.div>
          )}

          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-cream-700 mb-1"
              >
                Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-cream-400" />
                </div>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                    errors.email
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                  } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                  placeholder="Enter your email address"
                />
              </div>
              {errors.email && (
                <p className="mt-1 text-xs text-red-500">{errors.email}</p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-cream-700 mb-1"
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-cream-400" />
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={formData.password}
                  onChange={handleChange}
                  className={`appearance-none relative block w-full px-3 py-3 pl-10 border ${
                    errors.password
                      ? "border-red-300 focus:ring-red-500 focus:border-red-500"
                      : "border-cream-200 focus:ring-cream-900 focus:border-cream-900"
                  } placeholder-cream-300 text-cream-900 rounded-xl focus:outline-none focus:ring-1 sm:text-sm transition-all`}
                  placeholder="Enter your password"
                />
              </div>
              {errors.password && (
                <p className="mt-1 text-xs text-red-500">{errors.password}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <input
                id="remember-me"
                name="remember-me"
                type="checkbox"
                className="h-4 w-4 text-cream-900 focus:ring-cream-500 border-cream-300 rounded"
              />
              <label
                htmlFor="remember-me"
                className="ml-2 block text-xs text-cream-600"
              >
                Remember me
              </label>
            </div>

            <div className="text-xs">
              <a
                href="#"
                className="font-medium text-cream-900 hover:text-cream-700 hover:underline"
              >
                Forgot your password?
              </a>
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={isLoading}
              className="group relative w-full flex justify-center py-3 px-4 border border-transparent text-sm font-bold rounded-xl text-cream-50 bg-cream-900 hover:bg-cream-800 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-cream-500 transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <Loader className="animate-spin h-5 w-5" />
              ) : (
                <>
                  Sign in
                  <ArrowRight className="ml-2 h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </div>

        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-cream-600">
            Don't have an account?{" "}
            <Link
              to="/signup"
              className="font-bold text-cream-900 hover:text-cream-700 underline transition-colors"
            >
              Sign Up
            </Link>
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
