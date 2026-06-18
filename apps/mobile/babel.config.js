module.exports = function (api) {
  api.cache(true);

  return {
    presets: [require.resolve("expo/internal/babel-preset")],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
        },
      ],
    ],
  };
};
