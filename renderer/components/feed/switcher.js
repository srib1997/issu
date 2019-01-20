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
      scope: 'aaa'
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
    this.changeScope('aaa')
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
          name: 'AAA',
          avatarUrl: this.generateAvatar('aaa')
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
  online: bool
}

export default Switcher
