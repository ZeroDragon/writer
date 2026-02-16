async function bufferToHex (buffer) {
  const bytes = new Uint8Array(buffer)
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('')
}

async function hexToBuffer (hex) {
  const bytes = hexToBytes(hex)
  return bytes.buffer
}

async function createHash (text) {
  const encoder = new TextEncoder()
  const data = encoder.encode(text)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer)).slice(0, 16)
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
}

function hexToBytes (hex) {
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16)
  }
  return bytes
}

// ignore eslint unused-vars for the following two functions
/* eslint-disable no-unused-vars */
async function encryptText (plainText, keyText, ivText) {
  const keyTextPadded = await createHash(keyText)
  const ivTextPadded = await createHash(ivText)

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(keyTextPadded),
    { name: 'AES-CBC' },
    false,
    ['encrypt']
  )
  const iv = hexToBytes(ivTextPadded)

  const encoder = new TextEncoder()
  const data = encoder.encode(plainText)

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    data
  )
  return bufferToHex(encrypted)
}

async function decryptText (cipherTextBase64, keyText, ivText) {
  const keyTextPadded = await createHash(keyText)
  const ivTextPadded = await createHash(ivText)

  const key = await crypto.subtle.importKey(
    'raw',
    hexToBytes(keyTextPadded),
    { name: 'AES-CBC' },
    false,
    ['decrypt']
  )
  const iv = hexToBytes(ivTextPadded)

  const encrypted = await hexToBuffer(cipherTextBase64)

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv },
    key,
    encrypted
  )
  const decoder = new TextDecoder()
  return decoder.decode(decrypted)
}
