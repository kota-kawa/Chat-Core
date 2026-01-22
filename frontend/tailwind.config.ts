import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./scripts/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope"', '"Noto Sans JP"', "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};

export default config;
