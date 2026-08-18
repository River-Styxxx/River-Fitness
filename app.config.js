// Extends app.json. EXPO_BASE_URL lets the same codebase export for a
// sub-path host (GitHub Pages: /river-fitness) or root (localhost, Tauri desktop).
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments || {}),
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
});
