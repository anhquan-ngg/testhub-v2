"use client";

import axiosClient from "@/lib/axios";
import { useState } from "react";
import { toast } from "sonner";

export const useMinIO = (bucket: string) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload file lên MinIO
  const uploadFile = async (file: File) => {
    if (!file) {
      throw new Error("Chưa chọn file");
    }
    setLoading(true);
    try {
      // Lấy presigned URL từ Nest
      const res = await axiosClient.post("/minio/create-upload-url", {
        path: `${bucket}/${file.name}`,
      });
      if (res.status !== 201) {
        throw new Error("Tạo upload URL thất bại");
      }
      const url = res.data.url;
      // Upload file lên MinIO qua presigned URL
      const uploadRes = await axiosClient.put(url, file, {
        headers: {
          "Content-Type": file.type,
        },
      });
      if (uploadRes.status !== 200 && uploadRes.status !== 201) {
        toast.error("Upload file thất bại");
        throw new Error("Upload file thất bại");
      }

      await fetchList(); // reload danh sách
      return true;
    } finally {
      setLoading(false);
    }
  };

  const checkAndUpload = async (file: File) => {
    if (!file) {
      throw new Error("Chưa chọn file");
    }
    setLoading(true);
    try {
      const res = await axiosClient.post("/minio/check-file", {
        filePath: `${bucket}/${file.name}`,
      });

      if (res.status !== 201) {
        throw new Error("Tìm và upload URL thất bại");
      }

      if (res.data.exists) {
        return;
      }
      const url = res.data.uploadUrl;
      const uploadRes = await axiosClient.put(url, file, {
        headers: {
          "Content-Type": file.type,
        },
      });
      if (uploadRes.status !== 200 && uploadRes.status !== 201) {
        toast.error("Upload file thất bại");
        throw new Error("Upload file thất bại");
      }

      await fetchList(); // reload danh sách
      return true;
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách file
  const fetchList = async () => {
    const res = await axiosClient.get(`/minio?path=${bucket}`);
    if (res.status !== 200) throw new Error("Không thể lấy danh sách file");
    const data = res.data;
    setList(data);
    return data;
  };

  // Lấy URL download ảnh
  const getDownloadUrl = async (objectName: string) => {
    const res = await axiosClient.get(
      `minio/create-download-url?objectName=${bucket}/${objectName}`
    );
    if (res.status !== 200) throw new Error("Không thể lấy download URL");
    const { url } = res.data;
    return url;
  };

  const removeFile = async (objectName: string) => {
    const res = await axiosClient.delete(
      `minio/remove?objectName=${bucket}/${objectName}`
    );
    if (res.status !== 200) throw new Error("Xoá file thất bại");
    await fetchList(); // reload danh sách
  };

  // Hàm lấy URL xem file (ảnh)
  const getViewUrl = async (objectName: string) => {
    try {
      const res = await axiosClient.get(
        `/minio/view-file?objectName=${bucket}/${objectName}`
      );
      if (res.status === 200) {
        return res.data.url;
      }
      return null;
    } catch (error) {
      console.error("Error getting view URL:", error);
      return null;
    }
  };

  return {
    list,
    loading,
    uploadFile,
    checkAndUpload,
    fetchList,
    getDownloadUrl,
    getViewUrl,
    removeFile,
  };
};
