const CryptoJS = require("crypto-js");

const secretKey = CryptoJS.enc.Hex.parse(process.env.MESSAGE_ENCRYPTION_KEY); // Use a secure key

const encrypt = (text) => {
  const iv = CryptoJS.lib.WordArray.random(16);
  const encrypted = CryptoJS.AES.encrypt(text, secretKey, { iv: iv });
  return `${iv.toString()}:${encrypted.toString()}`;
};

const decrypt = (ciphertext) => {
  const [iv, encryptedText] = ciphertext.split(":");
  const decrypted = CryptoJS.AES.decrypt(encryptedText, secretKey, {
    iv: CryptoJS.enc.Hex.parse(iv),
  });
  return decrypted.toString(CryptoJS.enc.Utf8);
};

module.exports = { encrypt, decrypt };
