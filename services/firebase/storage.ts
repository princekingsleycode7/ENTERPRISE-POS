/**
 * services/firebase/storage.ts
 * 
 * Cloud Storage integration for product images
 */

import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { app } from './config';

const storage = getStorage(app);

export const storageService = {
  /**
   * Upload product image to Cloud Storage
   * @param file - Image file to upload
   * @param productId - Product ID for organizing storage
   * @returns Download URL for the uploaded image
   */
  uploadProductImage: async (file: File, productId: string): Promise<string> => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      throw new Error('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
    }

    // Validate file size (max 5MB)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      throw new Error('File size exceeds 5MB limit.');
    }

    try {
      // Create unique filename
      const timestamp = Date.now();
      const fileName = `${productId}-${timestamp}-${file.name}`;
      const storageRef = ref(storage, `products/${productId}/${fileName}`);

      // Upload file
      const snapshot = await uploadBytes(storageRef, file, {
        contentType: file.type
      });

      // Get download URL
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error) {
      console.error('Image upload error:', error);
      throw new Error(`Failed to upload image: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  },

  /**
   * Delete product image from Cloud Storage
   * @param imageUrl - Full download URL of the image to delete
   */
  deleteProductImage: async (imageUrl: string): Promise<void> => {
    try {
      // Extract the path from the URL
      // URL format: https://firebasestorage.googleapis.com/v0/b/{bucket}/o/{path}?...
      const urlParts = imageUrl.split('/o/')[1];
      if (!urlParts) {
        console.warn('Invalid image URL format');
        return;
      }

      const decodedPath = decodeURIComponent(urlParts.split('?')[0]);
      const imageRef = ref(storage, decodedPath);

      await deleteObject(imageRef);
    } catch (error) {
      console.error('Image deletion error:', error);
      // Don't throw - deletion errors are not critical
    }
  },

  /**
   * Replace product image (deletes old, uploads new)
   * @param newFile - New image file to upload
   * @param productId - Product ID
   * @param oldImageUrl - Optional old image URL to delete
   * @returns New download URL
   */
  replaceProductImage: async (
    newFile: File,
    productId: string,
    oldImageUrl?: string
  ): Promise<string> => {
    // Upload new image first
    const newUrl = await storageService.uploadProductImage(newFile, productId);

    // Delete old image if provided
    if (oldImageUrl) {
      await storageService.deleteProductImage(oldImageUrl);
    }

    return newUrl;
  },

  /**
   * Batch upload multiple images
   * @param files - Array of files to upload
   * @param productId - Product ID
   * @returns Array of download URLs
   */
  uploadMultipleImages: async (files: File[], productId: string): Promise<string[]> => {
    const urls: string[] = [];

    for (const file of files) {
      try {
        const url = await storageService.uploadProductImage(file, productId);
        urls.push(url);
      } catch (error) {
        console.error(`Failed to upload ${file.name}:`, error);
        // Continue with next file instead of failing completely
      }
    }

    return urls;
  },

  /**
   * Get storage reference for advanced operations
   */
  getStorageRef: (path: string) => {
    return ref(storage, path);
  }
};
