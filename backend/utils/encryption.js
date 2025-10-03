// backend/utils/encryption.js
import CryptoJS from 'crypto-js';
import dotenv from 'dotenv';
dotenv.config();
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

export const encrypt = (text) => {
    return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

export const decrypt = (ciphertext) => {
    const bytes = CryptoJS.AES.decrypt(ciphertext, ENCRYPTION_KEY);
    return bytes.toString(CryptoJS.enc.Utf8);
};