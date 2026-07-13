const colors = require('tailwindcss/colors');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        indigo: colors.emerald,
        purple: colors.teal,
        blue: colors.emerald,
        cyber: {
          slate: "#0f172a",
          dark: "#020617",
          purple: "#14b8a6", // teal
          blue: "#10b981", // emerald
          green: "#10b981",
          gold: "#f59e0b" // orange/gold
        }
      }
    },
  },
  plugins: [],
};
