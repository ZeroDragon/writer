/* global NodeFilter */
class Zero { // eslint-disable-line no-unused-vars
  constructor (element, options = {}) {
    this.element = document.getElementById(element)
    this.methods = options.methods || {}
    this.data = options.data || {}
    this.getInvolvedElements()
    this.setTrackedDisplayItems()
    this.bindEvents()
    this.updateDom()
    if (options.preload) options.preload(this)
  }

  getInvolvedElements () {
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

  bindEvents () {
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
          for (const evt in el._listeners) {
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

  getValue (key) {
    if (key.includes('.')) {
      const keys = key.split('.')
      let value = this.data
      for (const k of keys) {
        value = value?.[k]
      }
      return value
    }
    return this.data[key]
  }

  setTrackedDisplayItems () {
    // look for all elements inside this.element that include text like {{key}}
    // and replace it with the value of this.data[key]
    this.trackedDisplays = {}
    const textNodes = []
    const walk = document.createTreeWalker(this.element, NodeFilter.SHOW_ELEMENT)
    let node
    while (walk.nextNode()) {
      node = walk.currentNode
      textNodes.push(node)
    }
    // while (node = walk.nextNode()) textNodes.push(node)
    textNodes.forEach(node => {
      // regex to match {{ key }} with optional spaces and optional bang at start
      const regex = /{{\s*(!?)([\w.]+)\s*}}/g
      const match = regex.exec(node.textContent)
      if (match) {
        const key = match[2]
        node.isWildcard = !!match[1]
        this.trackedDisplays[key] = node
      }
    })
  }

  updateDom (updateOnly = []) {
    // update all tracked display items
    Object.entries(this.trackedDisplays).forEach(([key, textNode]) => {
      const value = this.getValue(key)
      if (value !== undefined) {
        if (textNode.isWildcard) {
          if (typeof value !== 'string') {
            textNode.innerHTML = ''
            textNode.appendChild(value)
          } else {
            textNode.innerHTML = value
          }
          return
        }
        textNode.textContent = value
      }
    })
    this.reactiveElements.forEach(el => {
      const model = el.getAttribute('z-model')
      let show = el.getAttribute('z-if')
      const klass = el.getAttribute('z-class')
      if (show) {
        // check if show has bang at start
        const isNegated = show.startsWith('!')
        if (isNegated) show = show.slice(1)
        // if data[show] is truthy, display the element, else hide it
        const value = this.getValue(show)
        el.style.display = isNegated ? !value ? '' : 'none' : value ? '' : 'none'
      }
      if (model && this.data[model] !== undefined) {
        if (updateOnly.length && !updateOnly.includes(model)) return
        // if el is not an input, textarea or select, set innerHTML
        if (!['INPUT', 'TEXTAREA', 'SELECT'].includes(el.tagName)) {
          el.innerHTML = this.data[model]
          return
        }
        el.value = this.data[model]
      }
      if (klass) {
        const regex = /{{\s*(!?)([\w.]+)\s*}}/g
        const classes = klass
          .split(' ')
          .map(c => c.trim())
          .map(c => {
            const [,, key] = regex.exec(c) || []
            return key ? this.getValue(key) : c
          })
        el.className = classes.join(' ')
      }
    })
  }
}
