// Packages
import electron from 'electron'
import { Component } from 'react'
import ms from 'ms'

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

  listenThemeChange() {
    if (!this.ipcRenderer) {
      return
    }

    this.ipcRenderer.on('theme-changed', this.onThemeChanged)
  }

  clearScroll = () => {
    if (!this.scrollingSection) {
      return
    }

    this.scrollingSection.scrollTop = 0
  }

  lineStates = ['online', 'offline']

  showWindow = () => {
    this.setOnlineState()

    // Ensure that scrolling position only gets
    // resetted if the window was closed for 5 seconds
    clearTimeout(this.scrollTimer)
  }

  hideWindow = () => {
    this.setOnlineState()

    // Clear scrolling position if window closed for 5 seconds
    this.scrollTimer = setTimeout(this.clearScroll, ms('5s'))
  }

  onThemeChanged = (event, config) => {
    const { darkMode } = config

    this.setState({ darkMode })
  }

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
      scope: 'trello',
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

  componentWillUnmount() {
    for (const state of this.lineStates) {
      window.removeEventListener(state, this.setOnlineState)
    }

    this.ipcRenderer.removeListener('theme-changed', this.onThemeChanged)
  }

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
      scope: config.currentTeam ? config.currentTeam : 'trello'
    })
  }

  setScope = (/* scope */) => {
    console.log('setScope')
  }

  setTeams = async (/* teams, firstLoad */) => {
    console.log('setTeam')
  }

  render() {
    const activeScope = this.state.scope

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
