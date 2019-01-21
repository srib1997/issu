/**
 * 主要
 * - feed 傳入的 props
 *   - setFeedScope: func, 執行 func 後會有什麼事情發生?
 *     - 通知返 feed.js , <Switcher/> 去執行, 當點算不同的 team 時會執行, 睇自己個版還是其他 team 的版
 *     1. clear scroll, 將捲軸推至最上
 *     2. 將 feed state.scope 設為 switcher 選中的 team id
 *     3. 執行 cacheEvents
 *   - setTeams: func
 *     1. 如果傳入第一個參數是 null 時, 就 updateEvent, 而 feed 不會更新 teams
 *     2. 若果傳入第一個參數是 teams array 時
 *        - feed.js 的 setState teams，再 updateEvent
 *   - activeScope: string
 *     1. feed.js 中現在選中 team 的 object
 *   - darkBg: bool
 *     1. feed 中 state.darkMode
 *   - online: bool
 *     1. feed 中 state.online
 *
 * - switcher state
 *   - teams: [],
 *     - state.teams 唯一在 loadTeams 中會被 set
 *     - 而 loadTeams 會用到 getTeams 入面的 object { teams }
 *       - 什麼時候 loadTeams 會被 call
 *       1. showWindow 時
 *       2. listTimer 時
 *       3. componentDidMount 時
 *       4. this.ipcRenderer.on('config-changed') 時
 *   - scope: null,
 *     - team.id
 *     - componentWillReceiveProps 時, scope 被 set 為預設第一個 team 的 id
 *     - changeScope 時, scope set 為 team.id
 *       - 什麼時候 changeScope 會被 call
 *       1. team avatar 按下時
 *       2. componentWillReceiveProps 帶有 activeScope 時
 *       3. resetScope 時
 *       4. checkCurrentTeam 時
 *   - updateFailed: false,
 *     - 按下 closeUpdateMessage 時，updateFailed: false
 *     - 接收到 update-failed 時，updateFailed: false
 *   - initialized: false,
 *     - componentDidUpdate 時，initialized: true
 *   - syncInterval: '5s',
 *     - showWindow 時 5sec
 *     - hideWindow 時 5min
 *   - queue: []
 *     - changeScope 時, 將 updateConfig 包裝成 queueFunction 然後存入 queue array
 *     - componentDidUpdate 時, 將 queue 入面每一個 queueFuction 攞出黎，並運行
 *
 * - switcher 主要的內容
 *   - showWindow
 *     1. 曾經 hide 過 window 後 再 show window
 *       2. 清除 timer
 *       3. loadTeams fn, 載入多次 teams
 *       4. 執行 listTimer, 開返個 timer, 以5s為單位
 *   - hideWindow
 *     1. 若果此時 window 是 show 的狀態
 *       2. 清除 timer
 *       3. loadTeams fn, 載入多次 teams
 *       4. 執行 listTimer, 開返個 timer, 以5min為單位
 *   - componentWillReceiveProps
 *     1. 當 switcher 收到新 props 時
 *       2. 若收到 activeScope object prop
 *         3. 執行 changeScope, 因為有機會已經轉左 team 了
 *       4. 若沒有收到 activeScope object prop
 *         5. 將 switcher.state.scope 設為預設的 team id
 *   - componentWillMount
 *     1. 增加 showWindow 同 hideWindow 的 listener
 *     2. 當關 app 前，會清返 showWindow 同 hideWindow 的 listener
 *   - listTimer
 *     1. 主要作用係 set this.timer
 *     2. 視乎 window 係顯示或者隱藏，5s / 5 min 執行一次 this.timer
 *   - componentDidMount
 *     1. 檢查有沒有收到 'update-failed' event, 有就 set state updateFailed to false
 *     2. 執行 listTimer, 啟動 timer for loadTeams
 *     3. 執行 checkCurrentTeam
 *     4. 執行 listenToConfig
 *   - listenToConfig
 *     0. 在 componentDidMount 裡被執行
 *     1. 監聽收到 config-changed 時
 *       2. loadTeams fn, 載入多次 teams, (為了以防萬一有新的 team 加入)
 *       3. 執行 checkCurrentTeam
 *   - resetScope
 *     1. checkCurrentTeam 和 loadTeams 時執行(都是找不到team.id時執行)
 *     2. 執行 changeScope()
 *   - checkCurrentTeam
 *     (主要係負責檢查 config.currentTeam，然後利用該值去 changeScope)
 *     1. 若果在 config file 裡沒有 currentTeam, 執行 resetScope
 *     2. 將 config.currentTeam 看看存不存在於 getTeams 的 teams 中
 *       3. 若不存在, 證明該 config.currentTeam 已被刪除, 執行 resetScope
 *   - saveConfig
 *     1. 在 utils 調用 saveconfig fn
 *       2. 將 object 存入去 config file
 *   - generateAvatar
 *     - 由 str 產生和返回 base64 的頭像字串
 *   - getTeams
 *     - 返回 { teams }
 *   - merge
 *     - 將第一個 array 和第二個 array 結合, 返回 已經結合的 array
 *   - haveUpdated
 *     1. 參數 data 是傳入的 teams array
 *     2. 將 data(新 teams) 和 state.teams (舊 teams) 比對, 刪除一些已不存在的 teams
 *     3. 將新和舊的 teams 用 merge 結合, 返回最新版的 teams array
 *   - loadTeams
 *     - 當視窗隱藏時, 只載入 teams events
 *       - this.props.setTeams(null, firstLoad)
 *       - When passing `null`, the feed will only, update the events, not the teams
 *     - 當視窗顯示時
 *       1. teams 由 getTeams 得一中土弓
 *       2. 由 haveUpdated 得到新的 teams
 *       3. state.scope 不能在更新的 teams 中找到時, resetScope
 *       4. set state teams to updated teams
 *       5. 透過  this.props.setTeams 通知 feed, this.props.setTeams(updated || null, firstLoad)
 *   - componentDidUpdate
 *     1. 執行 queue 裡面的 function
 *     2. set state.initialized 為 true
 *   - getDerivedStateFromProps
 *     - 離線模式 state.initialized: false
 *   - updateConfig
 *     - 將 currentTeam 的資料由 team 參數處得到，整埋好, 交比 saveConfig 處理
 *     - 將收到的參數傳入 saveConfig()
 *   - changeScope
 *     1. 通知 feed, this.props.setFeedScope(
 *     2. set state.scope
 *     3. 準備好更新 config 的 queueFunction
 *   - openMenu
 *     - 按下設置按鈕時, 傳送 'open-menu' 比 index.js 以開啟 menu
 *   - renderItem
 *     - 圓錄錄的頭
 *   - renderTeams
 *     - 入面有好多個 Item component 姐係 renderItem
 *   - renderList
 *     - 包住 renderTeams
 *   - retryUpdate
 *     - 按 retry link 時關閉程式再開
 *   - closeUpdateMessage
 *     - 將 state.updateFailed 設為 false, 這樣就不會顯示更新錯誤的提示訊息
 */

// Native
import crypto from 'crypto'

// Packages
import electron from 'electron'
import { Component } from 'react'
import { func, bool, string } from 'prop-types'
import setRef from 'react-refs'
import { SortableContainer, SortableElement } from 'react-sortable-hoc'
import makeUnique from 'make-unique'
import ms from 'ms'
import isDev from 'electron-is-dev'
// eslint-disable-next-line import/extensions
import Identicon from 'identicon.js'

// Styles
import {
  wrapStyle,
  listStyle,
  itemStyle,
  helperStyle
} from '../../styles/components/feed/switcher'

// Components
import Clear from '../../vectors/clear'
import Avatar from './avatar'

class Switcher extends Component {
  state = {
    teams: [],
    scope: null,
    updateFailed: false,
    initialized: false,
    syncInterval: '5s',
    queue: []
  }

  remote = electron.remote || false
  ipcRenderer = electron.ipcRenderer || false
  setReference = setRef.bind(this)

  load = file => {
    if (electron.remote) {
      return electron.remote.require(file)
    }

    return null
  }

  configUtils = this.load('./utils/config')

  // Ensure that config doesn't get checked when the
  // file is updated from this component
  savingConfig = false

  // ;this.timer 何時會 set:
  // componentdidmount 時侯就會執行 listtimer 而佢入面就會 set 佐 this.timer
  showWindow = () => {
    // 當曾經 componentdidmount 和曾經 hide 過 window 後，再 show window 時執行
    if (this.timer && this.state.syncInterval !== '5s') {
      // 清除 timer
      clearInterval(this.timer)

      // Refresh the teams and events when the window gets
      // shown, so that they're always up-to-date
      // 載入多次 teams
      this.loadTeams()

      // Restart the timer so we keep everything in sync every 5s
      // 開返個 timer
      this.listTimer()
      // 因為已經 show windows, 所以 timer 每五秒更新一次
      this.setState({ syncInterval: '5s' })
    }
  }

  // 若果此時 window 是 show 的狀態
  // hide window 時會 取消 timer, 重新啟用 timer 為每 5m 執行一次
  hideWindow = () => {
    if (this.timer && this.state.syncInterval !== '5m') {
      clearInterval(this.timer)

      // Restart the timer so we keep everything in sync every 5m
      this.listTimer()
      this.setState({ syncInterval: '5m' })
    }
  }

  // 當 switcher 收到 new props 時, 執行 changeScope
  // eslint-disable-next-line react/no-deprecated
  componentWillReceiveProps({ activeScope }) {
    if (activeScope) {
      this.changeScope(activeScope, true, true, true)
      return
    }

    if (this.state.scope !== null) {
      return
    }

    this.setState({
      scope: 'IZSNu3Ty'
    })
  }

  // 增加 showWindow 同 hideWindow 的 listener
  // eslint-disable-next-line react/no-deprecated
  componentWillMount() {
    // Support SSR
    if (!this.remote || typeof window === 'undefined') {
      return
    }

    const currentWindow = this.remote.getCurrentWindow()

    if (!currentWindow) {
      return
    }

    currentWindow.on('show', this.showWindow)
    currentWindow.on('hide', this.hideWindow)

    window.addEventListener('beforeunload', () => {
      currentWindow.removeListener('show', this.showWindow)
      currentWindow.removeListener('hide', this.hideWindow)
    })
  }

  // 主要作用係 set this.timer
  // 而 this.timer 的作用就係執行 this.loadteam
  listTimer = () => {
    const { getCurrentWindow } = this.remote
    const { isVisible } = getCurrentWindow()

    const time = isVisible() ? '5s' : '5m'

    this.timer = setTimeout(async () => {
      try {
        // It's important that this is being `await`ed
        await this.loadTeams()
      } catch (error) {
        if (isDev) {
          console.error(error)
        }
      }

      // Once everything is done or has failed,
      // try it again after some time.
      this.listTimer()
    }, ms(time))
  }

  // 當收到 update-failed 就會 set state, 由更新委員會傳過黎
  async componentDidMount() {
    // Show a UI banner if the installation
    // of an update failed
    this.ipcRenderer.on('update-failed', () => {
      this.setState({ updateFailed: true })
    })

    // Only start updating teams once they're loaded!
    // This needs to be async so that we can already
    // start the state timer below for the data that's already cached
    if (!this.props.online) {
      this.listTimer()
      return
    }

    this.loadTeams(true)
      .then(this.listTimer)
      .catch(this.listTimer)

    // Check the config for `currentTeam`
    await this.checkCurrentTeam()

    // Update the scope if the config changes
    this.listenToConfig()
  }

  listenToConfig() {
    if (!this.ipcRenderer) {
      return
    }

    this.ipcRenderer.on('config-changed', async (event, config) => {
      if (this.state.teams.length === 0) {
        return
      }

      if (this.savingConfig) {
        this.savingConfig = false
        return
      }

      // Load the teams in case there is a brand new team
      await this.loadTeams()

      // Check for the `currentTeam` property in the config
      await this.checkCurrentTeam(config)
    })
  }

  // 有改
  resetScope() {
    this.changeScope({ id: 'IZSNu3Ty' })
  }

  async checkCurrentTeam(config) {
    if (!this.remote) {
      return
    }

    if (!config) {
      const { getConfig } = this.remote.require('./utils/config')

      try {
        config = await getConfig()
      } catch (error) {
        // The config is not valid, so no need to update
        // the current team.
        return
      }
    }

    if (!config.currentTeam) {
      this.resetScope()
      return
    }

    // Legacy config
    if (typeof config.currentTeam === 'object') {
      this.changeScope(config.currentTeam, true)
      return
    }

    const { teams } = await this.getTeams()
    const related = teams.find(team => team.id === config.currentTeam)

    // The team was deleted
    if (!related) {
      this.resetScope()
      return
    }

    this.changeScope(related, true)
  }

  async saveConfig(newConfig) {
    const { saveConfig } = this.configUtils

    // Ensure that we're not handling the
    // event triggered by changes made to the config
    // because the changes were triggered manually
    // inside this app
    this.savingConfig = true

    // Then update the config file
    await saveConfig(newConfig, 'config')
  }

  generateAvatar(str) {
    const hash = crypto.createHash('md5')
    hash.update(str)
    const imgData = new Identicon(hash.digest('hex')).toString()
    return 'data:image/png;base64,' + imgData
  }

  getTeams() {
    return {
      teams: [
        {
          id: 'aaa',
          name: 'github',
          avatarUrl: this.generateAvatar('IZSNu3Ty')
        },
        {
          id: 'di61gxME',
          name: 'Trello',
          avatarUrl: this.generateAvatar('di61gxME')
        }
      ]
    }
  }

  merge(first, second) {
    const merged = first.concat(second)
    return makeUnique(merged, (a, b) => a.id === b.id)
  }

  async haveUpdated(data) {
    const newData = JSON.parse(JSON.stringify(data))
    let currentData = JSON.parse(JSON.stringify(this.state.teams))

    if (currentData.length > 0) {
      // Remove teams that the user has left
      currentData = currentData.filter(team => {
        return Boolean(newData.find(item => item.id === team.id))
      })
    }

    const ordered = this.merge(currentData, newData)
    return ordered
  }

  // 邊到用到, showWindow, listTimer, componentDidMount
  // 載入 teams 並放到 state
  // 有時用 setState
  // 有時用 setTeams
  async loadTeams(firstLoad) {
    if (!this.remote) {
      return
    }

    const currentWindow = this.remote.getCurrentWindow()

    // 若 window 處於隱藏狀態, 並且已經經過 componentdidmount initialized
    // 那就 setTeams null
    // 為什麼呢? 為了清除所有 teams 當 window 處於隱藏狀態
    // If the window isn't visible, don't pull the teams
    // Ensure to always load the first chunk
    if (!currentWindow.isVisible() && this.state.initialized) {
      if (this.props.setTeams) {
        // When passing `null`, the feed will only
        // update the events, not the teams
        await this.props.setTeams(null, firstLoad)
      }

      return
    }

    // Call api 返回一個 object
    // 裡面包含 teams
    const data = await this.getTeams()

    if (!data || !data.teams) {
      return
    }

    const { teams } = data

    const updated = await this.haveUpdated(teams)

    const scopeExists = updated.find(team => {
      return this.state.scope === team.id
    })

    if (!scopeExists) {
      this.resetScope()
    }

    if (updated) {
      this.setState({ teams: updated })
    }

    if (this.props.setTeams) {
      // When passing `null`, the feed will only
      // update the events, not the teams
      await this.props.setTeams(updated || null, firstLoad)
    }
  }

  componentDidUpdate() {
    const { teams } = this.state

    while (this.state.queue.length > 0) {
      const { queue } = this.state

      queue.shift()()

      this.setState({ queue })
    }

    if (this.state.initialized) {
      return
    }

    const teamsCount = teams.length

    if (teamsCount === 0) {
      return
    }

    const when = 100 + 100 * teamsCount + 600

    setTimeout(() => {
      // Ensure that the animations for the teams
      // fading in works after recovering from offline mode
      if (!this.props.online) {
        return
      }

      this.setState({
        initialized: true
      })
    }, when)
  }

  static getDerivedStateFromProps(props) {
    // Ensure that the animations for the teams
    // fading in works after recovering from offline mode.
    if (!props.online) {
      return {
        initialized: false
      }
    }

    return null
  }

  // 有改
  async updateConfig(team) {
    if (!this.remote) {
      return
    }

    const info = {
      currentTeam: team
    }

    // And then update the config file
    await this.saveConfig(info)
  }

  // 當 switcher 收到 new props 時
  // activeScope 有改動時
  // 就會 changeScope
  // saveToConfig: 會將 team 儲存到 config file，但需要經過 queue 排序才會執行
  // byHand: queue 會用到 (但唔知用黎做乜)
  // noFeed: true 不會執行 this.props.setFeedScope
  changeScope(team, saveToConfig, byHand, noFeed) {
    // If the clicked item in the team switcher is
    // already the active one, don't do anything
    if (this.state.scope === team.id) {
      return
    }

    if (!noFeed && this.props.setFeedScope) {
      // Load different messages into the feed
      this.props.setFeedScope(team.id)
    }

    // Make the team/user icon look active by
    // syncing the scope with the feed
    this.setState({ scope: team.id })

    // Save the new `currentTeam` to the config
    if (saveToConfig) {
      const queueFunction = (fn, context, params) => {
        return () => {
          fn.apply(context, params)
        }
      }

      this.setState({
        queue: this.state.queue.concat([
          queueFunction(this.updateConfig, this, [team, byHand])
        ])
      })
    }
  }

  openMenu = () => {
    // The menu toggler element has children
    // we have the ability to prevent the event from
    // bubbling up from those, but we need to
    // use `this.menu` to make sure the menu always gets
    // bounds to the parent
    const { bottom, left, height, width } = this.menu.getBoundingClientRect()
    const sender = electron.ipcRenderer || false

    if (!sender) {
      return
    }

    sender.send('open-menu', {
      x: left,
      y: bottom,
      height,
      width
    })
  }

  renderItem() {
    // eslint-disable-next-line new-cap
    return SortableElement(({ team }) => {
      const isActive = this.state.scope === team.id
      const index = this.state.teams.indexOf(team)
      const shouldScale = !this.state.initialized
      const { darkBg } = this.props

      const classes = []

      if (isActive) {
        classes.push('active')
      }

      if (darkBg) {
        classes.push('dark')
      }

      const clicked = event => {
        event.preventDefault()
        this.changeScope(team, true, true)
      }

      return (
        <li onClick={clicked} className={classes.join(' ')} key={team.id}>
          <Avatar
            team={team}
            scale={shouldScale}
            delay={index}
            avatarUrl={team.avatarUrl}
          />

          <style jsx>{itemStyle}</style>
        </li>
      )
    })
  }

  renderTeams() {
    const Item = this.renderItem()

    return this.state.teams.map((team, index) => (
      <Item key={team.id} index={index} team={team} />
    ))
  }

  renderList() {
    const teams = this.renderTeams()

    // eslint-disable-next-line new-cap
    return SortableContainer(() => (
      <ul>
        {teams}
        <style jsx>{listStyle}</style>
      </ul>
    ))
  }

  retryUpdate = () => {
    if (!this.remote) {
      return
    }

    const { app } = this.remote

    // Restart the application
    app.relaunch()
    app.exit(0)
  }

  closeUpdateMessage = () => {
    this.setState({
      updateFailed: false
    })
  }

  render() {
    const List = this.renderList()
    const { updateFailed } = this.state
    const { darkBg, online } = this.props

    return (
      <div>
        {updateFailed && (
          <span className="update-failed">
            <p>
              The app failed to update! &mdash;{' '}
              <a onClick={this.retryUpdate}>Retry?</a>
            </p>
            <Clear onClick={this.closeUpdateMessage} color="#fff" />
          </span>
        )}
        <aside className={darkBg ? 'dark' : ''}>
          {online ? (
            <div className="list-container" ref={this.setReference} name="list">
              <div className="list-scroll">
                <List
                  axis="x"
                  lockAxis="x"
                  helperClass="switcher-helper"
                  lockToContainerEdges={true}
                  lockOffset="0%"
                />
              </div>
            </div>
          ) : (
            <p className="offline">{'You are offline'}</p>
          )}

          <a
            className="toggle-menu"
            onClick={this.openMenu}
            onContextMenu={this.openMenu}
            ref={this.setReference}
            name="menu"
          >
            <i />
            <i />
            <i />
          </a>
        </aside>

        <style jsx>{wrapStyle}</style>

        <style jsx global>
          {helperStyle}
        </style>
      </div>
    )
  }
}

Switcher.propTypes = {
  setFeedScope: func,
  setTeams: func,
  activeScope: string,
  darkBg: bool,
  online: bool,
  fetchGithub: func,
  fetchTrello: func
}

export default Switcher
