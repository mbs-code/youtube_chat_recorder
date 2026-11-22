/** ytInitialPlayerResponse の必要な部分だけ (2026-11 時点の実データを元に縮小). */

export const LIVE_PLAYER_RESPONSE = {
  videoDetails: {
    videoId: '_X07ULFy1-w',
    title: '【朝活】よしよし＆背中を押す配信！',
    lengthSeconds: '0',
    isLive: true,
    channelId: 'UCqJQfY9916fdpDrKFqdYy2g',
    thumbnail: {
      thumbnails: [
        { url: 'https://i.ytimg.com/vi/_X07ULFy1-w/hqdefault.jpg?sqp=a', width: 168, height: 94 },
        { url: 'https://i.ytimg.com/vi/_X07ULFy1-w/maxresdefault.jpg?v=1', width: 1920, height: 1080 },
      ],
    },
    viewCount: '364',
    author: 'Anime ch. 佐藤あにめ',
    isLiveContent: true,
  },
  microformat: {
    playerMicroformatRenderer: {
      thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/_X07ULFy1-w/maxresdefault.jpg', width: 1280, height: 720 }] },
      title: { simpleText: '【朝活】よしよし＆背中を押す配信！' },
      publishDate: '2026-11-21T15:24:48-08:00',
      ownerChannelName: 'Anime ch. 佐藤あにめ',
      liveBroadcastDetails: { isLiveNow: true, startTimestamp: '2026-11-21T23:33:15+00:00' },
      uploadDate: '2026-11-21T15:24:48-08:00',
    },
  },
}

export const ARCHIVE_PLAYER_RESPONSE = {
  videoDetails: {
    videoId: '8Z6Fl9GlPog',
    title: '【チラ見せ枠】ホロライブわちゃわちゃ学園祭！DAY2',
    lengthSeconds: '4290',
    viewCount: '260950',
    author: 'hololive ホロライブ - VTuber Group',
    isLiveContent: true,
    thumbnail: { thumbnails: [{ url: 'https://i.ytimg.com/vi/8Z6Fl9GlPog/maxresdefault.jpg', width: 1920, height: 1080 }] },
  },
  microformat: {
    playerMicroformatRenderer: {
      publishDate: '2026-11-16T03:00:42-08:00',
      liveBroadcastDetails: { isLiveNow: false, startTimestamp: '2026-11-16T09:51:55+00:00', endTimestamp: '2026-11-16T11:03:08+00:00' },
    },
  },
}

export const VIDEO_PLAYER_RESPONSE = {
  videoDetails: {
    videoId: 'dQw4w9WgXcQ',
    title: 'Normal video',
    lengthSeconds: '213',
    viewCount: '100',
    author: 'someone',
    isLiveContent: false,
    thumbnail: { thumbnails: [] },
  },
  microformat: { playerMicroformatRenderer: { publishDate: '2009-10-24T23:57:33-07:00' } },
}
