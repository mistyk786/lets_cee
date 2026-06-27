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
        display: ["Fraunces", "ui-serif", "Georgia", "Cambria", "serif"],
        mono: [
          "JetBrains Mono",
          "ui-monospace",
          "SFMono-Regular",
          "Menlo",
          "monospace",
        ],
      },
      letterSpacing: {
        tightish: "-0.011em",
        tighter: "-0.03em",
        label: "0.16em",
      },
      backgroundImage: {
        "dot-grid":
          "radial-gradient(circle at center, rgba(24,28,37,0.05) 0.6px, transparent 0.7px)",
      },
      backgroundSize: {
        dots: "22px 22px",
      },
      boxShadow: {
        // Layered, Linear/Raycast-style light shadows: a crisp hairline ring
        // for definition + a soft ambient shadow for gentle depth.
        soft: "0 1px 1px rgba(24,28,37,0.03), 0 1px 2px rgba(24,28,37,0.04)",
        card: "0 0 0 1px rgba(24,28,37,0.035), 0 1px 2px rgba(24,28,37,0.04), 0 4px 12px -3px rgba(24,28,37,0.06)",
        lift: "0 0 0 1px rgba(24,28,37,0.05), 0 2px 6px -2px rgba(24,28,37,0.08), 0 12px 28px -6px rgba(24,28,37,0.14)",
        pop: "0 0 0 1px rgba(24,28,37,0.06), 0 16px 40px -8px rgba(24,28,37,0.22)",
        glow: "0 0 0 3px rgba(61,140,98,0.14)",
        "btn-primary":
          "inset 0 1px 0 0 rgba(255,255,255,0.16), 0 1px 2px rgba(24,28,37,0.18)",
        "inner-top": "inset 0 1px 0 0 rgba(255,255,255,0.7)",
      },
      borderRadius: {
        xl: "0.75rem",
        "2xl": "1rem",
        "3xl": "1.375rem",
      },
      transitionTimingFunction: {
        smooth: "cubic-bezier(0.22, 1, 0.36, 1)",
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
