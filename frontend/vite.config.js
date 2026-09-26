import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "url";
export default defineConfig({
    plugins: [react()],
    resolve: {
        alias: {
            "@": fileURLToPath(new URL("./src", import.meta.url)),
        },
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    recharts: ["recharts"],
                    vendor: ["react", "react-dom", "react-router-dom"],
                },
            },
        },
    },
    server: {
        port: 5173,
        proxy: {
            // REST API — proxy all /api/* and /health to the FastAPI backend
            "/api": {
                target: "http://localhost:8000",
                changeOrigin: true,
                // WebSocket upgrade for /api/v1/stream
                ws: true,
            },
            "/health": {
                target: "http://localhost:8000",
                changeOrigin: true,
            },
            "/metrics": {
                target: "http://localhost:8000",
                changeOrigin: true,
            },
        },
    },
});
