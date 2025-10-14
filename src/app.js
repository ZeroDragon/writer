class Zero {
  constructor(element, options = {}) {
    this.element = document.getElementById(element)
    this.methods = options.methods || {}
    this.data = options.data || {}
    this.getInvolvedElements()
    this.setTrackedDisplayItems()
    this.bindEvents()
    this.updateDom()
  }
  getInvolvedElements() {
    const allElements = [...this.element.querySelectorAll('*')]
    this.reactiveElements = allElements
      .filter(el => {
        return [...el.attributes].some(attr => attr.name.startsWith('z-'))
      })
    this.triggers = allElements
      .filter(el => {
        return [...el.attributes].some(attr => attr.name.startsWith('z:'))
      })
  }
  bindEvents() {
    this.triggers.forEach(el => {
      [...el.attributes].forEach(attr => {
        if (attr.name.startsWith('z:')) {
          const [, eventType] = attr.name.split(':')
          const methodName = attr.value
          const parsedMethod = this.getValue(methodName) || methodName
          if (!this.methods[parsedMethod]) return
          // delete event listener and add again
          // get all event listeners of this type on this element and remove them
          el._listeners = el._listeners || {}
          for (let evt in el._listeners) {
            if (evt === eventType) {
              el.removeEventListener(evt, el._listeners[evt])
            }
          }
          el._listeners[eventType] = this.methods[parsedMethod]
          el.addEventListener(eventType, this.methods[parsedMethod])
        }
      })
    })
  }
  getValue(key) {
    if (key.includes('.')) {
      const keys = key.split('.')
      let value = this.data
      for (let k of keys) {
        value = value?.[k]
      }
      return value
    }
    return this.data[key]
  }
  setTrackedDisplayItems() {
    // look for all elements inside this.element that include text like {{key}}
    // and replace it with the value of this.data[key]
    this.trackedDisplays = {}
    const textNodes = []
    const walk = document.createTreeWalker(this.element, NodeFilter.SHOW_TEXT, null, false)
    let node
    while (node = walk.nextNode()) textNodes.push(node)
    textNodes.forEach(textNode => {
      const regex = /{{\s*([\w.]+)\s*}}/g
      let match
      // let newText = textNode.nodeValue
      while (match = regex.exec(textNode.nodeValue)) {
        const key = match[1]
        this.trackedDisplays[key] = textNode
      }
    })
  }
  updateDom(updateOnly = []) {
    // update all tracked display items
    Object.entries(this.trackedDisplays).forEach(([key, textNode]) => {
      const value = this.getValue(key)
      if (value !== undefined) {
        textNode.nodeValue = value
      }
    })
    this.reactiveElements.forEach(el => {
      const model = el.getAttribute('z-model')
      const show = el.getAttribute('z-if')
      if (show) {
        // if data[show] is truthy, display the element, else hide it
        const value = this.getValue(show)
        el.style.display = value ? '' : 'none'
      }
      if (model && this.data[model] !== undefined) {
        if (updateOnly.length && !updateOnly.includes(model)) return
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
    wordCount: 0,
    content: ''
  },
  methods: {
    newDraft: () => {
      app.data.content = ''
      app.data.wordCount = 0
      app.methods.closeModal()
      app.updateDom()
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
      app.data.content = e.target.innerHTML
      app.data.wordCount = app.data.content.split(/\s+/).filter(word => word.length > 0).length
      app.updateDom(['wordCount'])
    }
  }
})
