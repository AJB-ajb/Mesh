import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "app.meshit.mesh",
  appName: "Mesh",
  webDir: "dist-cap",
  server: {
    url: process.env.CAPACITOR_SERVER_URL || "https://mesh-it.vercel.app",
    allowNavigation: ["mesh-it.vercel.app", "*.supabase.co"],
  },
  plugins: {
    SplashScreen: {
      launchAutoHide: true,
      launchShowDuration: 2000,
      backgroundColor: "#000000",
      splashImmersive: true,
    },
    StatusBar: {
      style: "DARK",
      backgroundColor: "#000000",
    },
  },
};

export default config;
