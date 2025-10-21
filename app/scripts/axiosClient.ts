import axios from "axios";

// 👇 On Android emulator, use 10.0.2.2 instead of localhost
const api = axios.create({
  baseURL: "http://localhost:8080/api",
  timeout: 90000, // optional: 5 seconds
  headers: {
    "Content-Type": "application/json",
  },
});

// 🔹 Request Interceptor
api.interceptors.request.use(
  async (config) => {
    // Example: attach auth token later if needed
    // const token = await getAuthToken();
    // if (token) {
    //   config.headers.Authorization = `Bearer ${token}`;
    // }
    console.log("📤 Request:", config.method, config.url, config.data);
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 🔹 Response Interceptor
api.interceptors.response.use(
  (response) => {
    console.log("📥 Response:", response.data);
    return response;
  },
  (error) => {
    if (error.response) {
      console.error(
        "❌ API Error:",
        error.response.status,
        error.response.data
      );
    } else if (error.request) {
      console.error("❌ No response from server:", error.request);
    } else {
      console.error("❌ Axios Error:", error.message);
    }
    return Promise.reject(error);
  }
);

export default api;
