export async function compressProfileImage(file: File) {
  const imageBitmap = await createImageBitmap(file);
  const maxSize = 512;
  const scale = Math.min(maxSize / imageBitmap.width, maxSize / imageBitmap.height, 1);
  const targetWidth = Math.max(1, Math.round(imageBitmap.width * scale));
  const targetHeight = Math.max(1, Math.round(imageBitmap.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Image compression is not supported in this browser');
  }

  context.drawImage(imageBitmap, 0, 0, targetWidth, targetHeight);

  const imageDataUrl = canvas.toDataURL('image/webp', 0.82);

  if (!imageDataUrl.startsWith('data:image/webp')) {
    throw new Error('Failed to compress the selected image');
  }

  return imageDataUrl;
}
