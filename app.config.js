// Extends app.json. EXPO_BASE_URL lets the same codebase export for a
// sub-path host (GitHub Pages: /river-fitness) or root (localhost, Tauri desktop).
//
// BUILD_ID is stamped at export time and travels inside the bundle. It is an
// ISO instant so it compares lexicographically against `app_release.min_build`
// in the database — raise that value and every session still running an older
// build reloads itself. See src/lib/build.ts.
module.exports = ({ config }) => ({
  ...config,
  experiments: {
    ...(config.experiments || {}),
    baseUrl: process.env.EXPO_BASE_URL || '',
  },
  extra: {
    ...(config.extra || {}),
    buildId: process.env.EXPO_PUBLIC_BUILD_ID || new Date().toISOString(),
  },
});
