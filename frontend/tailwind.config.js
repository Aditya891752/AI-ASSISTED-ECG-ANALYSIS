/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        ecg: {
          bg: "#0a0f1e",
          surface: "#111827",
          border: "#1f2d3d",
          accent: "#06b6d4",
          danger: "#ef4444",
          warning: "#f59e0b",
          success: "#10b981",
          muted: "#6b7280",
          violet: "#8b5cf6",
        },
      },
      keyframes: {
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "25%": { transform: "scale(1.15)" },
          "40%": { transform: "scale(0.95)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(239,68,68,0.6)" },
          "50%": { boxShadow: "0 0 0 6px rgba(239,68,68,0)" },
        },
      },
      animation: {
        heartbeat: "heartbeat 1.2s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};
