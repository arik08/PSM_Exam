import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#10233f",
        sand: "#f4f8fc",
        mist: "#dfeaf5",
        pine: "#005baa",
        gold: "#2f78c4",
        rose: "#b55066"
      },
      boxShadow: {
        soft: "0 16px 44px rgba(16, 35, 63, 0.08)"
      },
      backgroundImage: {
        grain: "radial-gradient(circle at top left, rgba(0,91,170,.18), transparent 34%), radial-gradient(circle at 82% 16%, rgba(47,120,196,.14), transparent 30%), linear-gradient(180deg, #f9fcff 0%, #eef5fb 100%)"
      },
      fontFamily: {
        sans: ["Pretendard", "Noto Sans KR", "system-ui", "sans-serif"],
        serif: ["Iowan Old Style", "Georgia", "serif"]
      }
    }
  },
  plugins: []
};

export default config;
