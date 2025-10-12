import axios from "axios";

// Lấy API base URL từ biến môi trường
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Cho phép gửi cookie cùng với các request
});

// // (Tùy chọn) Cấu hình Interceptors
// // Interceptor giúp bạn can thiệp vào request hoặc response trước khi chúng được xử lý.
// // Ví dụ: Tự động thêm token xác thực vào mỗi request.
// axiosInstance.interceptors.request.use(
//   (config) => {
//     // Lấy token từ localStorage hoặc một nơi nào đó
//     const token = localStorage.getItem('accessToken');
//     if (token) {
//       config.headers['Authorization'] = `Bearer ${token}`;
//     }
//     return config;
//   },
//   (error) => {
//     return Promise.reject(error);
//   }
// );

// // Ví dụ: Xử lý lỗi tập trung hoặc refresh token khi response trả về lỗi 401
// axiosInstance.interceptors.response.use(
//   (response) => {
//     return response;
//   },
//   (error) => {
//     // Xử lý các lỗi chung ở đây
//     console.error("API Error:", error.response?.data);
//     return Promise.reject(error);
//   }
// );

export default axiosClient;
