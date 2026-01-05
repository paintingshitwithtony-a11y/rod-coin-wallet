// Base58Check encoding for ROD Core wallet addresses
// ROD uses Bitcoin-style Base58Check with version byte 0x3C (60) for mainnet

const ALPHABET = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
const ALPHABET_MAP = {};
for (let i = 0; i < ALPHABET.length; i++) {
    ALPHABET_MAP[ALPHABET[i]] = i;
}

// Simple SHA256 implementation using Web Crypto API
async function sha256(buffer) {
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    return new Uint8Array(hashBuffer);
}

// Double SHA256 for checksum
async function doubleSha256(buffer) {
    const first = await sha256(buffer);
    return await sha256(first);
}

// Convert hex string to Uint8Array
function hexToBytes(hex) {
    const bytes = new Uint8Array(hex.length / 2);
    for (let i = 0; i < hex.length; i += 2) {
        bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
    }
    return bytes;
}

// Convert Uint8Array to hex string
function bytesToHex(bytes) {
    return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Base58 encode
function base58Encode(buffer) {
    if (buffer.length === 0) return '';
    
    const bytes = Array.from(buffer);
    
    // Count leading zeros
    let leadingZeros = 0;
    for (let i = 0; i < bytes.length && bytes[i] === 0; i++) {
        leadingZeros++;
    }
    
    // Convert to base58
    const size = Math.ceil(bytes.length * 138 / 100) + 1;
    const b58 = new Array(size).fill(0);
    
    for (let i = 0; i < bytes.length; i++) {
        let carry = bytes[i];
        for (let j = size - 1; j >= 0; j--) {
            carry += 256 * b58[j];
            b58[j] = carry % 58;
            carry = Math.floor(carry / 58);
        }
    }
    
    // Skip leading zeros in base58 result
    let startIndex = 0;
    while (startIndex < b58.length && b58[startIndex] === 0) {
        startIndex++;
    }
    
    // Build result string
    let result = '1'.repeat(leadingZeros);
    for (let i = startIndex; i < b58.length; i++) {
        result += ALPHABET[b58[i]];
    }
    
    return result;
}

// Base58 decode
function base58Decode(str) {
    if (str.length === 0) return new Uint8Array(0);
    
    // Count leading '1's
    let leadingOnes = 0;
    for (let i = 0; i < str.length && str[i] === '1'; i++) {
        leadingOnes++;
    }
    
    // Allocate enough space
    const size = Math.ceil(str.length * 733 / 1000) + 1;
    const bytes = new Array(size).fill(0);
    
    for (let i = 0; i < str.length; i++) {
        const value = ALPHABET_MAP[str[i]];
        if (value === undefined) {
            throw new Error('Invalid Base58 character');
        }
        
        let carry = value;
        for (let j = size - 1; j >= 0; j--) {
            carry += 58 * bytes[j];
            bytes[j] = carry % 256;
            carry = Math.floor(carry / 256);
        }
    }
    
    // Skip leading zeros in result
    let startIndex = 0;
    while (startIndex < bytes.length && bytes[startIndex] === 0) {
        startIndex++;
    }
    
    // Build result with leading zeros from '1's
    const result = new Uint8Array(leadingOnes + (bytes.length - startIndex));
    for (let i = 0; i < leadingOnes; i++) {
        result[i] = 0;
    }
    for (let i = startIndex; i < bytes.length; i++) {
        result[leadingOnes + (i - startIndex)] = bytes[i];
    }
    
    return result;
}

// ROD version byte (mainnet P2PKH) - typically 0x3C (60) for ROD
const ROD_VERSION_BYTE = 0x3C;

// Generate a valid ROD address from a public key hash (RIPEMD160 of SHA256 of public key)
export async function generateRODAddress(publicKeyHash) {
    // If string, convert to bytes
    let hashBytes;
    if (typeof publicKeyHash === 'string') {
        hashBytes = hexToBytes(publicKeyHash);
    } else {
        hashBytes = publicKeyHash;
    }
    
    // Version byte + public key hash (20 bytes)
    const versionedPayload = new Uint8Array(21);
    versionedPayload[0] = ROD_VERSION_BYTE;
    versionedPayload.set(hashBytes, 1);
    
    // Calculate checksum (first 4 bytes of double SHA256)
    const checksum = await doubleSha256(versionedPayload);
    
    // Combine versioned payload + 4-byte checksum
    const addressBytes = new Uint8Array(25);
    addressBytes.set(versionedPayload);
    addressBytes.set(checksum.slice(0, 4), 21);
    
    // Base58 encode
    return base58Encode(addressBytes);
}

// Generate random 20-byte public key hash (simulating RIPEMD160(SHA256(pubkey)))
export function generateRandomPublicKeyHash() {
    const hash = new Uint8Array(20);
    crypto.getRandomValues(hash);
    return hash;
}

// Generate a complete new ROD address
export async function generateNewRODAddress() {
    const publicKeyHash = generateRandomPublicKeyHash();
    const address = await generateRODAddress(publicKeyHash);
    return {
        address,
        publicKeyHash: bytesToHex(publicKeyHash)
    };
}

// Validate a ROD address
export async function validateRODAddress(address) {
    try {
        // Check length (26-35 characters)
        if (address.length < 26 || address.length > 35) {
            return { valid: false, error: 'Invalid address length' };
        }
        
        // Decode Base58
        const decoded = base58Decode(address);
        
        // Should be 25 bytes (1 version + 20 hash + 4 checksum)
        if (decoded.length !== 25) {
            return { valid: false, error: 'Invalid decoded length' };
        }
        
        // Check version byte
        if (decoded[0] !== ROD_VERSION_BYTE) {
            return { valid: false, error: 'Invalid version byte' };
        }
        
        // Verify checksum
        const payload = decoded.slice(0, 21);
        const checksum = decoded.slice(21);
        const calculatedChecksum = await doubleSha256(payload);
        
        for (let i = 0; i < 4; i++) {
            if (checksum[i] !== calculatedChecksum[i]) {
                return { valid: false, error: 'Invalid checksum' };
            }
        }
        
        return { valid: true };
    } catch (e) {
        return { valid: false, error: e.message };
    }
}

// Generate private key (32 bytes)
export function generatePrivateKey() {
    const privateKey = new Uint8Array(32);
    crypto.getRandomValues(privateKey);
    return bytesToHex(privateKey);
}

export { hexToBytes, bytesToHex, base58Encode, base58Decode };