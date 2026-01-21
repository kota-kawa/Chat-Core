/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./pages/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Manrope"', '"Noto Sans JP"', "ui-sans-serif", "system-ui"]
      }
    }
  },
  plugins: []
};
