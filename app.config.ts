export default () => ({
  expo: {
    name: "YourApp",
    slug: "your-app",
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY, // <-- from EAS secrets
      // you can also put non-secret flags, e.g. apiBaseUrl
    },
    plugins: ["expo-font", "expo-router", "expo-sqlite"],
  },
});
