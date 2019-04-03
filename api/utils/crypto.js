const crypto = require('crypto');

const key = crypto.randomBytes(32); // process.env.ENCRYPTION_KEY;
const iv = crypto.randomBytes(16);

exports.encrypt = async (data) => {
  try {
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(key), iv);
    let encrypted = cipher.update(data);

    encrypted = Buffer.concat([ encrypted, cipher.final() ]);

    return `${iv.toString('hex')}.${encrypted.toString('hex')}`;
  } catch (exception) {
    throw exception;
  }
};

  exports.decrypt = async (encryptedData) => {
  try {
    const [ iv, encryptedText ] = encryptedData.split('.');
    const ivBuffer = Buffer.from(iv, 'hex');
    const encryptedTextBuffer = Buffer.from(encryptedText, 'hex');

    let decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(key), ivBuffer);
    let decrypted = decipher.update(Buffer.from(encryptedTextBuffer, 'hex'));

    decrypted = Buffer.concat([decrypted, decipher.final()]);

    return decrypted.toString();
  } catch (exception) {
    throw exception;
  }
};
