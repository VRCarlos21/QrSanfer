import { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.tuapp.qrsystem",
  appName: "QR System",
  webDir: "dist", 
  plugins: {
    BarcodeScanner: {
      android: {
        isBackCamera: true,
      },
      ios: {
        isBackCamera: true,
      },
    },
  },
};

export default config;
