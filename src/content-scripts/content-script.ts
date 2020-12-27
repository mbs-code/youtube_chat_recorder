import PageHelper from '../lib/util/PageHelper'

console.log('Hello from the content script', new Date())

const init = async () => {
  // URL から videoID を取得
  const videoId = PageHelper.getPageVideoId()
  console.log('videoID:', videoId)

  const videoData = await PageHelper.getVideoData()
  console.log(videoData)

  
}

window.addEventListener('yt-page-data-updated', async () => {
  console.log('> yt-page-data-updated')
  await init()
})
