import axios from "axios";

import { Platform } from 'react-native';

// 👇 Dynamic baseURL based on platform
const getBaseURL = () => {
  if (Platform.OS === 'android') {
    return "http://192.168.1.130:8080/api";  // Android emulator
  }
  // For iOS simulator or physical device, you may need your computer's IP
  return "http://localhost:8080/api";     // iOS simulator
};

const api = axios.create({
  baseURL: getBaseURL(),
  timeout: 90000, // optional: 90 seconds
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
