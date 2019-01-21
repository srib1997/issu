/**
 * 主要
 * - about window
 */

// Packages
import electron from 'electron'
import React from 'react'
import { ago as timeAgo } from 'time-ago'
import isDev from 'electron-is-dev'
import isDarkMode from '../utils/dark-mode'

// Utilities
import CloseWindowSVG from '../vectors/close-window'

// Styles
import { mainStyles, globalStyles } from '../styles/pages/about'

class About extends React.PureComponent {
  constructor(props) {
    super(props)

    let releaseDate = '(not yet released)'

    try {
      // eslint-disable-next-line no-undef
      const buildDate = `${BUILD_DATE}`

      if (!isNaN(buildDate)) {
        const ago = timeAgo(new Date(parseInt(buildDate, 10)))
        releaseDate = `(${ago})`
      }
    } catch (error) {}

    this.state = {
      version: null,
      darkMode: false,
      releaseDate
    }
  }

  state = {
    version: null,
    darkMode: false,
    releaseDate: '(not yet released)'
  }

  remote = electron.remote || false
  ipcRenderer = electron.ipcRenderer || false
  isWindows = process.platform === 'win32'

  setReleaseDate = () => {
    // eslint-disable-next-line no-undef
    const buildDate = `${BUILD_DATE}`

    if (isNaN(buildDate)) {
      return
    }

    const ago = timeAgo(new Date(parseInt(buildDate, 10)))

    this.setState({
      releaseDate: `(${ago})`
    })
  }

  onThemeChanged = (event, config) => {
    const { darkMode } = config

    this.setState({ darkMode })
  }

  listenThemeChange() {
    if (!this.ipcRenderer) {
      return
    }

    this.ipcRenderer.on('theme-changed', this.onThemeChanged)
  }

  componentDidMount() {
    if (!this.remote) {
      return
    }

    let version

    if (isDev) {
      version = this.remote.process.env.npm_package_version
    } else {
      version = this.remote.app.getVersion()
    }

    this.setState({
      version,
      darkMode: isDarkMode(this.remote)
    })

    // Listen to system darkMode system change
    this.listenThemeChange()

    // Set the release date
    this.setReleaseDate()

    setInterval(this.setReleaseDate, 1000)
  }

  componentWillUnmount() {
    this.ipcRenderer.removeListener('theme-changed', this.onThemeChanged)
  }

  openLink = event => {
    const link = event.target

    if (!this.remote) {
      return
    }

    this.remote.shell.openExternal(link.href)
    event.preventDefault()
  }

  handleCloseClick = () => {
    if (!this.remote) {
      return
    }

    const currentWindow = this.remote.getCurrentWindow()
    currentWindow.hide()
  }

  render() {
    return (
      <main>
        <div className={this.state.darkMode ? 'dark' : ''}>
          {this.isWindows && (
            <div className="window-controls">
              <span onClick={this.handleCloseClick}>
                <CloseWindowSVG />
              </span>
            </div>
          )}
          <section className="wrapper">
            <span className="window-title">About</span>

            <img src="/static/app-icon.png" />

            <h1>Issu</h1>
            <h2>
              Version {this.state.version ? <b>{this.state.version}</b> : ''}{' '}
              {this.state.releaseDate ? this.state.releaseDate : ''}
            </h2>

            <article>
              <h1>Authors</h1>

              <p>
                <a href="https://github.com/srib1997" onClick={this.openLink}>
                  Srib
                </a>
                <br />
                <a href="https://github.com/comus" onClick={this.openLink}>
                  Comus
                </a>
              </p>
            </article>

            <span className="copyright">
              Made by{' '}
              <a href="https://withcloud.co" onClick={this.openLink}>
                WithCloud
              </a>
            </span>
          </section>
        </div>

        <style jsx>{mainStyles}</style>
        <style jsx global>
          {globalStyles}
        </style>
      </main>
    )
  }
}

export default About
