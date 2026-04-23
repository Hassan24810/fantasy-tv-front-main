export default defineConfig(({ mode }) => ({
  base: "/fantasy-tv-front-main/",   // ✅ REQUIRED FOR GITHUB PAGES

  server: {
    host: "::",
    port: 8080,
  },

  plugins: [react(), mode === "development" && componentTagger()].filter(Boolean),

  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
}));