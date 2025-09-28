export default () => ({
  expo: {
    name: "YourApp",
    slug: "your-app",
    extra: {
      openaiApiKey: process.env.OPENAI_API_KEY, // <-- from EAS secrets
      // you can also put non-secret flags, e.g. apiBaseUrl
      supabaseUrl: process.env.SUPABASE_URL,
      supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
    plugins: ["expo-font", "expo-router", "expo-sqlite"],
    android: {
      package: "com.annabel_phu.yourapp",
    },
  },
});
