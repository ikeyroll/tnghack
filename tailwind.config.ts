import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        tng: {
          blue: "#0057d9",
          dark: "#0043a8",
          sky: "#cfe2ff",
          bg: "#f2f4f8",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        phone: "0 25px 60px rgba(0,0,0,.35)",
      },
      keyframes: {
        spin3d: {
          "0%": { transform: "rotate(0deg)" },
          "100%": { transform: "rotate(360deg)" },
        },
      },
      animation: {
        spin3d: "spin3d 1.2s linear infinite",
      },
    },
  },
  plugins: [],
};
export default config;
