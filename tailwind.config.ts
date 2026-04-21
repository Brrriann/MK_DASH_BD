import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: ["class"],
  content: [
    "./pages/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./app/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "sidebar-bg": "#0f172a",
        "sidebar-active": "#1e3a5f",
        "main-bg": "#f8fafc",
        "card-bg": "#ffffff",
        "accent": "#2563eb",
        "accent-light": "#eff6ff",
        "text-primary": "#0f172a",
        "text-secondary": "#64748b",
        "text-muted": "#94a3b8",
        "success": "#10b981",
        "warning": "#f59e0b",
        "danger": "#f43f5e",
      },
      fontFamily: {
        outfit: ["var(--font-outfit)", "sans-serif"],
      },
    },
  },
  plugins: [require("tailwindcss-animate")],
};
export default config;
