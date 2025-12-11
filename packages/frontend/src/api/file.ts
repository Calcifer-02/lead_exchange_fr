import { apiClient } from './apiClient';
import type { UploadFileRequest, UploadFileResponse, UploadFilesRequest, UploadFilesResponse } from '../types/file';

/**
 * Преобразует MIME type в формат ожидаемый бэкендом
 * image/jpeg -> jpeg
 * image/png -> png
 * image/webp -> webp
 */
const normalizeMimeType = (mimeType: string): string => {
  const match = mimeType.match(/image\/(jpeg|jpg|png|webp|gif)/i);
  if (match) {
    return match[1].toLowerCase() === 'jpg' ? 'jpeg' : match[1].toLowerCase();
  }
  return mimeType;
};

/**
 * Конвертирует File в base64 строку
 */
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Убираем префикс "data:image/png;base64," и оставляем только base64
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => {
      reject(error);
    };
  });
};

export const fileAPI = {
  /**
   * Загрузка одного файла
   */
  uploadFile: async (file: File): Promise<string> => {
    const base64 = await fileToBase64(file);
    const normalizedContentType = normalizeMimeType(file.type);

    const request: UploadFileRequest = {
      file: base64,
      fileName: file.name,
      contentType: normalizedContentType,
    };

    const response = await apiClient.post<UploadFileResponse>('/v1/files/upload', request);

    // Заменяем MinIO URL на прокси путь для избежания CORS проблем
    let url = response.data.url;

    // Заменяем http://minio:9000 или http://localhost:9000 на /minio-storage
    if (url.includes('minio:9000')) {
      url = url.replace('http://minio:9000', '/minio-storage');
    } else if (url.includes('localhost:9000')) {
      url = url.replace('http://localhost:9000', '/minio-storage');
    }

    return url;
  },

  /**
   * Загрузка нескольких файлов
   */
  uploadFiles: async (files: File[]): Promise<string[]> => {
    const filesData = await Promise.all(
      files.map(async (file) => ({
        file: await fileToBase64(file),
        fileName: file.name,
        contentType: normalizeMimeType(file.type),
      }))
    );

    const request: UploadFilesRequest = {
      files: filesData,
    };

    const response = await apiClient.post<UploadFilesResponse>('/v1/files/uploads', request);

    // Заменяем MinIO URL на прокси путь для избежания CORS проблем
    return response.data.urls.map(url => {
      if (url.includes('minio:9000')) {
        return url.replace('http://minio:9000', '/minio-storage');
      } else if (url.includes('localhost:9000')) {
        return url.replace('http://localhost:9000', '/minio-storage');
      }
      return url;
    });
  },
};
