/* global FileReader, indexedDB */
// eslint-disable-next-line
class File {
  constructor (app) {
    this.app = app
    this.getFileHandle()
  }

  guardFileHandle () {
    if (!this.fileHandle) {
      window.alert('No file is currently opened.')
      return false
    }
    return true
  }

  apiGuard () {
    if (!window.showOpenFilePicker || !window.showSaveFilePicker) {
      return false
    }
    return true
  }

  async setFileHandle (fileHandle) {
    this.fileHandle = fileHandle
    const request = indexedDB.open('WriterDB', 1)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('fileHandles')) {
        db.createObjectStore('fileHandles')
      }
    }
    request.onsuccess = () => {
      const db = request.result
      const transaction = db.transaction(['fileHandles'], 'readwrite')
      const store = transaction.objectStore('fileHandles')
      const putRequest = store.put(fileHandle, 'myFileHandle')
      putRequest.onerror = (event) => {
        console.error('Error storing file handle:', event.target.error)
      }
    }
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error)
    }
  }

  async getFileHandle () {
    // get file handle from IndexedDB
    const request = indexedDB.open('WriterDB', 1)
    request.onsuccess = async () => {
      const db = request.result
      if (!db.objectStoreNames.contains('fileHandles')) {
        this.fileHandle = null
        return
      }
      const transaction = db.transaction(['fileHandles'], 'readonly')
      const store = transaction.objectStore('fileHandles')
      const getRequest = store.get('myFileHandle')
      getRequest.onsuccess = () => {
        this.fileHandle = getRequest.result || null
      }
    }
  }

  async open (override) {
    if (!this.apiGuard()) return this.openLegacy()
    if (!override) {
      const [fileHandle] = await window.showOpenFilePicker()
      this.setFileHandle(fileHandle)
    }
    if (!this.guardFileHandle()) return
    const file = await this.fileHandle.getFile()
    this.updateApp(await file.text())
  }

  openLegacy () {
    const input = document.createElement('input')
    input.type = 'file'
    const isiOS = /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
    if (isiOS) {
      input.accept = 'text/*,.wtr,application/octet-stream'
    } else {
      input.accept = '.txt,.wtr,text/plain'
    }
    input.onchange = e => {
      const file = e.target.files[0]
      if (!file) return
      const reader = new FileReader()
      reader.onload = event => {
        this.updateApp(event.target.result)
      }
      reader.readAsText(file)
    }
    input.click()
  }

  async openDragged (e) {
    if (!this.apiGuard()) return this.openLegacyDragged(e)
    const file = e.dataTransfer.items[0]
    if (!file) return
    await this.setFileHandle(await file.getAsFileSystemHandle())
    this.open(true)
  }

  openLegacyDragged (e) {
    const file = e.dataTransfer.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = event => {
      this.updateApp(event.target.result)
    }
    reader.readAsText(file)
  }

  updateApp (content) {
    this.app.data.content = content
    this.app.methods.setContentFont()
    this.app.data.wordCount = this.app.methods.countWords(this.app.data.content)
    this.app.methods.saveWriterData()
    this.app.updateDom()
  }

  async write () {
    const encryptedText = await this.app.methods.encryptText()
    if (!this.apiGuard()) return this.writeLegacy(encryptedText)
    if (!this.fileHandle) return this.saveAs(encryptedText)
    this.app.data.savingStatus = 'saving'
    this.app.updateDom(['savingStatus'])
    const writable = await this.fileHandle.createWritable()
    await writable.write(encryptedText)
    await writable.close()
    setTimeout(() => {
      this.app.data.savingStatus = ''
      this.app.updateDom(['savingStatus'])
    }, 500)
  }

  async writeLegacy (encryptedText) {
    const blob = new Blob([encryptedText], { type: 'application/octet-stream' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'draft.wtr'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  async saveAs (contents) {
    const fileHandle = await window.showSaveFilePicker({
      suggestedName: 'My Draft.wtr',
      types: [{
        description: 'Writeros Draft',
        accept: {
          'text/octet-stream': ['.wtr']
        }
      }]
    })
    this.setFileHandle(fileHandle)
    await this.write(contents)
  }

  close () {
    this.fileHandle = null
    const request = indexedDB.open('WriterDB', 1)
    request.onsuccess = () => {
      const db = request.result
      if (!db.objectStoreNames.contains('fileHandles')) {
        return
      }
      const transaction = db.transaction(['fileHandles'], 'readwrite')
      const store = transaction.objectStore('fileHandles')
      const deleteRequest = store.delete('myFileHandle')
      deleteRequest.onerror = (event) => {
        console.error('Error deleting file handle:', event.target.error)
      }
    }
    request.onerror = (event) => {
      console.error('Error opening IndexedDB:', event.target.error)
    }
  }
}
