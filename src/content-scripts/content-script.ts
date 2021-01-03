import Runtime from '../lib/chrome/Runtime'
import Logger from '../loggers/Logger'
import ChatHandler from './ChatHandler'
import PageEventer from './PageEventer'

const manifest = Runtime.getManifest()
Logger.info(manifest.name + ` ver ` + manifest.version)

const init = async () => {
  const handler = new ChatHandler()
  const eventer = new PageEventer(handler)
  await eventer.init()
}
init()
