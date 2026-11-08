import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  darkMode: "class",
  theme: {
    extend: {
      colors: {
        ink: { DEFAULT: "#1B1A17", soft: "#3A3833" },
        paper: { DEFAULT: "#FAF7F2", deep: "#F1EBDF" },
        gold: { DEFAULT: "#B8862B", soft: "#E8D5A8" },
        forest: { DEFAULT: "#1F4D3A", soft: "#2F6B52" },
      },
      fontFamily: {
        serif: ["Georgia", "Cambria", "'Times New Roman'", "serif"],
        sans: ["system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
      },
    },
  },
  plugins: [],
};
export default config;
