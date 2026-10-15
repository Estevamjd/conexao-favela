type GuideDocumentAssetMetadata = {
  readonly mimeType?: string;
  readonly name: string;
};

const guideDocumentContentTypes = new Set([
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export function sanitizeGuideDocumentFileName(fileName: string): string {
  const sanitized = fileName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');

  return sanitized.length > 0 ? sanitized : 'document';
}

export function resolveGuideDocumentContentType(asset: GuideDocumentAssetMetadata): string {
  if (asset.mimeType && guideDocumentContentTypes.has(asset.mimeType)) {
    return asset.mimeType;
  }

  const extension = asset.name.toLowerCase().split('.').pop();

  if (extension === 'pdf') {
    return 'application/pdf';
  }

  if (extension === 'jpg' || extension === 'jpeg') {
    return 'image/jpeg';
  }

  if (extension === 'png') {
    return 'image/png';
  }

  if (extension === 'webp') {
    return 'image/webp';
  }

  throw new Error('Documento deve ser PDF, JPG, PNG ou WEBP.');
}

export function buildGuideDocumentStoragePath(options: {
  readonly fileName: string;
  readonly guideId: string;
  readonly index: number;
  readonly uploadedAtMs: number;
}): string {
  return `guide-documents/${options.guideId}/${options.uploadedAtMs.toString()}-${options.index.toString()}-${sanitizeGuideDocumentFileName(options.fileName)}`;
}
