import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#17201b",
        muted: "#6b746d",
        line: "#d9ded8",
        paper: "#f7f7f2",
        panel: "#ffffff",
        moss: "#4f7f5f",
        amber: "#b87333",
        berry: "#914d63",
      },
      boxShadow: {
        soft: "0 18px 50px rgba(23, 32, 27, 0.08)",
      },
    },
  },
  plugins: [],
};

export default config;

