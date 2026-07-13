module.exports = ({ config }) => {
  // Set only by EAS Build (eas build --platform android); not present for
  // local `expo prebuild`/`expo run:android`, which will still include the plugin.
  const isAndroidBuild = process.env.EAS_BUILD_PLATFORM === "android";

  const plugins = (config.plugins || []).filter((plugin) => {
    const name = Array.isArray(plugin) ? plugin[0] : plugin;
    return !(name === "react-native-google-mobile-ads" && isAndroidBuild);
  });

  return {
    ...config,
    plugins,
  };
};
