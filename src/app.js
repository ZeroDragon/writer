/* global Zero Node FileReader, encryptText, decryptText */
const setCursor = (element, position) => {
  const newRange = document.createRange()
  const sel = window.getSelection()
  newRange.setStart(element, position)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)
}
const audioContext = new (window.AudioContext || window.webkitAudioContext)()
// get saved data from localStorage
const getLS = () => {
  const savedData = window.localStorage.getItem('writerAppData')
  const { soundOn, themeName, zenOn } = JSON.parse(window.localStorage.getItem('writerAppSettings')) || {}
  return { savedData, soundOn, themeName, zenOn }
}
const app = new Zero('app', {
  data: {
    wordCount: 0,
    content: getLS().savedData || 'Start writing...',
    sfx: 'music_off',
    soundOn: getLS().soundOn || false,
    soundStatus: 'SFX OFF',
    theme: 'dark_mode',
    themeName: getLS().themeName || 'dark',
    zenMode: 'self_improvement',
    zenOn: getLS().zenOn || false,
    zenStatus: 'Zen Mode OFF',
    lock: 'lock_open_right',
    lockdesc: 'Encryption OFF',
    isEncrypted: false,
    timerIsRunning: false,
    writeTimer: 0,
    wordGoal: '',
    lastWordCount: 0,
    fontSize: 1
  },
  preload: async (instance) => {
    async function loadSound (url) {
      const response = await fetch(url)
      const arrayBuffer = await response.arrayBuffer()
      const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
      return audioBuffer
    }
    // preload all mp3 from assets/sounds
    const keys = Array.from({ length: 9 }, (_, i) => `0${i + 1}`.slice(-2))
    const sounds = {
      keys: keys.map(num => `key-${num}`),
      special: [
        'backspace',
        'return',
        'return-2',
        'space-2',
        'space',
        'alert-long',
        'alert-short'
      ]
    }
    const allSounds = [...sounds.keys, ...sounds.special]
    instance.data.soundsMap = sounds
    instance.data.sounds = await Promise.all(allSounds.map(async sound => {
      const audio = await loadSound(`assets/${sound}.mp3`)
      return { name: sound, audio }
    }))
    instance.soundName = e => {
      const getSound = _ => {
        const specials = {
          ' ': 'space-2',
          Enter: 'return',
          Load: 'return-2',
          Backspace: 'backspace',
          alert1: 'alert-short',
          alert2: 'alert-long'
        }
        if (specials[e.key]) return specials[e.key]
        if (/^[a-zA-Z0-9]$/.test(e.key)) {
          const index = e.key.toLowerCase().charCodeAt(0) - 97
          if (index >= 0 && index < 26) {
            const soundIndex = index % instance.data.soundsMap.keys.length
            return instance.data.soundsMap.keys[soundIndex]
          }
          if (/^[0-9]$/.test(e.key)) {
            const num = parseInt(e.key, 10)
            const soundIndex = (num - 1) % instance.data.soundsMap.keys.length
            return instance.data.soundsMap.keys[soundIndex]
          }
        }
        return 'space'
      }
      if (getSound()) {
        const sound = instance.data.sounds.find(s => s.name === getSound())
        if (sound) {
          const source = audioContext.createBufferSource()
          source.buffer = sound.audio
          source.connect(audioContext.destination)
          source.start(0)
        }
      }
    }
    instance.timer = setInterval(() => {
      // dispatch a 'tick' event only for elements that has z:tick attribute
      instance.element.querySelectorAll('[z\\:tick]').forEach(el => {
        el.dispatchEvent(new CustomEvent('tick'))
      })
    }, 1000)
    instance.data.sfx = instance.data.soundOn ? 'music_note' : 'music_off'
    instance.data.theme = instance.data.themeName === 'dark' ? 'dark_mode' : 'light_mode'
    instance.data.zenMode = instance.data.zenOn ? 'local_pizza' : 'self_improvement'
    instance.data.soundStatus = instance.data.soundOn ? 'SFX ON' : 'SFX OFF'
    instance.data.zenStatus = instance.data.zenOn ? 'Zen Mode ON' : 'Zen Mode OFF'
    // get words from html content
    instance.data.wordCount = instance.methods.countWords(instance.data.content)
    const contentEl = document.getElementById('content')
    Array.from(contentEl.children).forEach(child => {
      child.classList.remove('dimmed')
    })
    instance.updateDom()
    instance.methods.setContentFont()
    if (instance.data.content.trim() !== 'Start writing...') return
    instance.methods.info()
  },
  methods: {
    setContentFont: () => {
      const contentEl = document.getElementById('content')
      app.data.isEncrypted = app.methods.textIsEncrypted()
      app.updateDom(['isEncrypted'])
      if (app.data.isEncrypted) {
        // add class encrypted to contentEl
        contentEl.classList.add('encrypted')
      } else {
        contentEl.classList.remove('encrypted')
      }
    },
    countWords: (rawHtml) => {
      const tmp = document.createElement('div')
      tmp.innerHTML = rawHtml
      const textContent = tmp.innerHTML
        .replace(/<[^>]+>/g, ' ')
        .replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim()
      return textContent.split(' ').filter(word => word.length > 0).length
    },
    saveSettings: () => {
      window.localStorage.setItem('writerAppSettings', JSON.stringify({
        soundOn: app.data.soundOn,
        themeName: app.data.themeName,
        zenOn: app.data.zenOn
      }))
    },
    newDraft: async () => {
      app.data.content = 'Start writing...'
      app.data.wordCount = 0
      await app.methods.saveWriterData()
      app.methods.closeModal()
      app.updateDom()
    },
    '{{theme}}': () => {
      if (app.data.themeName === 'dark') {
        app.data.theme = 'light_mode'
        app.data.themeName = 'light'
      } else {
        app.data.theme = 'dark_mode'
        app.data.themeName = 'dark'
      }
      app.methods.saveSettings()
      app.updateDom(['themeName'])
    },
    '{{sfx}}': () => {
      app.data.soundOn = !app.data.soundOn
      app.data.sfx = app.data.soundOn ? 'music_note' : 'music_off'
      app.data.soundStatus = app.data.soundOn ? 'SFX ON' : 'SFX OFF'
      app.updateDom(['soundOn', '{{sfx}}', 'soundStatus'])
      if (app.data.soundOn) app.soundName({ key: 'Load' })
      app.methods.saveSettings()
    },
    '{{zenMode}}': () => {
      app.data.zenOn = !app.data.zenOn
      app.data.zenMode = app.data.zenOn ? 'local_pizza' : 'self_improvement'
      app.data.zenStatus = app.data.zenOn ? 'Zen Mode ON' : 'Zen Mode OFF'
      app.updateDom(['zenOn', '{{zenMode}}', 'zenStatus'])
      if (!app.data.zenOn) {
        // remove dimmed class from all children
        const contentEl = document.getElementById('content')
        contentEl.classList.remove('dimmed')
        Array.from(contentEl.getElementsByClassName('focus')).forEach(child => {
          child.classList.remove('focus')
        })
      }
      app.methods.saveSettings()
    },
    closeModal: () => {
      app.data.modal.visible = false
      app.updateDom()
    },
    article: () => {
      app.data.modal = {
        visible: true,
        title: 'New Draft',
        message: 'Start a new draft? All changes will be lost.',
        buttons: {
          primary: { text: 'Cancel', action: 'closeModal' },
          warning: { text: 'New Draft', action: 'newDraft' }
        }
      }
      app.bindEvents()
      app.updateDom()
    },
    save: async () => {
      const encryptedText = await app.methods.encryptText()
      const blob = new Blob([encryptedText], { type: 'application/octet-stream' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'draft.wtr'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    upload_file: () => {
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
          app.data.content = event.target.result
          app.methods.setContentFont()
          app.data.wordCount = app.methods.countWords(app.data.content)
          app.methods.saveWriterData()
          app.updateDom()
        }
        reader.readAsText(file)
      }
      input.click()
    },
    info: () => {
      app.data.modal = {
        visible: true,
        title: 'About Writeros',
        message: document.getElementById('infoData').innerHTML,
        buttons: {
          secondary: { text: 'Close', action: 'closeModal' },
          primary: { text: 'Buy me a coffee', action: 'coffee' }
        }
      }
      app.bindEvents()
      app.updateDom()
    },
    coffee: () => {
      window.open('https://buymeacoffee.com/zerodragon', '_blank')
    },
    createSound: (e) => {
      // use a sound from soundsMap based on key pressed
      if (app.data.soundOn) {
        if (!app.data.lastKeyTime) app.data.lastKeyTime = 0
        if (app.data.lastKeyTime + 500 > new Date().getTime() && app.data.lastKey === e.key) return
        app.soundName(e)
        app.data.lastKeyTime = new Date().getTime()
        app.data.lastKey = e.key
      }
    },
    saveWriterData: async () => {
      window.localStorage.setItem('writerAppData', await app.methods.encryptText())
    },
    tryAutoSave: async () => {
      // throtle to save only if user stopped typing for 1 second
      if (app.data.saveTimeout) {
        clearTimeout(app.data.saveTimeout)
      }
      app.data.saveTimeout = setTimeout(async () => {
        await app.methods.saveWriterData()
        app.data.savingStatus = 'saving'
        app.updateDom(['savingStatus'])
        setTimeout(() => {
          app.data.savingStatus = ''
          app.updateDom(['savingStatus'])
        }, 500)
        delete app.data.saveTimeout
      }, 1000)
    },
    updateContent: (e) => {
      // if firstchild is plain text node, wrap it in a div
      if (e.target.firstChild && e.target.firstChild.nodeType === Node.TEXT_NODE) {
        const div = document.createElement('div')
        div.textContent = e.target.firstChild.textContent
        e.target.replaceChild(div, e.target.firstChild)
        // set cursor to end of div
        setCursor(div, 1)
      }
      app.data.content = e.target.innerHTML
      app.methods.tryAutoSave()
      app.data.wordCount = app.methods.countWords(app.data.content)
      if (app.data.wordCount !== app.data.lastWordCount) {
        if (app.data.wordGoal && app.data.wordCount === app.data.wordGoal - 1) {
          app.soundName({ key: 'alert1' })
        }
        app.data.lastWordCount = app.data.wordCount
      }
      app.data.writing = 'writing'
      app.updateDom(['wordCount', 'writing'])
      app.methods.tryZenMode(e)
    },
    getSelectionParent: (returnParent = false) => {
      let parentElement = null
      const selection = window.getSelection()
      if (selection.rangeCount > 0) {
        const range = selection.getRangeAt(0)
        parentElement = range.startContainer.parentElement
      }
      if (returnParent) return parentElement
      return (align) => {
        parentElement.style.textAlign = align
        setCursor(parentElement.firstChild, parentElement.firstChild.length)
        const contentEl = document.getElementById('content')
        app.data.content = contentEl.innerHTML
        app.methods.saveWriterData()
      }
    },
    format_align_left: () => {
      app.methods.getSelectionParent()('left')
    },
    format_align_center: () => {
      app.methods.getSelectionParent()('center')
    },
    format_align_right: () => {
      app.methods.getSelectionParent()('right')
    },
    format_align_justify: () => {
      app.methods.getSelectionParent()('justify')
    },
    format_text: (node) => {
      const parent = app.methods.getSelectionParent(true)
      const newElement = document.createElement(node)
      newElement.innerHTML = parent.innerHTML
      parent.replaceWith(newElement)
      setCursor(newElement.firstChild, newElement.firstChild.length)
      const contentEl = document.getElementById('content')
      app.data.content = contentEl.innerHTML
      app.methods.saveWriterData()
    },
    format_h1: () => {
      app.methods.format_text('h1')
    },
    format_h2: () => {
      app.methods.format_text('h2')
    },
    format_paragraph: () => {
      app.methods.format_text('div')
    },
    updateFontSize: () => {
      const contentEl = document.getElementById('content')
      contentEl.style.fontSize = `${app.data.fontSize}em`
    },
    zoom_in: () => {
      app.data.fontSize = Math.min(app.data.fontSize + 0.1, 3)
      app.methods.updateFontSize()
    },
    zoom_out: () => {
      app.data.fontSize = Math.max(app.data.fontSize - 0.1, 0.5)
      app.methods.updateFontSize()
    },
    search_check: () => {
      app.data.fontSize = 1
      app.methods.updateFontSize()
    },
    tryZenMode: (e) => {
      if (app.data.content.trim() === 'Start writing...') {
        app.data.content = ''
        app.updateDom(['wordCount', 'content'])
      }
      if (!app.data.zenOn) return
      const contentEl = document.getElementById('content')
      // get current innerDiv where the cursor is
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      const range = selection.getRangeAt(0)
      let currentNode = range.startContainer
      // sometimes the currentNode is a text node, so we need to traverse up to the parent div/h1/h2
      while (currentNode && !['DIV', 'H1', 'H2'].includes(currentNode.tagName)) {
        currentNode = currentNode.parentNode
      }
      while (currentNode && currentNode !== e.target) {
        if (currentNode.nodeType === Node.ELEMENT_NODE && ['DIV', 'H1', 'H2'].includes(currentNode.tagName)) break
        currentNode = currentNode.parentNode
      }
      if (!currentNode || currentNode === contentEl) return
      // dim all other elements inside e.target
      if (currentNode.innerText.trim() === '') return
      contentEl.classList.add('dimmed')
      currentNode.classList.add('skip')
      contentEl.querySelectorAll('.focus:not(.skip)').forEach(el => {
        el.classList.remove('focus')
      })
      if (!currentNode.classList.contains('focus')) {
        currentNode.classList.add('focus')
      }
      currentNode.classList.remove('skip')
    },
    transformTime: (seconds) => {
      let [hh, mm, ss] = [0, 0, 0]
      mm = Math.floor(seconds / 60)
      ss = seconds % 60
      if (mm >= 60) {
        hh = Math.floor(mm / 60)
        mm = mm % 60
      }
      return { hh, mm, ss }
    },
    incrementTimeLeft: _ => {
      app.data.writeTimer += 30
      app.data.timerIsRunning = true
      app.methods.updateTimeGoal()
    },
    updateTimeGoal: _ => {
      const { hh, mm, ss } = app.methods.transformTime(app.data.writeTimer)
      const formattedTime = [hh, mm, ss]
        .map(unit => `00${unit}`.slice(-2))
        .join(':')
      app.data.timeGoal = ''
      if (formattedTime !== '00:00:00') app.data.timeGoal = formattedTime
      app.updateDom(['timeGoal'])
    },
    startEditingTimeGoal: _ => {
      app.data.timerIsRunning = false
    },
    setTimeGoal: (e) => {
      app.data.timerIsRunning = true
      const value = e.target.value
      // value must be in format [[H]H:][[M]M:][[S]S]
      const regex = /^((\d{1,2}):)?((\d{1,2}):)?(\d{1,2})$/
      const match = regex.exec(value)
      if (!match) {
        app.data.writeTimer = 0
        app.data.timerIsRunning = false
        app.methods.updateTimeGoal()
        return
      }
      let [hh, mm, ss] = [0, 0, 0]
      const valueArr = value.split(':')
      if (valueArr.length === 3) {
        [hh, mm, ss] = valueArr.map(v => parseInt(v, 10) || 0)
      } else if (valueArr.length === 2) {
        [mm, ss] = valueArr.map(v => parseInt(v, 10) || 0)
      } else {
        ss = parseInt(value, 10) || 0
      }
      const totalSeconds = hh * 3600 + mm * 60 + ss
      app.data.writeTimer = totalSeconds
      app.methods.updateTimeGoal()
    },
    tickTimeGoal: _e => {
      if (app.data.timerIsRunning) {
        app.data.writeTimer -= 1
        app.methods.updateTimeGoal()
        app.data.writeTimer = Math.max(0, app.data.writeTimer)
        if (app.data.writeTimer === 5) {
          app.soundName({ key: 'alert2' })
        }
        if (app.data.writeTimer === 0) {
          app.data.timerIsRunning = false
          app.updateDom(['timerIsRunning'])
        }
      }
    },
    resetTimeGoal: _ => {
      app.data.writeTimer = 0
      app.data.timerIsRunning = false
      app.methods.updateTimeGoal()
      app.updateDom(['timerIsRunning'])
    },
    setWordGoal: (e) => {
      const value = e.target.value
      const num = parseInt(value, 10)
      if (isNaN(num) || num < 0) {
        app.data.wordGoal = ''
        e.target.value = ''
      } else {
        app.data.wordGoal = num
      }
    },
    '{{lock}}': () => {
      const encryptDiv = document.getElementById('encryptInputs').cloneNode(true)
      app.data.modal = {
        visible: true,
        title: 'Encryption',
        message: encryptDiv,
        buttons: {
          secondary: { text: 'Cancel', action: 'closeModal' },
          primary: { text: 'Set Encryption', action: 'setLock' }
        }
      }
      app.bindEvents()
      app.updateDom()
      const [encryptionKey, encryptionSecret] = ['encryptionKey', 'encryptionSecret']
        .map(name => app.data.modal.message.querySelector(`.modal-content input[name="${name}"]`))
      encryptionKey.value = app.data.encryption?.key || ''
      encryptionSecret.value = app.data.encryption?.secret || ''
    },
    textIsEncrypted: () => {
      const txt = app.data.content.replace(/<[^>]+>/g, '')
      return (/^[0-9a-fA-F]+$/.test(txt) && txt.length % 32 === 0)
    },
    encryptText: async () => {
      // clean app.data.content from any class attributes
      app.data.content = app.data.content.replace(/ class="[^"]*"/g, '')
      // is text is already encrypted, return as is (encrypted text is hex only one word)
      if (app.methods.textIsEncrypted()) return app.data.content
      if (!app.data.encryption?.key || !app.data.encryption?.secret) return app.data.content
      return encryptText(
        app.data.content,
        app.data.encryption.key,
        app.data.encryption.secret
      )
    },
    decryptText: () => {
      const txt = app.data.content.replace(/<[^>]+>/g, '')
      return decryptText(
        txt,
        app.data.encryption.key,
        app.data.encryption.secret
      )
    },
    setLock: async () => {
      const [encryptionKey, encryptionSecret] = ['encryptionKey', 'encryptionSecret']
        .map(name => app.data.modal.message.querySelector(`.modal-content input[name="${name}"]`))
      const decryptOnCloseModal = app.data.modal.message.querySelector('.modal-content input[name="decryptOnCloseModal"]').checked
      const errorEl = app.data.modal.message.querySelector('.modal-content .error-message')
      errorEl.style.display = 'none'
      app.data.encryption = {
        key: encryptionKey.value,
        secret: encryptionSecret.value
      }
      app.data.lock = 'lock'
      app.data.lockdesc = 'Encryption ON'
      if (!encryptionKey.value || !encryptionSecret.value) {
        app.data.lock = 'lock_open_right'
        app.data.lockdesc = 'Encryption OFF'
        await app.methods.saveWriterData()
      }
      if (decryptOnCloseModal) {
        let errorFound = false
        app.data.content = await app.methods.decryptText().catch(e => {
          errorFound = true
          return app.data.content
        })
        if (errorFound) {
          errorEl.style.display = 'block'
          return
        }
        app.methods.setContentFont()
        app.data.wordCount = app.methods.countWords(app.data.content)
      }
      await app.methods.saveWriterData()
      app.methods.closeModal()
      app.updateDom(['content', 'wordCount', '{{lock}}'])
    }
  }
})
document.addEventListener('keyup', (e) => {
  if (e.key === 'Escape' && app.data.modal?.visible) {
    app.methods.closeModal()
  }
})
// enable drag and drop file upload
document.addEventListener('dragover', (e) => {
  e.preventDefault()
  // apply only if dragging a file
  if (e.dataTransfer.items && e.dataTransfer.items[0].kind === 'file') {
    e.dataTransfer.dropEffect = 'copy'
  } else {
    e.dataTransfer.dropEffect = 'none'
    return
  }
  document.getElementById('dragOverlay').classList.add('active')
})
document.addEventListener('dragleave', (e) => {
  e.preventDefault()
  if (!e.relatedTarget || e.relatedTarget.nodeName === 'HTML') {
    document.getElementById('dragOverlay').classList.remove('active')
  }
})
document.addEventListener('drop', (e) => {
  e.preventDefault()
  const file = e.dataTransfer.files[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = event => {
    app.data.content = event.target.result
    app.data.wordCount = app.methods.countWords(app.data.content)
    app.methods.setContentFont()
    app.methods.saveWriterData()
    app.updateDom()
  }
  reader.readAsText(file)
  document.getElementById('dragOverlay').classList.remove('active')
})
document.addEventListener('mousemove', (e) => {
  if (!app.data.writing) return
  delete app.data.writing
  app.updateDom(['writing'])
})
