module.exports = function (api) {
  // Enable caching for faster rebuilds
  api.cache(true);

  return {
    presets: [
      // Core Expo preset for SDK 52 compatibility
      "babel-preset-expo",
    ],
    plugins: [
      // Modern JS features for cleaner code
      "@babel/plugin-proposal-optional-chaining",
      "@babel/plugin-proposal-nullish-coalescing-operator",
      
      // Environment variables for API keys (e.g., scanning API)
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          safe: true,
          allowUndefined: false,
        },
      ],
      
      // Dynamic imports for potential lazy loading
      "@babel/plugin-syntax-dynamic-import",
      
      // Inline env vars for debugging
      [
        "inline-dotenv",
        {
          unsafe: true,
        },
      ],
      
      // Expo Router support (ensures navigation works smoothly)
      "expo-router/babel",
    ],
    env: {
      // Development: Keep console logs for debugging
      development: {
        plugins: [],
      },
      // Production: Optimize by removing console logs
      production: {
        plugins: [
          "transform-remove-console",
        ],
      },
    },
  };
};