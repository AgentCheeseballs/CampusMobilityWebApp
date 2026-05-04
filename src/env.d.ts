interface ImportMetaEnv {
  readonly VITE_GPS_DEVICE_ID?: string;
  // add other VITE_ variables you use here
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
