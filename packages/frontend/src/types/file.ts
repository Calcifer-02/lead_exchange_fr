// File upload types based on backend API

export interface UploadFileRequest {
  file: string; // base64 encoded
  fileName: string;
  contentType: string;
}

export interface UploadFileResponse {
  url: string;
}

export interface UploadFilesRequest {
  files: UploadFileRequest[];
}

export interface UploadFilesResponse {
  urls: string[];
}

export interface ApiError {
  code: number;
  message: string;
  details?: unknown[];
}

