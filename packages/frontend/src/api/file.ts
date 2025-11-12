import axios from 'axios';
import type { UploadFileRequest, UploadFileResponse, UploadFilesRequest, UploadFilesResponse } from '../types/file';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8081';

const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor для добавления токена авторизации
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Interceptor для логирования ошибок и обработки истекшего токена
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response) {
      console.error('File API Error:', {
        status: error.response.status,
        statusText: error.response.statusText,
        data: error.response.data,
        headers: error.response.headers,
        url: error.config?.url,
        method: error.config?.method,
      });
      console.error('Full error response:', JSON.stringify(error.response.data, null, 2));

      // Проверяем на истекший токен
      const errorData = error.response.data as { code?: number; message?: string };
      if (
        error.response.status === 500 &&
        errorData?.message?.includes('token is expired')
      ) {
        console.warn('Token expired, redirecting to /auth');
        // Очищаем токен и перенаправляем на страницу логина
        localStorage.removeItem('token');
        localStorage.removeItem('userEmail');
        window.location.href = '/auth';
      }
    } else if (error.request) {
      console.error('Network Error - no response received:', error.request);
    } else {
      console.error('Error setting up request:', error.message);
    }
    return Promise.reject(error);
  }
);

/**
 * Преобразует MIME type в формат ожидаемый бэкендом
 * image/jpeg -> jpeg
 * image/png -> png
 * image/webp -> webp
 */
const normalizeMimeType = (mimeType: string): string => {
  const match = mimeType.match(/image\/(jpeg|jpg|png|webp|gif)/i);
  if (match) {
    const type = match[1].toLowerCase();
    // jpg -> jpeg для единообразия
    return type === 'jpg' ? 'jpeg' : type;
  }
  // По умолчанию возвращаем как есть (будет ошибка валидации на бэке)
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
      console.log('File converted to base64:', {
        fileName: file.name,
        fileSize: file.size,
        fileType: file.type,
        base64Length: base64.length,
        base64Preview: base64.substring(0, 100) + '...',
      });
      resolve(base64);
    };
    reader.onerror = (error) => {
      console.error('FileReader error:', error);
      reject(error);
    };
  });
};

export const fileAPI = {
  /**
   * Загрузка одного файла
   */
  uploadFile: async (file: File): Promise<string> => {
    console.log('uploadFile called with:', {
      name: file.name,
      size: file.size,
      type: file.type,
    });

    const base64 = await fileToBase64(file);
    const normalizedContentType = normalizeMimeType(file.type);

    const request: UploadFileRequest = {
      file: base64,
      fileName: file.name,
      contentType: normalizedContentType,
    };

    console.log('Sending upload request:', {
      fileName: request.fileName,
      contentType: request.contentType,
      originalType: file.type,
      fileLength: request.file.length,
    });

    const response = await apiClient.post<UploadFileResponse>('/v1/files/upload', request);

    console.log('Upload response:', response.data);

    // Заменяем MinIO URL на прокси путь для избежания CORS проблем
    let url = response.data.url;

    // Заменяем http://minio:9000 или http://localhost:9000 на /minio-storage
    if (url.includes('minio:9000')) {
      url = url.replace('http://minio:9000', '/minio-storage');
      console.log('URL fixed for proxy access:', url);
    } else if (url.includes('localhost:9000')) {
      url = url.replace('http://localhost:9000', '/minio-storage');
      console.log('URL fixed for proxy access:', url);
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

