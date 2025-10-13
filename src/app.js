class Zero {
  constructor(element, options = {}) {
    this.element = document.getElementById(element)
    this.methods = options.methods || {}
    this.data = options.data || {}
    this.reactiveElements = [...this.element.querySelectorAll('[z-model]')]
    this.bindEvents()
    this.updateDom()
  }
  bindEvents() {
    this.triggers = [...this.element.querySelectorAll('*')]
      .filter(el => {
        return [...el.attributes].some(attr => attr.name.startsWith('z:'))
      })
    this.triggers.forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.startsWith('z:')) {
          const [, eventType] = attr.name.split(':')
          const methodName = attr.value
          if (!this.methods[methodName]) return
          // only bind if is not already bound
          if (!el._eventListeners) el._eventListeners = {}
          if (!el._eventListeners[eventType]) el._eventListeners[eventType] = []
          if (!el._eventListeners[eventType].includes(this.methods[methodName])) {
            el.addEventListener(eventType, this.methods[methodName])
            el._eventListeners[eventType].push(this.methods[methodName])
          }
        }
      })
    })
  }
  updateDom() {
    this.reactiveElements.forEach(el => {
      const model = el.getAttribute('z-model')
      if (model && this.data[model] !== undefined) {
        // if el is not an input, textarea or select, set innerHTML
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName))
          return el.innerHTML = this.data[model]
        el.value = this.data[model]
      }
    })
  }
}

const setCursor = (element, position) => {
  const newRange = document.createRange()
  const sel = window.getSelection()
  newRange.setStart(element, position)
  newRange.collapse(true)
  sel.removeAllRanges()
  sel.addRange(newRange)
}

const app = new Zero('app', {
  data: {
    wordCount: 0
  },
  methods: {
    fullscreen: () => {
      if (!document.fullscreenElement)
        return document.documentElement.requestFullscreen()
      document.exitFullscreen()
    },
    draft: () => {
      app.data.content = ''
      app.updateDom()
    },
    save: () => {
      console.log('save')
    },
    updateContent: (e) => {
      // catch control shift 1 to 3 for h1 to h3
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
          let newTag = [, 'H1', 'H2', 'DIV'][e.key]
          if (!newTag) return
          newElement = document.createElement(newTag)
          newElement.textContent = currentNode.textContent
          currentNode.parentNode.replaceChild(newElement, currentNode)
          // set cursor to saved position
          setCursor(newElement?.firstChild || currentNode, cursorPosition)
        }
        if ([4, 5, 6, 7].includes(~~e.key)) {
          currentNode.classList.toggle('align-left', e.key === '4')
          currentNode.classList.toggle('align-center', e.key === '5')
          currentNode.classList.toggle('align-right', e.key === '6')
          currentNode.classList.toggle('align-justify', e.key === '7')
        }
      }
      // if firstchild is plain text node, wrap it in a div
      if (e.target.firstChild && e.target.firstChild.nodeType === Node.TEXT_NODE) {
        const div = document.createElement('div')
        div.textContent = e.target.firstChild.textContent
        e.target.replaceChild(div, e.target.firstChild)
        //set cursor to end of div
        setCursor(div, 1)
      }
    }
  }
})
