/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // SLOTH brand: calm sage/teal "moss" with warm neutral surfaces.
        moss: {
          50: "#f1f8f4",
          100: "#dcefe2",
          200: "#bbdfc8",
          300: "#8ec7a5",
          400: "#5da97f",
          500: "#3d8c62",
          600: "#2c7050",
          550: "#347a59",
          700: "#245a42",
          800: "#1f4836",
          900: "#1a3b2d",
        },
        // Node / step accent colors for diagrams + legends
        manual: "#c2703a",
        ai: "#6d5bd0",
        approval: "#b9863f",
        calendar: "#2f7fae",
        email: "#3d8c62",
        measure: "#7a8aa0",
        ink: {
          50: "#f6f7f8",
          100: "#eceef1",
          200: "#d8dce2",
          300: "#b6bdc8",
          400: "#8a93a3",
          500: "#646e80",
          600: "#4c5566",
          700: "#3b4252",
          800: "#272c38",
          900: "#181c25",
        },
      },
      fontFamily: {
        sans: [
          "Inter",
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif",
        ],
      },
      boxShadow: {
        soft: "0 1px 2px rgba(24,28,37,0.04), 0 4px 16px rgba(24,28,37,0.06)",
        lift: "0 8px 30px rgba(24,28,37,0.10)",
        glow: "0 0 0 4px rgba(61,140,98,0.12)",
      },
      borderRadius: {
        xl: "0.875rem",
        "2xl": "1.125rem",
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "translateY(6px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        "pulse-ring": {
          "0%": { transform: "scale(0.95)", opacity: "0.7" },
          "70%": { transform: "scale(1.6)", opacity: "0" },
          "100%": { opacity: "0" },
        },
        shimmer: {
          "100%": { transform: "translateX(100%)" },
        },
        "draw-line": {
          "0%": { strokeDashoffset: "100" },
          "100%": { strokeDashoffset: "0" },
        },
      },
      animation: {
        "fade-in": "fade-in 0.4s ease-out both",
        "pulse-ring": "pulse-ring 1.8s cubic-bezier(0.4,0,0.6,1) infinite",
        shimmer: "shimmer 1.6s infinite",
      },
    },
  },
  plugins: [],
};
