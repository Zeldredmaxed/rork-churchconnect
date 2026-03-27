import { Platform } from 'react-native';
import { getToken, API_URL } from './api';

export interface UploadResult {
  url: string;
  public_id: string;
  original_name: string;
  content_type: string;
  size: number;
  category: 'image' | 'video' | 'audio';
  width?: number;
  height?: number;
}

interface UploadFileParams {
  uri: string;
  fileName?: string;
  mimeType?: string;
  category?: 'image' | 'video' | 'audio';
  folder?: string;
}

async function getAuthHeaders(): Promise<Record<string, string>> {
  const token = await getToken();
  if (!token) throw new Error('Not authenticated');
  return { Authorization: `Bearer ${token}` };
}

export async function uploadSingleFile(params: UploadFileParams): Promise<UploadResult> {
  const { uri, fileName, mimeType, category, folder } = params;

  const formData = new FormData();

  const uriParts = uri.split('.');
  const ext = uriParts[uriParts.length - 1] || 'jpg';
  const resolvedName = fileName || `upload_${Date.now()}.${ext}`;
  const resolvedMime = mimeType || guessMimeType(ext);

  if (Platform.OS === 'web') {
    try {
      const response = await fetch(uri);
      const blob = await response.blob();
      formData.append('file', blob, resolvedName);
    } catch (e) {
      console.log('[Upload] Web blob creation failed, using uri approach:', e);
      formData.append('file', {
        uri,
        name: resolvedName,
        type: resolvedMime,
      } as unknown as Blob);
    }
  } else {
    formData.append('file', {
      uri,
      name: resolvedName,
      type: resolvedMime,
    } as unknown as Blob);
  }

  if (category) formData.append('category', category);
  if (folder) formData.append('folder', folder);

  const headers = await getAuthHeaders();

  console.log('[Upload] Uploading single file:', resolvedName, 'mime:', resolvedMime);

  const res = await fetch(`${API_URL}/uploads`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.log('[Upload] Upload failed:', res.status, errorData);
    throw new Error(errorData.message || errorData.detail || `Upload failed: ${res.status}`);
  }

  const json = await res.json();
  console.log('[Upload] Upload success:', json.data?.url?.slice(0, 80));
  return json.data as UploadResult;
}

export async function uploadMultipleFiles(
  files: UploadFileParams[]
): Promise<UploadResult[]> {
  const formData = new FormData();

  for (const file of files) {
    const uriParts = file.uri.split('.');
    const ext = uriParts[uriParts.length - 1] || 'jpg';
    const resolvedName = file.fileName || `upload_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const resolvedMime = file.mimeType || guessMimeType(ext);

    if (Platform.OS === 'web') {
      try {
        const response = await fetch(file.uri);
        const blob = await response.blob();
        formData.append('files', blob, resolvedName);
      } catch {
        formData.append('files', {
          uri: file.uri,
          name: resolvedName,
          type: resolvedMime,
        } as unknown as Blob);
      }
    } else {
      formData.append('files', {
        uri: file.uri,
        name: resolvedName,
        type: resolvedMime,
      } as unknown as Blob);
    }
  }

  const headers = await getAuthHeaders();

  console.log('[Upload] Uploading', files.length, 'files via batch endpoint');

  const res = await fetch(`${API_URL}/uploads/multiple`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    console.log('[Upload] Batch upload failed:', res.status, errorData);
    throw new Error(errorData.message || errorData.detail || `Batch upload failed: ${res.status}`);
  }

  const json = await res.json();
  const results = json.data as UploadResult[];
  console.log('[Upload] Batch upload success:', results.length, 'files');
  return results;
}

function guessMimeType(ext: string): string {
  const map: Record<string, string> = {
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    png: 'image/png',
    gif: 'image/gif',
    webp: 'image/webp',
    heic: 'image/heic',
    mp4: 'video/mp4',
    mov: 'video/quicktime',
    webm: 'video/webm',
    avi: 'video/x-msvideo',
    mp3: 'audio/mpeg',
    wav: 'audio/wav',
    ogg: 'audio/ogg',
  };
  return map[ext.toLowerCase()] || 'application/octet-stream';
}
