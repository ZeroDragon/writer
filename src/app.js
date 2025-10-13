class App {
  constructor(element, options = {}) {
    this.element = document.getElementById(element)
    this.methods = options.methods || {}
    this.bindEvents()
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
}

const setCursor = (element, position) => {
  const newRange = document.createRange()
  const sel = window.getSelection()
}

const app = new App('app', {
  methods: {
    fullscreen: () => {
      if (!document.fullscreenElement)
        return document.documentElement.requestFullscreen()
      document.exitFullscreen()
    },
    draft: () => {
      console.log('draft')
    },
    save: () => {
      console.log('save')
    },
    updateContent: (e) => {
      // catch control shift 1 to 3 for h1 to h3
      if (e.ctrlKey && e.altKey) {
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
        // wrap in h1 to h2 and regular div
        let newTag = null
        if (e.key === '1') newTag = 'H1'
        else if (e.key === '2') newTag = 'H2'
        else if (e.key === '3') newTag = 'DIV'
        if (newTag) {
          const newElement = document.createElement(newTag)
          newElement.textContent = currentNode.textContent
          currentNode.parentNode.replaceChild(newElement, currentNode)
          // set cursor to saved position
          newRange.setStart(newElement, Math.min(cursorPosition, newElement.firstChild.length))
          newRange.collapse(true)
          sel.removeAllRanges()
          sel.addRange(newRange)
        }
      }
      // if firstchild is plain text node, wrap it in a div
      if (e.target.firstChild && e.target.firstChild.nodeType === Node.TEXT_NODE) {
        const div = document.createElement('div')
        div.textContent = e.target.firstChild.textContent
        e.target.replaceChild(div, e.target.firstChild)
        //set cursor to end of div
        const range = document.createRange()
        const sel = window.getSelection()
        range.setStart(div, 1)
        range.collapse(true)
        sel.removeAllRanges()
        sel.addRange(range)
      }
    }
  }
})
