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
