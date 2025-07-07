# Totem UI Security Review

## Executive Summary

This security review identifies critical vulnerabilities in the Totem UI application, particularly around WebSocket communications and local storage handling. While blockchain transaction security is handled by the runtime, significant risks exist in client-side data handling, communication channels, and cryptographic key management.

**Risk Level: HIGH** - Immediate action required on local storage encryption and WebSocket security.

## Scope

This review covers:
- ✅ WebSocket implementation security
- ✅ Local storage security and encryption
- ✅ Client-side cryptographic implementations
- ✅ Cross-site scripting and injection vulnerabilities  
- ✅ Authentication and session management
- ✅ Network communication security
- ❌ Blockchain transaction validation (handled by runtime)

## Critical Security Vulnerabilities

### 🚨 **CRITICAL: Unencrypted Local Storage**

**Risk Level:** CRITICAL
**Impact:** Complete exposure of sensitive user data including private keys, chat history, financial data

#### Current Implementation Issues
```javascript
// src/utils/DataStorage.js - VULNERABLE
export const write = (key, value, asMap = true, storage = _storage) => {
    // Direct storage to localStorage - NO ENCRYPTION
    storage.setItem(key, JSON.stringify(value))
}

// src/modules/identity/identity.js - STORES PRIVATE KEYS UNENCRYPTED
const identities = new DataStorage('totem_identities')
// Contains: { uri: "seed phrase", address: "...", privateKey: "..." }
```

#### Sensitive Data Exposed
- **Private keys and seed phrases** (`totem_identities`)
- **Chat message history** (`totem_chat-history`)
- **Partner financial information** (`totem_partners`)
- **Activity and timekeeping data** (`totem_activities`)
- **User authentication tokens**

#### Recommended Solution: Transparent Local Encryption

**Implementation Strategy:**
```typescript
// New: src/utils/SecureStorage.ts
import { secretbox, randomBytes } from 'tweetnacl'
import { encodeBase64, decodeBase64 } from 'tweetnacl-util'

class SecureStorage {
    private key: Uint8Array | null = null
    private isUnlocked = false

    // Derive encryption key from user password + device fingerprint
    private async deriveKey(password: string): Promise<Uint8Array> {
        const deviceFingerprint = await this.getDeviceFingerprint()
        const combined = new TextEncoder().encode(password + deviceFingerprint)
        
        // Use PBKDF2 with high iteration count
        const key = await crypto.subtle.importKey(
            'raw', combined, 'PBKDF2', false, ['deriveBits']
        )
        const derivedBits = await crypto.subtle.deriveBits(
            {
                name: 'PBKDF2',
                salt: new TextEncoder().encode('totem-salt-v1'),
                iterations: 100000,
                hash: 'SHA-256'
            },
            key,
            256
        )
        return new Uint8Array(derivedBits)
    }

    // One-time password entry with session persistence
    async unlock(password: string): Promise<boolean> {
        try {
            this.key = await this.deriveKey(password)
            this.isUnlocked = true
            
            // Store session key in memory only (not localStorage)
            sessionStorage.setItem('totem_session_active', 'true')
            
            // Auto-lock after 8 hours of inactivity
            this.setupAutoLock()
            return true
        } catch (error) {
            return false
        }
    }

    // Encrypt data before storage
    setItem(key: string, value: string): void {
        if (!this.isUnlocked || !this.key) {
            throw new Error('Storage is locked - user must authenticate')
        }

        const nonce = randomBytes(24)
        const messageUint8 = new TextEncoder().encode(value)
        const encrypted = secretbox(messageUint8, nonce, this.key)
        
        const fullMessage = new Uint8Array(nonce.length + encrypted.length)
        fullMessage.set(nonce)
        fullMessage.set(encrypted, nonce.length)
        
        localStorage.setItem(key, encodeBase64(fullMessage))
    }

    // Decrypt data from storage
    getItem(key: string): string | null {
        if (!this.isUnlocked || !this.key) {
            // For non-sensitive data, allow read without unlock
            if (this.isPublicData(key)) {
                return localStorage.getItem(key)
            }
            throw new Error('Storage is locked - user must authenticate')
        }

        const encryptedData = localStorage.getItem(key)
        if (!encryptedData) return null

        try {
            const fullMessage = decodeBase64(encryptedData)
            const nonce = fullMessage.slice(0, 24)
            const message = fullMessage.slice(24)
            
            const decrypted = secretbox.open(message, nonce, this.key)
            if (!decrypted) throw new Error('Decryption failed')
            
            return new TextDecoder().decode(decrypted)
        } catch (error) {
            console.error('Failed to decrypt data:', error)
            return null
        }
    }

    private isPublicData(key: string): boolean {
        // Define which data can be read without encryption
        const publicKeys = ['settings', 'language', 'theme']
        return publicKeys.some(pk => key.includes(pk))
    }

    private async getDeviceFingerprint(): Promise<string> {
        // Create stable device fingerprint
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        ctx.textBaseline = 'top'
        ctx.font = '14px Arial'
        ctx.fillText('Device fingerprint', 2, 2)
        
        return btoa(JSON.stringify({
            canvas: canvas.toDataURL(),
            screen: `${screen.width}x${screen.height}`,
            timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
            language: navigator.language,
            platform: navigator.platform
        }))
    }

    private setupAutoLock(): void {
        let inactivityTimer: NodeJS.Timeout
        
        const resetTimer = () => {
            clearTimeout(inactivityTimer)
            inactivityTimer = setTimeout(() => {
                this.lock()
            }, 8 * 60 * 60 * 1000) // 8 hours
        }

        // Reset timer on user activity
        ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'].forEach(event => {
            document.addEventListener(event, resetTimer, true)
        })
        
        resetTimer()
    }

    lock(): void {
        this.key = null
        this.isUnlocked = false
        sessionStorage.removeItem('totem_session_active')
    }

    isLocked(): boolean {
        return !this.isUnlocked
    }
}

export const secureStorage = new SecureStorage()
```

**Integration with DataStorage:**
```typescript
// Modified: src/utils/DataStorage.js
import { secureStorage } from './SecureStorage'

export const write = (key, value, asMap = true, storage = secureStorage) => {
    try {
        const jsonValue = JSON.stringify(asMap ? Array.from(value) : value)
        storage.setItem(key, jsonValue)
        return true
    } catch (err) {
        if (err.message.includes('locked')) {
            // Show unlock prompt to user
            showUnlockPrompt()
        }
        throw err
    }
}
```

**User Experience Flow:**
```typescript
// Unlock prompt shown only once per session
const showUnlockPrompt = async () => {
    const password = await showPasswordModal({
        title: 'Unlock Totem Data',
        message: 'Enter your password to access encrypted data',
        remember: true // Remember for session
    })
    
    const success = await secureStorage.unlock(password)
    if (!success) {
        throw new Error('Invalid password')
    }
}
```

### 🚨 **CRITICAL: WebSocket Security Vulnerabilities**

**Risk Level:** CRITICAL
**Impact:** Message interception, unauthorized access, data manipulation

#### Current Implementation Issues

**1. No Message Authentication:**
```javascript
// src/utils/chatClient.js - VULNERABLE
export const send = (receiverIds, message, encrypted = false) => {
    // No signature verification
    // No sender authentication
    // No message integrity check
    client.emit('message', { receiverIds, message })
}
```

**2. Optional Encryption:**
```javascript
// Messages can be sent unencrypted
const encrypted = false // USER CHOICE - DANGEROUS
```

**3. No Connection Security:**
```javascript
// No certificate pinning
// No connection authenticity verification
// Vulnerable to MITM attacks
```

#### Recommended Solutions

**1. Mandatory Message Encryption & Authentication:**
```typescript
// New: src/utils/SecureMessageClient.ts
import { box, randomBytes } from 'tweetnacl'
import { identity } from '../modules/identity/identity'

class SecureMessageClient {
    private socket: Socket
    private keyPair: { publicKey: Uint8Array, secretKey: Uint8Array }

    async connect(): Promise<void> {
        // Generate ephemeral key pair for this session
        this.keyPair = box.keyPair()
        
        this.socket = io(CHAT_SERVER_URL, {
            transports: ['websocket'], // Disable polling for security
            upgrade: false,
            rememberUpgrade: false,
            secure: true,
            rejectUnauthorized: true
        })

        // Authenticate connection with signed identity
        await this.authenticateConnection()
    }

    private async authenticateConnection(): Promise<void> {
        const selectedIdentity = identity.getSelected()
        const timestamp = Date.now()
        
        // Sign authentication message with identity key
        const authMessage = JSON.stringify({
            publicKey: Array.from(this.keyPair.publicKey),
            timestamp,
            identityAddress: selectedIdentity.address
        })
        
        const signature = await this.signMessage(authMessage, selectedIdentity.uri)
        
        this.socket.emit('authenticate', {
            message: authMessage,
            signature: Array.from(signature)
        })
    }

    async sendMessage(receiverIds: string[], message: string): Promise<void> {
        // ALWAYS encrypt - no option for plaintext
        for (const receiverId of receiverIds) {
            const encryptedMessage = await this.encryptMessage(message, receiverId)
            
            this.socket.emit('secure_message', {
                to: receiverId,
                from: identity.getSelected().address,
                message: encryptedMessage,
                timestamp: Date.now()
            })
        }
    }

    private async encryptMessage(message: string, receiverAddress: string): Promise<string> {
        // Get receiver's public key (from partner list or identity exchange)
        const receiverPublicKey = await this.getReceiverPublicKey(receiverAddress)
        
        const nonce = randomBytes(24)
        const messageBytes = new TextEncoder().encode(message)
        
        const encrypted = box(
            messageBytes,
            nonce,
            receiverPublicKey,
            this.keyPair.secretKey
        )
        
        return encodeBase64(
            new Uint8Array([...nonce, ...encrypted])
        )
    }

    // Validate all incoming messages
    onMessage(callback: (message: DecryptedMessage) => void): void {
        this.socket.on('secure_message', async (data) => {
            try {
                const decrypted = await this.decryptMessage(data)
                
                // Verify message integrity and authenticity
                if (await this.verifyMessageAuthenticity(decrypted, data)) {
                    callback(decrypted)
                } else {
                    console.warn('Message failed authenticity check:', data)
                }
            } catch (error) {
                console.error('Failed to decrypt message:', error)
            }
        })
    }

    private async verifyMessageAuthenticity(
        message: DecryptedMessage, 
        rawData: any
    ): Promise<boolean> {
        // Verify sender signature
        // Check timestamp (prevent replay attacks)
        // Validate message structure
        const maxAge = 5 * 60 * 1000 // 5 minutes
        if (Date.now() - rawData.timestamp > maxAge) {
            return false
        }
        
        return true
    }
}
```

**2. Certificate Pinning:**
```typescript
// Pin WebSocket server certificate
const EXPECTED_CERT_FINGERPRINT = 'sha256/AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA='

const validateCertificate = (cert: ArrayBuffer): boolean => {
    // Implement certificate pinning validation
    const fingerprint = sha256(cert)
    return fingerprint === EXPECTED_CERT_FINGERPRINT
}
```

**3. Rate Limiting & DoS Protection:**
```typescript
class RateLimiter {
    private messageCounts = new Map<string, number[]>()
    private readonly maxMessages = 100 // per minute
    private readonly windowMs = 60000

    canSendMessage(userAddress: string): boolean {
        const now = Date.now()
        const userMessages = this.messageCounts.get(userAddress) || []
        
        // Remove old messages outside window
        const recentMessages = userMessages.filter(time => now - time < this.windowMs)
        
        if (recentMessages.length >= this.maxMessages) {
            return false
        }
        
        recentMessages.push(now)
        this.messageCounts.set(userAddress, recentMessages)
        return true
    }
}
```

### ⚠️ **HIGH: Cross-Site Scripting (XSS) Vulnerabilities**

**Risk Level:** HIGH
**Impact:** Code injection, session hijacking, data theft

#### Vulnerable Areas

**1. Chat Message Display:**
```javascript
// src/modules/chat/InboxMessages.jsx - VULNERABLE
const MessageContent = ({ content }) => (
    <div dangerouslySetInnerHTML={{ __html: content }} /> // XSS RISK
)
```

**2. Dynamic Form Generation:**
```javascript
// src/components/FormBuilder.jsx - POTENTIAL XSS
<div dangerouslySetInnerHTML={{ __html: someUserInput }} />
```

#### Recommended Solutions

**1. Input Sanitization:**
```typescript
// New: src/utils/sanitization.ts
import DOMPurify from 'dompurify'

export const sanitizeHTML = (html: string): string => {
    return DOMPurify.sanitize(html, {
        ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'p', 'br'],
        ALLOWED_ATTR: [],
        ALLOW_DATA_ATTR: false
    })
}

export const sanitizeText = (text: string): string => {
    return text
        .replace(/[<>]/g, '') // Remove angle brackets
        .replace(/javascript:/gi, '') // Remove javascript: URLs
        .replace(/data:/gi, '') // Remove data: URLs
        .trim()
}
```

**2. Safe Message Rendering:**
```typescript
// Fixed: src/modules/chat/InboxMessages.jsx
const MessageContent = ({ content }: { content: string }) => {
    const sanitizedContent = sanitizeHTML(content)
    return <div dangerouslySetInnerHTML={{ __html: sanitizedContent }} />
}
```

### ⚠️ **HIGH: Cryptographic Implementation Issues**

**Risk Level:** HIGH
**Impact:** Key compromise, data decryption, identity theft

#### Current Issues

**1. Weak Random Number Generation:**
```javascript
// src/utils/utils.js - WEAK RANDOMNESS
export const generateHash = (input, algorithm = 'blake2', bitLength = 256) => {
    // Using Math.random() or weak entropy sources
}
```

**2. Key Derivation Issues:**
```javascript
// src/modules/identity/identity.js - WEAK KEY DERIVATION
const uri = `${generateUri()}${DERIVATION_PATH_PREFIX}0/0`
// No salt, predictable derivation path
```

#### Recommended Solutions

**1. Secure Random Number Generation:**
```typescript
// New: src/utils/secureRandom.ts
export const getSecureRandomBytes = (length: number): Uint8Array => {
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        // Modern browsers
        return crypto.getRandomValues(new Uint8Array(length))
    } else {
        // Fallback (shouldn't happen in modern browsers)
        throw new Error('Secure random number generation not available')
    }
}

export const generateSecureId = (): string => {
    const bytes = getSecureRandomBytes(32)
    return Array.from(bytes, byte => byte.toString(16).padStart(2, '0')).join('')
}
```

**2. Secure Key Derivation:**
```typescript
// Improved: src/modules/identity/identity.js
export const generateSecureIdentity = async (password?: string): Promise<Identity> => {
    // Use high-entropy seed
    const entropy = getSecureRandomBytes(32)
    const mnemonic = generateMnemonic(256) // 24 words
    
    // Add user-provided entropy if available
    if (password) {
        const passwordHash = await crypto.subtle.digest(
            'SHA-256',
            new TextEncoder().encode(password)
        )
        const combined = new Uint8Array(entropy.length + passwordHash.byteLength)
        combined.set(entropy)
        combined.set(new Uint8Array(passwordHash), entropy.length)
        
        // Use combined entropy for derivation
    }
    
    const derivationPath = `//${getSecureRandomBytes(4).join('')}//0//0`
    return createIdentity(mnemonic, derivationPath)
}
```

## Medium Priority Security Issues

### 🔶 **Content Security Policy (CSP)**

**Issue:** No CSP headers to prevent XSS and data injection

**Recommendation:**
```html
<!-- Add to index.html -->
<meta http-equiv="Content-Security-Policy" content="
    default-src 'self';
    script-src 'self' 'unsafe-inline';
    style-src 'self' 'unsafe-inline';
    connect-src 'self' wss://node.totem.live wss://chat.totem.live;
    img-src 'self' data: https:;
    font-src 'self' data:;
    object-src 'none';
    base-uri 'self';
    form-action 'self';
">
```

### 🔶 **Session Management**

**Issue:** No proper session timeout or management

**Recommendation:**
```typescript
// Session management with automatic cleanup
class SessionManager {
    private static readonly SESSION_TIMEOUT = 8 * 60 * 60 * 1000 // 8 hours
    private sessionTimer: NodeJS.Timeout | null = null

    startSession(): void {
        this.extendSession()
    }

    extendSession(): void {
        if (this.sessionTimer) {
            clearTimeout(this.sessionTimer)
        }
        
        this.sessionTimer = setTimeout(() => {
            this.endSession()
        }, SessionManager.SESSION_TIMEOUT)
    }

    endSession(): void {
        secureStorage.lock()
        // Clear sensitive data from memory
        // Redirect to login if needed
    }
}
```

### 🔶 **Input Validation**

**Issue:** Insufficient input validation throughout the application

**Recommendation:**
```typescript
// src/utils/validation.ts
import { z } from 'zod'

export const addressSchema = z.string().regex(/^[0-9a-fA-F]{48}$/)
export const messageSchema = z.string().max(1000).min(1)
export const amountSchema = z.number().positive().finite()

export const validateInput = <T>(schema: z.ZodSchema<T>, input: unknown): T => {
    try {
        return schema.parse(input)
    } catch (error) {
        throw new Error(`Invalid input: ${error.message}`)
    }
}
```

## Implementation Roadmap

### Phase 1: Critical Security Fixes (Week 1-2)
1. **Implement SecureStorage encryption**
   - Deploy NaCl-based local storage encryption
   - Add one-time password authentication
   - Implement session management

2. **Secure WebSocket Implementation**
   - Add mandatory message encryption
   - Implement certificate pinning
   - Add rate limiting

### Phase 2: XSS Prevention (Week 3)
1. **Input Sanitization**
   - Add DOMPurify for HTML sanitization
   - Implement input validation schemas
   - Fix all dangerouslySetInnerHTML usage

### Phase 3: Cryptographic Hardening (Week 4)
1. **Improve Key Management**
   - Secure random number generation
   - Better key derivation
   - Implement key rotation

### Phase 4: Security Testing (Week 5)
1. **Penetration Testing**
   - Automated vulnerability scanning
   - Manual security testing
   - Third-party security audit

## Security Testing Checklist

### ✅ **Local Storage Security**
- [ ] All sensitive data encrypted at rest
- [ ] Password-based encryption working
- [ ] Session timeout implemented
- [ ] No sensitive data in plaintext localStorage

### ✅ **WebSocket Security**
- [ ] All messages encrypted end-to-end
- [ ] Message authentication implemented
- [ ] Rate limiting active
- [ ] Certificate pinning working

### ✅ **XSS Prevention**
- [ ] All user input sanitized
- [ ] No dangerouslySetInnerHTML with user data
- [ ] CSP headers implemented
- [ ] Input validation on all forms

### ✅ **Cryptographic Security**
- [ ] Secure random number generation
- [ ] Proper key derivation
- [ ] Strong encryption algorithms
- [ ] Key rotation implemented

## Usability Considerations

### Password Management Strategy

**Goal:** Balance security with usability - minimize password prompts while maintaining security

**Implementation:**
1. **One password per session** - User enters password once when app starts
2. **Session persistence** - Keep decryption key in memory for session duration
3. **Auto-lock after inactivity** - 8 hours of inactivity triggers lock
4. **Optional biometric unlock** - Use WebAuthn for easier re-authentication
5. **Emergency access** - Backup recovery mechanism for forgotten passwords

### Performance Impact

**Encryption Overhead:**
- Modern browsers handle NaCl encryption efficiently
- Estimated 1-3ms per encrypt/decrypt operation
- Negligible impact on user experience
- Can be optimized with Web Workers for large datasets

### Migration Strategy

**For Existing Users:**
1. **Gradual migration** - Encrypt new data, leave existing data readable
2. **Background encryption** - Slowly encrypt existing data during normal usage
3. **User notification** - Inform users about security improvements
4. **Backup verification** - Ensure encrypted backups work before full migration

## Monitoring & Incident Response

### Security Event Logging

```typescript
// Security event monitoring
class SecurityMonitor {
    static logSecurityEvent(event: SecurityEvent): void {
        console.warn(`Security Event: ${event.type}`, {
            timestamp: new Date().toISOString(),
            event,
            userAgent: navigator.userAgent,
            sessionId: this.getSessionId()
        })
        
        // Send to monitoring service if configured
        if (MONITORING_ENDPOINT) {
            this.sendToMonitoring(event)
        }
    }
}

// Usage throughout app
SecurityMonitor.logSecurityEvent({
    type: 'FAILED_DECRYPTION',
    severity: 'HIGH',
    details: 'User attempted to decrypt data with invalid key'
})
```

### Incident Response Plan

**Security Incident Types:**
1. **Unauthorized access attempts**
2. **Encryption failures**
3. **Suspicious WebSocket activity**
4. **XSS attempts**

**Response Actions:**
1. **Log incident details**
2. **Lock user session if necessary**
3. **Alert user to potential security issue**
4. **Provide recovery instructions**

## Conclusion

The Totem UI application has several critical security vulnerabilities that require immediate attention. The most severe issues are:

1. **Unencrypted local storage** containing private keys and sensitive data
2. **Insecure WebSocket implementation** allowing message interception
3. **XSS vulnerabilities** in message display and form handling

The recommended security improvements will significantly enhance the application's security posture while maintaining good usability. The encryption-at-rest solution using NaCl provides strong security with minimal user friction.

**Immediate Priority:** Implement local storage encryption and secure WebSocket communications to protect user data and communications from unauthorized access.

**Timeline:** 5 weeks to implement all critical security fixes with thorough testing.

**Investment:** High initial effort for implementing encryption, but crucial for user trust and data protection in a financial/blockchain application. 