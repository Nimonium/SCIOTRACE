/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "#0B1020",
        panel: "#151C2F",
        elevated: "#1D263A",
        border: "rgba(148, 163, 184, 0.15)",
        ink: "#F8FAFC",
        muted: "#94A3B8",
        cyan: "#22D3EE",
        violet: "#8B5CF6",
        indigo: "#6366F1",
        lavender: "#a78bfa",
        emerald: "#34D399",
        amber: "#FBBF24",
        coral: "#F87171",
        // momentum states
        dormant: "#94A3B8",
        emerging: "#22D3EE",
        growing: "#8B5CF6",
        accelerating: "#FBBF24",
        viral: "#F87171",
        // network roles
        bridge: "#22D3EE",
        authority: "#34D399",
        critical: "#F87171",
      },
      fontFamily: {
        sans: ["Inter", "Helvetica Neue", "Arial", "sans-serif"],
      },
      keyframes: {
        orbFloat: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -25px) scale(1.05)' },
          '66%': { transform: 'translate(-20px, 20px) scale(0.97)' },
        },
        orbFloat2: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(-35px, 20px) scale(1.08)' },
          '66%': { transform: 'translate(25px, -15px) scale(0.96)' },
        },
        orbFloat3: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '50%': { transform: 'translate(20px, 30px) scale(1.04)' },
        },
        dashFloat: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-8px)' },
        },
      },
      animation: {
        'orb-float': 'orbFloat 20s ease-in-out infinite',
        'orb-float2': 'orbFloat2 25s ease-in-out infinite',
        'orb-float3': 'orbFloat3 30s ease-in-out infinite',
        'dash-float': 'dashFloat 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};
