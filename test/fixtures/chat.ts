/**
 * YouTube ライブチャットの DOM から、パースに関係する部分だけを残したもの.
 *
 * - TEXT_MESSAGE_*: 2026-11 時点の実際の DOM を縮小したもの.
 * - MEMBERSHIP_MILESTONE / MEMBERSHIP_JOIN / GIFT_PURCHASE / TEXT_MESSAGE_TOPCHAT: 2026-11 時点の実際の DOM を縮小したもの.
 * - PAID_MESSAGE / MEMBERSHIP_ITEM: 既知の構造から再現したもの (実 DOM との突き合わせは未確認).
 *
 * YouTube の DOM が変わったら `npm run e2e` で確認し、ここも更新すること.
 */

export const TEXT_MESSAGE_MEMBER = `
<yt-live-chat-text-message-renderer class="style-scope yt-live-chat-item-list-renderer" id="ChwKGkNPZkg4T0d0bXBnREZlN001d01kQks4RG1B" author-type="member">
  <yt-img-shadow id="author-photo" height="24" width="24">
    <img id="img" alt="" height="24" width="24" src="https://yt4.ggpht.com/photo=s32-c-k-c0x00ffffff-no-rj">
  </yt-img-shadow>
  <div id="content">
    <span id="timestamp">9:50\u202fAM</span>
    <yt-live-chat-author-chip>
      <span id="prepend-chat-badges"></span>
      <span id="author-name" dir="auto" class="member">@Azulあずる<span id="chip-badges"></span></span>
      <span id="chat-badges">
        <yt-live-chat-author-badge-renderer aria-label="メンバー（1 年）" type="member" shared-tooltip-text="メンバー（1 年）">
          <div id="image"><img src="https://yt3.ggpht.com/badge=s16-c-k" alt="メンバー（1 年）"></div>
        </yt-live-chat-author-badge-renderer>
      </span>
    </yt-live-chat-author-chip>
    <span id="message-container">
      <span id="message-prefix-icon-container"></span>
      <span id="message" dir="auto">片手で握りつぶされそう<img class="emoji" src="https://yt3.ggpht.com/emoji" alt=":animeWaiting:" shared-tooltip-text=":animeWaiting:"><img class="emoji" src="https://www.youtube.com/s/gaming/emoji/1f602.svg" alt="😂">w <a href="https://example.com">link</a></span>
    </span>
  </div>
  <div id="menu"></div>
</yt-live-chat-text-message-renderer>
`

export const TEXT_MESSAGE_OWNER = `
<yt-live-chat-text-message-renderer id="ChwKGkNPd25lcg" author-type="owner">
  <yt-img-shadow id="author-photo"><img id="img" src="https://yt4.ggpht.com/owner"></yt-img-shadow>
  <div id="content">
    <span id="timestamp">-8:47</span>
    <yt-live-chat-author-chip>
      <span id="author-name" class="owner">@hololive<span id="chip-badges">
        <yt-live-chat-author-badge-renderer aria-label="確認済み" type="verified"></yt-live-chat-author-badge-renderer>
      </span></span>
      <span id="chat-badges"></span>
    </yt-live-chat-author-chip>
    <span id="message-container"><span id="message" dir="auto">全編をご覧になりたい方は下記より</span></span>
  </div>
</yt-live-chat-text-message-renderer>
`

export const PAID_MESSAGE = `
<yt-live-chat-paid-message-renderer id="ChwKGlBhaWQ">
  <div id="card">
    <div id="header">
      <yt-img-shadow id="author-photo"><img id="img" src="https://yt4.ggpht.com/paid"></yt-img-shadow>
      <div id="header-content">
        <div id="single-line">
          <yt-live-chat-author-chip><span id="author-name">@superfan</span><span id="chat-badges"></span></yt-live-chat-author-chip>
          <div id="purchase-amount-column"><div id="purchase-amount">￥10,000</div></div>
        </div>
      </div>
      <span id="timestamp">10:01\u202fPM</span>
    </div>
    <div id="content"><div id="message" dir="auto">おめでとう！</div></div>
  </div>
</yt-live-chat-paid-message-renderer>
`

export const MEMBERSHIP_ITEM = `
<yt-live-chat-membership-item-renderer id="ChwKGk1lbWJlcg" show-only-header="">
  <div id="card">
    <div id="header">
      <yt-img-shadow id="author-photo"><img id="img" src="https://yt4.ggpht.com/member"></yt-img-shadow>
      <div id="header-content">
        <div id="header-content-primary-column">
          <div id="header-content-inner-column">
            <yt-live-chat-author-chip><span id="author-name" class="member">@Dawn_Raider</span>
              <span id="chat-badges"><yt-live-chat-author-badge-renderer aria-label="新規メンバー" type="member"></yt-live-chat-author-badge-renderer></span>
            </yt-live-chat-author-chip>
          </div>
          <div id="header-subtext">ホロライブ応援デラックス へようこそ！</div>
        </div>
        <div id="timestamp">-1:14:32</div>
      </div>
    </div>
  </div>
</yt-live-chat-membership-item-renderer>
`

/** メンバー歴 (マイルストーン) チャット. 2026-11 時点の実際の DOM を縮小したもの. */
export const MEMBERSHIP_MILESTONE = `
<yt-live-chat-membership-item-renderer class="style-scope yt-live-chat-item-list-renderer" modern="" id="Ci8KLUNOMnl3NS1CNXBjREZScklsQWtkY2hvamNnLUxveU1lc0lELTM1OTA2MjE1Mg%3D%3D" has-primary-header-text="">
  <div id="card">
    <div id="header">
      <yt-img-shadow id="author-photo" height="40" width="40"><img id="img" alt="" height="40" width="40" src="https://yt4.ggpht.com/milestone=s32-c-k-c0x00ffffff-no-rj"></yt-img-shadow>
      <div id="header-content">
        <div id="header-content-primary-column">
          <div id="header-content-inner-column">
            <yt-live-chat-author-chip>
              <span id="prepend-chat-badges"></span>
              <span id="author-name" dir="auto" class="member">@一文字紅牙<span id="chip-badges"></span></span>
              <span id="chat-badges">
                <yt-live-chat-author-badge-renderer aria-label="メンバー（6 か月）" type="member" shared-tooltip-text="メンバー（6 か月）">
                  <div id="image"><img src="https://yt3.ggpht.com/badge=s16-c-k" alt="メンバー（6 か月）"></div>
                </yt-live-chat-author-badge-renderer>
              </span>
            </yt-live-chat-author-chip>
            <div id="header-primary-text">メンバー歴 11 か月</div>
          </div>
          <div id="header-subtext">白銀愛好会</div>
        </div>
        <div id="timestamp">10:26 AM</div>
      </div>
      <div id="menu"></div>
    </div>
    <div id="content">
      <div id="message" dir="auto">「この世の全て⇒世界平和」ですね、分かります。</div>
      <div id="input-container"></div>
      <yt-formatted-string id="deleted-state" is-empty=""></yt-formatted-string>
    </div>
  </div>
</yt-live-chat-membership-item-renderer>
`

/** トップチャット (👑#1 の順位ボタン付き). 2026-11 時点の実際の DOM を縮小したもの. */
export const TEXT_MESSAGE_TOPCHAT = `
<yt-live-chat-text-message-renderer class="style-scope yt-live-chat-item-list-renderer" id="ChwKGlRvcENoYXQ" author-type="member">
  <yt-img-shadow id="author-photo"><img id="img" src="https://yt4.ggpht.com/topchat"></yt-img-shadow>
  <div id="content">
    <span id="timestamp">10:49 AM</span>
    <yt-live-chat-author-chip>
      <span id="prepend-chat-badges"></span>
      <span id="author-name" dir="auto" class="member">@ひろスペh1122<span id="chip-badges"></span></span>
      <span id="chat-badges">
        <yt-live-chat-author-badge-renderer aria-label="メンバー（2 か月）" type="member" shared-tooltip-text="メンバー（2 か月）">
          <div id="image"><img src="https://yt3.ggpht.com/badge=s16-c-k" alt="メンバー（2 か月）"></div>
        </yt-live-chat-author-badge-renderer>
      </span>
    </yt-live-chat-author-chip>&ZeroWidthSpace;<div id="before-content-buttons">
      <yt-button-view-model><button-view-model class="ytSpecButtonViewModelHost">
        <button class="ytSpecButtonShapeNextHost" title="" aria-label="#1" aria-disabled="false">
          <div aria-hidden="true" class="ytSpecButtonShapeNextIcon"><svg viewBox="0 0 24 24"><path d="M12 2"></path></svg></div>
          <div class="ytSpecButtonShapeNextButtonTextContent">#1</div>
        </button>
      </button-view-model></yt-button-view-model>
    </div>&ZeroWidthSpace;<span id="message-container">
      <span id="message-prefix-icon-container"></span>
      <span id="message" dir="auto">たくさん徳を積みます</span>
    </span>
  </div>
</yt-live-chat-text-message-renderer>
`

export function createElement(html: string): HTMLElement {
  const template = document.createElement('template')
  template.innerHTML = html.trim()
  return template.content.firstElementChild as HTMLElement
}

/** メンバー加入. 2026-11 時点の実際の DOM を縮小したもの (#header-primary-text は空で存在する). */
export const MEMBERSHIP_JOIN = `
<yt-live-chat-membership-item-renderer class="style-scope yt-live-chat-item-list-renderer" modern="" show-only-header="" id="ChwKGkNMcWZ4dXpvbXBnREZZX0h3Z1FkMkJzSU93">
  <div id="card">
    <div id="header">
      <yt-img-shadow id="author-photo" height="40" width="40"><img id="img" alt="" height="40" width="40" src="https://yt4.ggpht.com/join=s32-c-k-c0x00ffffff-no-rj"></yt-img-shadow>
      <div id="header-content">
        <div id="header-content-primary-column">
          <div id="header-content-inner-column">
            <yt-live-chat-author-chip>
              <span id="prepend-chat-badges"></span>
              <span id="author-name" dir="auto" class="member">@藍染Aizen<span id="chip-badges"></span></span>
              <span id="chat-badges">
                <yt-live-chat-author-badge-renderer aria-label="新規メンバー" type="member" shared-tooltip-text="新規メンバー">
                  <div id="image"><img src="https://yt3.ggpht.com/badge=s16-c-k" alt="新規メンバー"></div>
                </yt-live-chat-author-badge-renderer>
              </span>
            </yt-live-chat-author-chip>
            <div id="header-primary-text"></div>
          </div>
          <div id="header-subtext">ろありー へようこそ！</div>
        </div>
        <div id="timestamp">2:14 PM</div>
      </div>
      <div id="menu"></div>
    </div>
    <div id="content">
      <div id="message" dir="auto"></div>
      <yt-formatted-string id="deleted-state" is-empty=""></yt-formatted-string>
    </div>
  </div>
</yt-live-chat-membership-item-renderer>
`

/** メンバーシップギフト (贈った側). 2026-11 時点の実際の DOM を縮小したもの. #timestamp は無い. */
export const GIFT_PURCHASE = `
<ytd-sponsorships-live-chat-gift-purchase-announcement-renderer class="style-scope yt-live-chat-item-list-renderer" modern="" id="ChwKGkNOeU5rLVRvbXBnREZTVVRyUVlkek5vN1l3">
  <ytd-sponsorships-live-chat-header-renderer modern="" whole-message-clickable="">
    <div id="header">
      <div id="content">
        <yt-img-shadow id="author-photo" height="40" width="40"><img id="img" alt="" height="40" width="40" src="https://yt4.ggpht.com/gift=s64-c-k-c0x00ffffff-no-rj"></yt-img-shadow>
        <div id="header-content">
          <div id="header-content-primary-column">
            <div id="header-content-inner-column">
              <yt-live-chat-author-chip single-line="">
                <span id="prepend-chat-badges"></span>
                <span id="author-name" dir="auto" class="member single-line">@SUGI3_san<span id="chip-badges"></span></span>
                <span id="chat-badges">
                  <yt-live-chat-author-badge-renderer aria-label="メンバー（1 年）" type="member" shared-tooltip-text="メンバー（1 年）">
                    <div id="image"><img src="https://yt3.ggpht.com/badge=s16-c-k" alt="メンバー（1 年）"></div>
                  </yt-live-chat-author-badge-renderer>
                </span>
              </yt-live-chat-author-chip>
              <div id="primary-text">Roa Ch. 海月雲ろあ のメンバーシップ ギフトを 10 個贈りました</div>
            </div>
            <div id="secondary-text"></div>
          </div>
          <div id="header-content-deleted-state" hidden=""><div id="deleted-primary-text"></div></div>
        </div>
      </div>
      <yt-img-shadow class="rhs-image" height="104" width="104"><img id="img" alt="" height="104" width="104" src="https://www.gstatic.com/youtube/img/sponsorships/sponsorships_gift_purchase_announcement_artwork.png"></yt-img-shadow>
      <div id="menu"></div>
    </div>
  </ytd-sponsorships-live-chat-header-renderer>
  <div id="opt-in-prompt" hidden=""></div>
</ytd-sponsorships-live-chat-gift-purchase-announcement-renderer>
`
