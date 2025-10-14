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
