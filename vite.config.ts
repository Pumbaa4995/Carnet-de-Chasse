import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: "autoUpdate",

      includeAssets: [
        "favicon.ico",
        "icon-192.png",
        "icon-512.png",
      ],

      manifest: {
        name: "Carnet-de-Chasse",
        short_name: "Carnet Chasse",

        description:
          "Mon carnet de chasse numérique",

        theme_color: "#23452f",
        background_color: "#f4f1e8",

        display: "standalone",

        start_url: "/",

        icons: [
          {
            src: "/icon-192.png",
            sizes: "192x192",
            type: "image/png",
          },
          {
            src: "/icon-512.png",
            sizes: "512x512",
            type: "image/png",
          },
        ],
      },
    }),
  ],
});