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

export async function uploadSingleFile(params: UploadFileParams): Promise<UploadResult> {
  console.log('[Upload-Mock] uploadSingleFile called (no backend):', params.uri?.slice(0, 60));
  const uriParts = params.uri.split('.');
  const ext = uriParts[uriParts.length - 1] || 'jpg';
  const resolvedName = params.fileName || `upload_${Date.now()}.${ext}`;
  const resolvedMime = params.mimeType || guessMimeType(ext);

  return {
    url: params.uri,
    public_id: `mock_${Date.now()}`,
    original_name: resolvedName,
    content_type: resolvedMime,
    size: 0,
    category: params.category ?? 'image',
  };
}

export async function uploadMultipleFiles(
  files: UploadFileParams[]
): Promise<UploadResult[]> {
  console.log('[Upload-Mock] uploadMultipleFiles called (no backend):', files.length, 'files');
  const results: UploadResult[] = [];
  for (const file of files) {
    results.push(await uploadSingleFile(file));
  }
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
