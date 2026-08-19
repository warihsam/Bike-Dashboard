import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const GOOGLE_SCRIPT_URL =
  "https://script.google.com/macros/s/AKfycbwNgR7Gm62M2kzv0mQiaa5FGDEp_fhRvLBTxbg_33AUsiqZThIVZw-D7weV_m8OVtWh/exec";

export default defineConfig({
  plugins: [react()],

  server: {
    host: "localhost",
    port: 5173,

    proxy: {
      "/api/google-sync": {
        target: "https://script.google.com",
        changeOrigin: true,
        secure: true,

        rewrite: () => {
          return new URL(GOOGLE_SCRIPT_URL).pathname;
        },

        configure: (proxy) => {
          proxy.on("error", (err) => {
            console.error(
              "[GOOGLE SYNC PROXY ERROR]",
              err
            );
          });

          proxy.on("proxyReq", (proxyReq, req) => {
            console.log(
              "[GOOGLE SYNC PROXY REQUEST]",
              req.method,
              req.url,
              "=>",
              proxyReq.path
            );
          });

          proxy.on("proxyRes", (proxyRes, req) => {
            console.log(
              "[GOOGLE SYNC PROXY RESPONSE]",
              proxyRes.statusCode,
              req.url,
              "=>",
              proxyRes.headers.location || ""
            );
          });
        },
      },
    },
  },
});