/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["'Plus Jakarta Sans'", "Inter", "-apple-system", "BlinkMacSystemFont", "sans-serif"],
        mono: ["'JetBrains Mono'", "monospace"],
      },
      colors: {
        ecg: {
          bg: "#060b17",
          surface: "#0d1527",
          card: "rgba(13, 21, 39, 0.75)",
          border: "rgba(255, 255, 255, 0.08)",
          accent: "#06b6d4",
          cyan: "#00f2fe",
          danger: "#f43f5e",
          warning: "#f59e0b",
          success: "#10b981",
          muted: "#94a3b8",
          dim: "#64748b",
          violet: "#8b5cf6",
        },
      },
      keyframes: {
        heartbeat: {
          "0%, 100%": { transform: "scale(1)" },
          "15%": { transform: "scale(1.2)" },
          "30%": { transform: "scale(0.95)" },
          "45%": { transform: "scale(1.1)" },
        },
        pulseGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(244,63,94,0.6)" },
          "50%": { boxShadow: "0 0 0 8px rgba(244,63,94,0)" },
        },
        cyanGlow: {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(6,182,212,0.6)" },
          "50%": { boxShadow: "0 0 0 8px rgba(6,182,212,0)" },
        },
        radar: {
          "0%": { transform: "scale(0.95)", opacity: "1" },
          "100%": { transform: "scale(2.2)", opacity: "0" },
        },
      },
      animation: {
        heartbeat: "heartbeat 1.25s ease-in-out infinite",
        pulseGlow: "pulseGlow 1.8s ease-in-out infinite",
        cyanGlow: "cyanGlow 2s ease-in-out infinite",
        radar: "radar 2s cubic-bezier(0, 0, 0.2, 1) infinite",
      },
    },
  },
  plugins: [],
};
