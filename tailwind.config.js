/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./server/**/*.html",
    "./server/static/**/*.html",
    "./server/static/include/**/*.js"
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "sans-serif"],
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: ["dark"],
    darkTheme: "dark",
  },
};
