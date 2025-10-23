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
const app = new Zero('app', {
  data: {
    wordCount: 0,
    content: '',
    sfx: 'music_off',
    soundOn: false,
    theme: 'dark_mode',
    themeName: 'dark',
    zenMode: 'self_improvement',
    zenOn: false,
    timerIsRunning: false,
    writeTimer: 0,
    wordGoal: '',
    lastWordCount: 0
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
    // get saved data from localStorage
    const savedData = window.localStorage.getItem('writerAppData')
    const { soundOn, themeName, zenOn } = JSON.parse(window.localStorage.getItem('writerAppSettings')) || {}
    if (themeName) instance.data.themeName = themeName
    if (soundOn !== undefined) instance.data.soundOn = soundOn
    if (zenOn !== undefined) instance.data.zenOn = zenOn
    if (savedData) instance.data.content = savedData
    app.data.sfx = instance.data.soundOn ? 'music_note' : 'music_off'
    app.data.theme = instance.data.themeName === 'dark' ? 'dark_mode' : 'light_mode'
    app.data.zenMode = instance.data.zenOn ? 'local_pizza' : 'self_improvement'
    // get words from html content
    instance.data.wordCount = instance.methods.countWords(app.data.content)
    const contentEl = document.getElementById('content')
    Array.from(contentEl.children).forEach(child => {
      child.classList.remove('dimmed')
    })
    app.updateDom()
  },
  methods: {
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
    newDraft: () => {
      app.data.content = ''
      app.data.wordCount = 0
      window.localStorage.setItem('writerAppData', app.data.content)
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
      app.updateDom(['soundOn', '{{sfx}}'])
      if (app.data.soundOn) app.soundName({ key: 'Load' })
      app.methods.saveSettings()
    },
    '{{zenMode}}': () => {
      app.data.zenOn = !app.data.zenOn
      app.data.zenMode = app.data.zenOn ? 'local_pizza' : 'self_improvement'
      app.updateDom(['zenOn', '{{zenMode}}'])
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
          app.data.wordCount = app.methods.countWords(app.data.content)
          window.localStorage.setItem('writerAppData', app.data.content)
          app.updateDom()
        }
        reader.readAsText(file)
      }
      input.click()
    },
    help_outlined: () => {
      app.data.modal = {
        visible: true,
        title: 'Keyboard Shortcuts',
        message: document.getElementById('helpData').innerHTML,
        buttons: {
          primary: { text: 'Close', action: 'closeModal' }
        }
      }
      app.bindEvents()
      app.updateDom()
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
    updateContent: (e) => {
      // catch alt + s for save
      if ((e.altKey) && e.key.toLowerCase() === 's') {
        return app.methods.save()
      }
      // catch alt + n for new draft (case-insensitive)
      if ((e.altKey) && e.key && e.key.toLowerCase() === 'n') {
        return app.methods.draft()
      }
      // catch alt 1 to 3 for h1 to h3
      if (e.altKey || e.ctrlKey) {
        // get current div
        const selection = window.getSelection()
        if (!selection.rangeCount) return
        const range = selection.getRangeAt(0)
        let currentNode = range.startContainer
        while (currentNode && currentNode !== e.target) {
          if (currentNode.nodeType === Node.ELEMENT_NODE && ['DIV', 'H1', 'H2'].includes(currentNode.tagName)) break
          currentNode = currentNode.parentNode
        }
        if (!currentNode || currentNode === e.target) return
        // save current cursor position
        const cursorPosition = range.startOffset
        let newElement = null
        if ([0, 1, 2].includes(~~e.key)) {
          // wrap in h1 to h2 and regular div
          const newTag = ['DIV', 'H1', 'H2'][e.key]
          if (!newTag) return
          newElement = document.createElement(newTag)
          newElement.textContent = currentNode.textContent
          currentNode.parentNode.replaceChild(newElement, currentNode)
          // set cursor to saved position
          setCursor(newElement?.firstChild || currentNode, cursorPosition)
        }
        if ([3, 4, 5, 6].includes(~~e.key)) {
          currentNode.classList.toggle('align-left', e.key === '3')
          currentNode.classList.toggle('align-center', e.key === '4')
          currentNode.classList.toggle('align-right', e.key === '5')
          currentNode.classList.toggle('align-justify', e.key === '6')
        }
        return
      }
      // if firstchild is plain text node, wrap it in a div
      if (e.target.firstChild && e.target.firstChild.nodeType === Node.TEXT_NODE) {
        const div = document.createElement('div')
        div.textContent = e.target.firstChild.textContent
        e.target.replaceChild(div, e.target.firstChild)
        // set cursor to end of div
        setCursor(div, 1)
      }
      app.data.content = e.target.innerHTML
      window.localStorage.setItem('writerAppData', app.data.content)
      app.data.wordCount = app.methods.countWords(app.data.content)
      if (app.data.wordCount !== app.data.lastWordCount) {
        if (app.data.wordGoal && app.data.wordCount === app.data.wordGoal - 1) {
          app.soundName({ key: 'alert1' })
        }
        app.data.lastWordCount = app.data.wordCount
      }
      app.updateDom(['wordCount'])
      app.methods.tryZenMode(e)
    },
    tryZenMode: (e) => {
      if (!app.data.zenOn) return
      const contentEl = document.getElementById('content')
      // get current innerDiv where the cursor is
      const selection = window.getSelection()
      if (!selection.rangeCount) return
      const range = selection.getRangeAt(0)
      let currentNode = range.startContainer
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
      // value must be in format [[D]D:][[M]M:][[S]S]
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
    tickTimeGoal: (e) => {
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
    lock: () => {
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
    encryptText: async () => {
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
      app.data.encryption = {
        key: encryptionKey.value,
        secret: encryptionSecret.value
      }
      if (decryptOnCloseModal) {
        app.data.content = await app.methods.decryptText()
        app.data.wordCount = app.methods.countWords(app.data.content)
        window.localStorage.setItem('writerAppData', app.data.content)
      }
      app.methods.closeModal()
      app.updateDom()
    }
  }
})
