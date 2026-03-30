const { withProjectBuildGradle } = require('@expo/config-plugins');

/**
 * Adds the Kotlin Compose Compiler Gradle plugin to the root build.gradle.
 * Required for @stripe/stripe-react-native 0.50+ with Kotlin 2.0+.
 */
module.exports = function withComposeCompiler(config) {
  return withProjectBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    // Only add if not already present
    if (contents.includes('kotlin.plugin.compose')) {
      return config;
    }

    // Insert into the buildscript dependencies block
    config.modResults.contents = contents.replace(
      /(\s*dependencies\s*\{[^}]*classpath\("com\.android\.tools\.build:gradle)/,
      `
        classpath("org.jetbrains.kotlin:compose-compiler-gradle-plugin:2.0.21")$1`
    );

    return config;
  });
};
