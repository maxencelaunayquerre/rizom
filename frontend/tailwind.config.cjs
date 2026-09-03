/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: "class",
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        "rizom-color": "var(--rizom-color)", // To have this global color
      },
      fontFamily: {
        'oswald': ['"Oswald"'],
      },
    }
  },
  plugins: [],
}
