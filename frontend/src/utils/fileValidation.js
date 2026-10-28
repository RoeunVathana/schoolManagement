export const MAX_IMAGE_SIZE_BYTES = 50 * 1024 * 1024;

export const isImageTooLarge = (file) => Boolean(file && file.size > MAX_IMAGE_SIZE_BYTES);
