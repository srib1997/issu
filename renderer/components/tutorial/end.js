// Packages
import electron from 'electron'
import { Component } from 'react'

// Styles
import introStyles from '../../styles/components/tutorial/intro'

// Components
import Button from './button'

class End extends Component {
  remote = electron.remote || false

  showApp = async event => {
    event.preventDefault()

    if (!this.remote) {
      return
    }

    // Also save it to now.json
    const { saveConfig, watchConfig } = this.remote.require('./utils/config')

    try {
      await saveConfig(
        {
          token: '123456'
        },
        'auth',
        true
      )
    } catch (error) {
      console.log('Could not save auth config', error)
      return
    }

    // Start watching for changes in .now.json
    // This will update the scope in the main window
    watchConfig()

    if (!this.remote) {
      return
    }

    const { main } = this.remote.getGlobal('windows')

    // Ensure that the event feed starts fresh
    main.reload()

    // As soon as the event feed has finished reloading,
    // adjust the content of the intro
    main.once('ready-to-show', async () => {
      const currentWindow = this.remote.getCurrentWindow()

      // Show the event feed
      currentWindow.emit('open-tray')
    })
  }

  render() {
    return (
      <article>
        <p>
          <b>{`It's that simple!`}</b>
        </p>

        <p className="has-mini-spacing">
          Simply click the button below to start:
        </p>

        <Button onClick={this.showApp} className="get-started">
          Get Started
        </Button>
        <style jsx>{introStyles}</style>
      </article>
    )
  }
}

export default End
