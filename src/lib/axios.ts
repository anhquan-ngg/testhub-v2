import axios, { AxiosRequestConfig, AxiosError } from "axios";
import { QueryClient } from "@tanstack/react-query";

// Lấy API base URL từ biến môi trường
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
  withCredentials: true, // Cho phép gửi cookie cùng với các request
});

// QueryClient instance cho React Query
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000, // 5 minutes
    },
  },
});

// Wrapper function để convert axios request thành fetch-like API cho ZenStack
// ZenStack Provider cần một function có signature giống với native fetch API
export const fetchInstance = async (
  url: string,
  options?: RequestInit
): Promise<Response> => {
  try {
    // Parse options từ RequestInit sang AxiosRequestConfig
    const axiosConfig: AxiosRequestConfig = {
      url,
      method: (options?.method as AxiosRequestConfig["method"]) || "GET",
      headers: options?.headers as Record<string, string>,
      withCredentials: true,
    };

    // Nếu có body, parse nó
    if (options?.body) {
      if (options.body instanceof FormData) {
        axiosConfig.data = options.body;
        // Axios tự động set Content-Type cho FormData
      } else if (typeof options.body === "string") {
        axiosConfig.data = JSON.parse(options.body);
      } else {
        axiosConfig.data = options.body;
      }
    }

    // Thực hiện request với axios
    const response = await axiosClient(axiosConfig);

    // Convert axios response thành Response object (fetch-like)
    return new Response(JSON.stringify(response.data), {
      status: response.status,
      statusText: response.statusText,
      headers: new Headers(response.headers as Record<string, string>),
    });
  } catch (error) {
    // Xử lý lỗi từ axios
    const axiosError = error as AxiosError;

    if (axiosError.response) {
      // Server trả về lỗi (status code khác 2xx)
      return new Response(JSON.stringify(axiosError.response.data), {
        status: axiosError.response.status,
        statusText: axiosError.response.statusText,
        headers: new Headers(
          axiosError.response.headers as Record<string, string>
        ),
      });
    } else if (axiosError.request) {
      // Request được gửi nhưng không có response
      return new Response(
        JSON.stringify({ error: "Network Error", message: axiosError.message }),
        {
          status: 0,
          statusText: "Network Error",
        }
      );
    } else {
      // Lỗi khi setup request
      return new Response(JSON.stringify({ error: axiosError.message }), {
        status: 0,
        statusText: "Request Error",
      });
    }
  }
};

export default axiosClient;
