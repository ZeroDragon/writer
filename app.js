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
    soundOn: false
  },
  preload: async (instance) => {
    async function loadSound(url) {
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
    },
    allSounds = [...sounds.keys, ...sounds.special]
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
  },
  methods: {
    newDraft: () => {
      app.data.content = ''
      app.data.wordCount = 0
      app.methods.closeModal()
      app.updateDom()
    },
    '{{sfx}}': () => {
      app.data.soundOn = !app.data.soundOn
      app.data.sfx = app.data.soundOn ? 'brand_awareness' : 'no_sound'
      app.updateDom(['soundOn', '{{sfx}}'])
      if (app.data.soundOn) {
        const sound = app.soundName({ key: 'Load' })
      }
    },
    closeModal: () => {
      app.data.modal.visible = false
      app.updateDom()
    },
    fullscreen: () => {
      if (!document.fullscreenElement)
        return document.documentElement.requestFullscreen()
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
        message: [
          '<ul>',
          '<li><strong>Alt + N</strong>: New Draft</li>',
          '<li><strong>Alt + S</strong>: Save Draft</li>',
          '<li><strong>Alt + 0</strong>: Regular text</li>',
          '<li><strong>Alt + 1</strong>: Heading 1</li>',
          '<li><strong>Alt + 2</strong>: Heading 2</li>',
          '<li><strong>Alt + 3</strong>: Align Left</li>',
          '<li><strong>Alt + 4</strong>: Align Center</li>',
          '<li><strong>Alt + 5</strong>: Align Right</li>',
          '<li><strong>Alt + 6</strong>: Justify</li>',
          '<li><br/>Also any regular text editing shortcuts like<br/><strong>Ctrl + B</strong> for bold, <strong>Ctrl + I</strong> for italics, etc.</li>',
          '</ul>',
        ].join(''),
        buttons: {
          primary: { text: 'Close', action: 'closeModal' }
        }
      }
      app.bindEvents()
      app.updateDom()
    },
    createSound: (e) => {
      // use a sound from soundsMap based on key pressed
      app.data.soundOn ? app.soundName(e) : null
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
      if (e.altKey) {
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
        if ([1, 2, 3].includes(~~e.key)) {
          // wrap in h1 to h2 and regular div
          let newTag = ['DIV', 'H1', 'H2'][e.key]
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
        //set cursor to end of div
        setCursor(div, 1)
      }
      app.data.content = e.target.innerHTML
      app.data.wordCount = app.data.content.split(/\s+/).filter(word => word.length > 0).length
      app.updateDom(['wordCount'])
    }
  }
})
