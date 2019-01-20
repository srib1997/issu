// Packages
import electron from 'electron'
import { Component } from 'react'
// Import ms from 'ms'

// Components
import Switcher from '../components/feed/switcher'
import isDarkMode from '../utils/dark-mode'

// Styles
import { feedStyles, pageStyles } from '../styles/pages/feed'

class Feed extends Component {
  state = {
    events: {},
    scope: null,
    teams: [],
    online: typeof navigator === 'undefined' ? true : navigator.onLine,
    darkMode: false,
    hasLoaded: false
  }

  remote = electron.remote || false
  ipcRenderer = electron.ipcRenderer || false

  // 為 feed window 增加 listener
  // 當收到  信息的時侯，就執行 onThemeChanged
  // 依個 fn 係在 componentdidmount 裹執行
  listenThemeChange() {
    if (!this.ipcRenderer) {
      return
    }

    this.ipcRenderer.on('theme-changed', this.onThemeChanged)
  }

  // 將 scrollingSection 的捲軸捲到最頂頂
  // 在 hidewindow 時執行
  // clearScroll = () => {
  //   if (!this.scrollingSection) {
  //     return
  //   }

  //   this.scrollingSection.scrollTop = 0
  // }

  lineStates = ['online', 'offline']

  // ShowWindow 時執行 setOnlineState()
  showWindow = () => {
    this.setOnlineState()

    // Ensure that scrolling position only gets
    // resetted if the window was closed for 5 seconds
    // clearTimeout(this.scrollTimer)
  }

  // HidewWindow 時執行 setOnlineState()
  hideWindow = () => {
    this.setOnlineState()

    // Clear scrolling position if window closed for 5 seconds
    // this.scrollTimer = setTimeout(this.clearScroll, ms('5s'))
  }

  // ListenThemeChange 收到 theme-changed 信息的時侯，就執行 onThemeChanged
  // 它會由 index.js 會傳送 config boject 拿到 darkMode
  // 將 darkMode 寫入 state
  onThemeChanged = (event, config) => {
    const { darkMode } = config

    this.setState({ darkMode })
  }

  // 增加 set online state listener
  // set state: scope 做預設的 team.id, darkMode 檢查, hasloaded 變 true
  // 執行 listenThemeChange()
  // 增加 window 開同隱的是件
  async componentDidMount() {
    // Support SSR
    if (typeof window === 'undefined') {
      return
    }

    for (const state of this.lineStates) {
      window.addEventListener(state, this.setOnlineState)
    }

    if (!this.remote) {
      return
    }

    this.setState({
      scope: 'aaa',
      darkMode: isDarkMode(this.remote),
      hasLoaded: true
    })

    // Listen to system darkMode system change
    this.listenThemeChange()

    const currentWindow = this.remote.getCurrentWindow()

    currentWindow.on('show', this.showWindow)
    currentWindow.on('hide', this.hideWindow)

    window.addEventListener('beforeunload', () => {
      currentWindow.removeListener('show', this.showWindow)
      currentWindow.removeListener('hide', this.hideWindow)
    })
  }

  // 移除之前的所有事件
  componentWillUnmount() {
    for (const state of this.lineStates) {
      window.removeEventListener(state, this.setOnlineState)
    }

    this.ipcRenderer.removeListener('theme-changed', this.onThemeChanged)
  }

  // 檢查瀏覽器的上網狀態
  // 離線時: set oline state to false
  // 上線時: 係將 feed window 中的 state 裡的 online = true, scope = config 已存的目前的 team id 或預設的 team id
  // 這個 fn 何時執行: showWindow, hideWindow
  setOnlineState = async () => {
    const online = navigator.onLine

    if (online === this.state.online) {
      return
    }

    if (!online) {
      this.setState({ online })
      return
    }

    const { getConfig } = this.remote.require('./utils/config')

    let config = null

    try {
      config = await getConfig()
    } catch (error) {
      return
    }

    this.setState({
      online,
      scope: config.currentTeam ? config.currentTeam : 'aaa'
    })
  }

  // 何時執行: 由 <Switcher/> 去執行, 當點算不同的 team 時會執行, 睇自己個版還是其他 team 的版
  setScope = scope => {
    this.setState({ scope })
  }

  // 何時執行: 由於 feed 預設不會知道 teams 是什麼
  // 需要由 switcher 去執行並告訴 feed 有幾多個 teams
  setTeams = async (teams, firstLoad) => {
    if (!teams) {
      // If the teams didn't change, only the events
      // should be updated.
      // It's important that this is being `await`ed
      await this.updateEvents(firstLoad)
      return
    }

    this.setState({ teams })
  }

  render() {
    // 拿番個現在已點選的 team.id 比 Switcher
    const activeScope = this.state.scope

    // Componentdidmount 之後先會有野出
    if (!this.state.hasLoaded) {
      return null
    }

    return (
      <main>
        <div onDragEnter={this.showDropZone}>
          <Switcher
            // 問：this.setScope 是什麼? Switcher 用它來做什麼?
            // 答 setScope function 用來設定現在想睇那一個 scope (即想睇自己個版還是其他 team 的版面)
            // 由於 Switcher 會知道所有 team，在 Switcher 內選其中一個 team 時, 佢都要通知返 feed.js 佢選左邊一個 team
            // 所以 Switcher 藉由呢個 function 通知返 feed.js 用戶已經在 Switcher 裡面選左邊一個 team
            setFeedScope={this.setScope}
            // 問：this.setTeams 是什麼? Switcher 用它來做什麼?
            // 答 setTeams function 用來更新 teams events 用
            // 由於只有 Switcher component 裡面會 fetch 用戶有幾多個 team, 而 feed.js 係唔知有幾多 team 的
            // 所以 Switcher 透過 setTeams 比 feed.js 知道要更新邊幾個 teams 的 events
            setTeams={this.setTeams}
            // 問：this.state.currentUser 是什麼? Switcher 用它來做什麼?
            // watchConfig 知道有 login config 改變時，最最最後會發送 config-changed 事件比 feed.js
            // 所以 feed.js 是第一個知道有用戶登入/登出的, 所以 feed.js 可以最先知道登入用戶的資料 (從 config 載入)
            // 在這裡也比 Switcher 知道 feed.js 所知道的登入用戶資料
            // currentUser={this.state.currentUser}
            // 問：this.title 是什麼? Switcher 用它來做什麼?
            // 答 唔洗理
            // titleRef={this.title}
            // 問：this.state.online 是什麼? Switcher 用它來做什麼?
            // feed.js 透過瀏覽器的 navigator.onLine 推測現在有沒有連接上網
            // 也交比 Switcher 等佢知道有沒有上到網, 無上到網 Switcher 會彈句野話你知你無上網
            online={this.state.online}
            // 問：activeScope 是什麼? Switcher 用它來做什麼?
            // 由於 Switcher 知道晒有幾多 teams
            // 但當選了其中一個 team 時，佢會 call feed.js 的 this.setScope
            // 換句話說，只有 feed.js 知道而家選了邊一個 scope
            // 咁而家呢到咪要講返比 Switcher 知 feed.js 所知道的選了邊一個 team
            activeScope={activeScope}
            // 問：this.state.darkMode 是什麼? Switcher 用它來做什麼?
            // 呢個唔洗理
            darkBg={this.state.darkMode}
          />
        </div>

        <style jsx>{feedStyles}</style>
        <style jsx global>
          {pageStyles}
        </style>
      </main>
    )
  }
}

export default Feed
