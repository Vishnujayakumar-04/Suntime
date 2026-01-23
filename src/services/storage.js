import { storage } from '../config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/**
 * Upload profile image to Firebase Storage
 * Uses XMLHttpRequest for robust Blob creation on React Native
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

        // 1. Create Blob using XMLHttpRequest (Most reliable for RN)
        const blob = await new Promise((resolve, reject) => {
            const xhr = new XMLHttpRequest();
            xhr.onload = function () {
                resolve(xhr.response);
            };
            xhr.onerror = function (e) {
                console.log('[Storage] XHR Error:', e);
                reject(new TypeError('Network request failed'));
            };
            xhr.responseType = 'blob';
            xhr.open('GET', uri, true);
            xhr.send(null);
        });

        // 2. Create a reference
        // Path: profileImages/{uid}/profile.jpg (Requested format)
        const filename = `profileImages/${uid}/profile.jpg`;
        const storageRef = ref(storage, filename);

        // 3. Upload
        const result = await uploadBytes(storageRef, blob);
        console.log('[Storage] Upload success:', result.metadata.fullPath);

        // 4. Get URL
        const downloadURL = await getDownloadURL(storageRef);
        console.log('[Storage] Download URL:', downloadURL);

        // Cleanup blob
        try {
            blob.close();
        } catch (e) {
            // Ignore clean up errors
        }

        return downloadURL;

    } catch (error) {
        console.error('[Storage] Upload failed:', error);
        return null;
    }
};
