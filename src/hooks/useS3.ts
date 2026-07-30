import apiClient from "@/lib/api-client";
import { useState, useCallback } from "react";
import { toast } from "sonner";

export const useS3 = (bucket: string) => {
  const [list, setList] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // Upload file lên S3
  const uploadFile = async (file: File) => {
    if (!file) {
      throw new Error("Chưa chọn file");
    }
    setLoading(true);
    try {
      // Lấy presigned URL từ Nest
      const res = await apiClient.post("/s3/create-upload-url", {
        path: `${bucket}/${file.name}`,
      });
      if (res.status !== 201) {
        throw new Error("Tạo upload URL thất bại");
      }
      const url = res.data.url;
      // Upload file lên S3 qua presigned URL
      const uploadRes = await apiClient.put(url, file, {
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
    } catch (error) {
      toast.error("Upload file thất bại");
      return false;
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
      const res = await apiClient.post("/s3/check-file", {
        filePath: `${bucket}/${file.name}`,
      });

      if (res.status !== 201) {
        throw new Error("Tìm và upload URL thất bại");
      }

      if (res.data.exists) {
        return;
      }
      const url = res.data.uploadUrl;
      const uploadRes = await apiClient.put(url, file, {
        headers: {
          "Content-Type": file.type,
        },
      });
      if (uploadRes.status !== 200 && uploadRes.status !== 201) {
        throw new Error("Upload file thất bại");
      }

      await fetchList(); // reload danh sách
      return true;
    } catch (error) {
      toast.error("Upload file thất bại");
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Lấy danh sách file
  const fetchList = async () => {
    const res = await apiClient.get(`/s3/list?path=${bucket}`);
    if (res.status !== 200) throw new Error("Không thể lấy danh sách file");
    const data = res.data;
    setList(data);
    return data;
  };

  // Lấy URL download ảnh
  const getDownloadUrl = async (objectName: string) => {
    const res = await apiClient.get(
      `s3/create-download-url?objectName=${bucket}/${objectName}`,
    );
    if (res.status !== 200) throw new Error("Không thể lấy download URL");
    const { url } = res.data;
    return url;
  };

  const removeFile = async (objectName: string) => {
    const res = await apiClient.delete(
      `s3/remove?objectName=${bucket}/${objectName}`,
    );
    if (res.status !== 200) throw new Error("Xoá file thất bại");
    await fetchList(); // reload danh sách
  };

  // Hàm lấy URL xem file (ảnh)
  const getViewUrl = useCallback(
    async (objectName: string) => {
      try {
        const res = await apiClient.get(
          `/s3/view-file?objectName=${bucket}/${objectName}`,
        );
        if (res.status === 200) {
          return res.data.url;
        }
        return null;
      } catch (error) {
        console.error("Error getting view URL:", error);
        return null;
      }
    },
    [bucket],
  );

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
