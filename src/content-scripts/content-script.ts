import { format as dateFormat } from 'date-fns'
import Runtime from '../lib/chrome/Runtime'
import ChatHandler from './ChatHandler'
import PageEventer from './PageEventer'

if (process.env.NODE_ENV === 'development') {
  const manifest = Runtime.getManifest()
  const date = dateFormat(new Date(), 'yyyy-MM-dd_HH:mm:ss')
  console.log(`[dev] ${manifest.name} ver: ${manifest.version}, build: ${date}`)
}

const init = async () => {
  const handler = new ChatHandler()
  const eventer = new PageEventer(handler)
  await eventer.init()
}
init()
