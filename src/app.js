/* global Zero Node */
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
    sfx: 'no_sound',
    theme: 'dark_mode',
    soundOn: false,
    themeName: 'dark',
    timerIsRunning: false,
    writeTimer: 0
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
        'space'
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
        if (e.key === ' ') return 'space-2'
        if (e.key === 'Enter') return 'return'
        if (e.key === 'Load') return 'return-2'
        if (e.key === 'Backspace') return 'backspace'
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
  },
  methods: {
    newDraft: () => {
      app.data.content = ''
      app.data.wordCount = 0
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
      app.updateDom(['themeName'])
    },
    '{{sfx}}': () => {
      app.data.soundOn = !app.data.soundOn
      app.data.sfx = app.data.soundOn ? 'brand_awareness' : 'no_sound'
      app.updateDom(['soundOn', '{{sfx}}'])
      if (app.data.soundOn) app.soundName({ key: 'Load' })
    },
    closeModal: () => {
      app.data.modal.visible = false
      app.updateDom()
    },
    fullscreen: () => {
      if (!document.fullscreenElement) return document.documentElement.requestFullscreen()
      document.exitFullscreen()
    },
    draft: () => {
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
    save: () => {
      const blob = new Blob([app.data.content], { type: 'text/html' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = 'draft.html'
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    },
    help: () => {
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
        if (app.data.lastKeyTime + 1000 > new Date().getTime() && app.data.lastKey === e.key) return
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
      app.data.wordCount = app.data.content.split(/\s+/).filter(word => word.length > 0).length
      app.updateDom(['wordCount'])
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
    }
  }
})
