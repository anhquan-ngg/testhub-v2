import axios from "axios";
import apiClient from "@/lib/api-client";
import { useCallback } from "react";

type FileType = "AUDIO" | "IMAGE" | "VIDEO";

type CreateUploadArgs = {
  name: string;
  type: FileType;
  size?: number;
  entity_type?: string;
  entity_id?: string;
};

type FileRecord = {
  id: string;
  name: string;
  url: string;
  s3_key: string;
  type: FileType;
  size?: number;
  entity_type?: string;
  entity_id?: string;
  uploaded_by: string;
  uploaded_at: string;
  status: "PENDING" | "ACTIVE" | "DELETED";
};

const isPublicUrl = (value?: string | null) =>
  Boolean(value && /^https?:\/\//i.test(value));

export const useFiles = () => {
  const createUploadUrl = useCallback(async (args: CreateUploadArgs) => {
    const res = await apiClient.post("/files/upload-url", args);
    return res.data as { file: FileRecord; uploadUrl: string };
  }, []);

  const uploadToS3 = useCallback(async (uploadUrl: string, file: File) => {
    const res = await axios.put(uploadUrl, file, {
      headers: {
        "Content-Type": file.type,
      },
    });

    if (res.status !== 200 && res.status !== 201) {
      throw new Error("Upload file failed");
    }
  }, []);

  const confirmUploaded = useCallback(async (fileId: string) => {
    const res = await apiClient.post(`/files/${fileId}/confirm`);
    return res.data as FileRecord;
  }, []);

  const uploadAvatar = useCallback(async (file: File, userId: string) => {
    const { file: fileRecord, uploadUrl } = await createUploadUrl({
      name: file.name,
      type: "IMAGE",
      size: file.size,
      entity_type: "users",
      entity_id: userId,
    });

    await uploadToS3(uploadUrl, file);
    return confirmUploaded(fileRecord.id);
  }, [confirmUploaded, createUploadUrl, uploadToS3]);

  const markFileDeletedByUrl = useCallback(async (url?: string | null) => {
    if (!isPublicUrl(url)) return null;

    const res = await apiClient.post("/model/File/updateMany", {
      args: {
        where: {
          url,
          status: { not: "DELETED" },
        },
        data: {
          status: "DELETED",
        },
      },
    });

    return res.data;
  }, []);

  const getViewUrl = useCallback(async (fileId: string) => {
    const res = await apiClient.get(`/files/${fileId}/view-url`);
    return res.data.url as string;
  }, []);

  return {
    createUploadUrl,
    uploadToS3,
    confirmUploaded,
    uploadAvatar,
    markFileDeletedByUrl,
    getViewUrl,
  };
};
