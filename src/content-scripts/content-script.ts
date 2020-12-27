import ChatHandler from './ChatHandler'
import PageEventer from './PageEventer'

console.log('Hello from the content script', new Date())

const init = async () => {
  const handler = new ChatHandler()
  const eventer = new PageEventer(handler)
  await eventer.init()
}
init()
