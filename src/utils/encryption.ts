// Ultra-simple Base64 obfuscation - just encoding with salt
export function obfuscateData<T>(data: T, salt: string): string {
  try {
    // Add salt to the data to make it non-obvious
    const saltedData = { _salt: salt, _data: data };
    const jsonString = JSON.stringify(saltedData);

    // Simple Base64 encoding
    if (typeof Buffer !== "undefined") {
      // Node.js environment
      return Buffer.from(jsonString, "utf8").toString("base64");
    } else {
      // Browser environment
      return btoa(jsonString);
    }
  } catch (error) {
    // console.error("Obfuscation failed:", error);
    return "";
  }
}

// Generate a daily salt based on the date
export function getDailySalt(): string {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  return `fft-${today}`;
}

// Simple Base64 decoding
export function deobfuscateData<T>(
  obfuscatedData: string,
  salt: string
): T | null {
  try {
    // Decode from base64
    let jsonString: string;
    if (typeof Buffer !== "undefined") {
      // Node.js environment
      jsonString = Buffer.from(obfuscatedData, "base64").toString("utf8");
    } else {
      // Browser environment
      jsonString = atob(obfuscatedData);
    }

    const saltedData = JSON.parse(jsonString);

    // Verify salt matches
    if (saltedData._salt !== salt) {
      // console.error("Salt mismatch during deobfuscation");
      return null;
    }

    return saltedData._data;
  } catch (error) {
    // console.error("Deobfuscation failed:", error);
    return null;
  }
}

// Legacy function - keeping for backwards compatibility
export function deobfuscateAnswers(
  obfuscatedData: string,
  salt: string
): {
  name: string;
  country: string;
  acceptableGuesses: string[];
} | null {
  return deobfuscateData(obfuscatedData, salt);
}
