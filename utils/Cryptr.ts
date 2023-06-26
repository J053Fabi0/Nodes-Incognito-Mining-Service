export default class Cryptr {
  private keyString: string;
  private keyHash?: ArrayBuffer;

  constructor(key: string) {
    if (key.length === 0) throw new Error("Key cannot be empty");
    this.keyString = key;
  }

  private async getKeyHash() {
    if (this.keyHash) return this.keyHash;

    // encode password as UTF-8
    const pwUtf8 = new TextEncoder().encode(this.keyString);
    // hash the password
    this.keyHash = await crypto.subtle.digest("SHA-256", pwUtf8);
    return this.keyHash;
  }

  /**
   * Encrypts plaintext using AES-GCM with supplied password, for decryption with aes_gcm_decrypt()
   *
   * @param plaintext plain text to be encrypted
   * @returns encrypted cipher text
   */
  async encrypt(plainText: string) {
    const keyHash = await this.getKeyHash();
    // get 96-bit random iv
    const iv = crypto.getRandomValues(new Uint8Array(12));
    // iv as utf-8 string
    const ivStr = Array.from(iv)
      .map((b) => String.fromCharCode(b))
      .join("");
    // specify algorithm to use
    const alg = { name: "AES-GCM", iv: iv };
    // generate key from pw
    const key = await crypto.subtle.importKey("raw", keyHash, alg, false, ["encrypt"]);
    // encode plaintext as UTF-8
    const ptUint8 = new TextEncoder().encode(plainText);
    // encrypt plaintext using key
    const ctBuffer = await crypto.subtle.encrypt(alg, key, ptUint8);
    // ciphertext as byte array
    const ctArray = Array.from(new Uint8Array(ctBuffer));
    // ciphertext as string
    const ctStr = ctArray.map((byte) => String.fromCharCode(byte)).join("");
    // iv+ciphertext base64-encoded
    return btoa(ivStr + ctStr);
  }

  /**
   * Decrypts ciphertext encrypted with aes_gcm_encrypt() using supplied password
   *
   * @param  cipherText ciphertext to be decrypted
   * @returns decrypted plaintext
   */
  async decrypt(cipherText: string) {
    const keyHash = await this.getKeyHash();
    // decode base64 iv
    const ivStr = atob(cipherText).slice(0, 12);
    // iv as Uint8Array
    const iv = new Uint8Array(Array.from(ivStr).map((ch) => ch.charCodeAt(0)));
    // specify algorithm to use
    const alg = { name: "AES-GCM", iv: iv };
    // generate key from pw
    const key = await crypto.subtle.importKey("raw", keyHash, alg, false, ["decrypt"]);
    // decode base64 ciphertext
    const ctStr = atob(cipherText).slice(12);
    // ciphertext as Uint8Array
    const ctUint8 = new Uint8Array(Array.from(ctStr).map((ch) => ch.charCodeAt(0)));

    try {
      // decrypt ciphertext using key
      const plainBuffer = await crypto.subtle.decrypt(alg, key, ctUint8);
      // return plaintext from ArrayBuffer
      return new TextDecoder().decode(plainBuffer);
    } catch {
      throw new Error("decrypt failed");
    }
  }
}
