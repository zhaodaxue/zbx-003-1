/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        medical: {
          blue: "#1E88E5",
          "blue-dark": "#1565C0",
          "blue-light": "#E3F2FD",
          orange: "#FF7043",
          "orange-dark": "#E64A19",
        },
        schedule: {
          bg: "#FAF8F5",
          card: "#FFFFFF",
          border: "#E0E0E0",
          weekend: "#F5F5F5",
          unavailable: "#EEEEEE",
          conflict: {
            border: "#D32F2F",
            bg: "#FFEBEE",
            text: "#D32F2F",
          },
        },
      },
      fontFamily: {
        sans: [
          '"Noto Sans SC"',
          '"PingFang SC"',
          '"Microsoft YaHei"',
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
      },
      fontSize: {
        base: "16px",
      },
      boxShadow: {
        card: "0 2px 8px rgba(0, 0, 0, 0.06)",
        "card-hover": "0 4px 16px rgba(0, 0, 0, 0.1)",
      },
      borderRadius: {
        lg: "12px",
      },
      minHeight: {
        btn: "48px",
      },
    },
  },
  plugins: [],
};
