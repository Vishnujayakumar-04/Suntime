import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload profile image to Firebase Storage
 * 
 * @param {string} uid - User ID
 * @param {string} uri - Local file URI
 * @returns {Promise<string|null>} Download URL of the uploaded image
 */
export const uploadProfileImage = async (uid, uri) => {
    try {
        if (!uid || !uri) return null;
        if (!storage) {
            console.error('Firebase Storage not initialized');
            return null;
        }

        console.log(`[Storage] Starting upload for user: ${uid}`);

        // 1. Fetch the image and convert to Blob
        const response = await fetch(uri);
        const blob = await response.blob();

        // 2. Create a reference
        // Path: profile_images/{uid}.jpg
        // Using a fixed name overwrites previous image, which saves space
        const filename = `profilePictures/${uid}.jpg`;
        const storageRef = ref(storage, filename);

        // 3. Upload
        const result = await uploadBytes(storageRef, blob);
        console.log('[Storage] Upload success:', result.metadata.fullPath);

        // 4. Get URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Download URL:', downloadURL);

        // Cleanup blob (helper function if needed, or JS GC handles it mostly)
        // blob.close(); 

        return downloadURL;

    } catch (error) {
        console.error('[Storage] Upload failed:', error);
        return null;
    }
};
