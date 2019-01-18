// Packages
import electron from 'electron'
import React, { PureComponent } from 'react'
import PropTypes from 'prop-types'

// Vectors
import MinimizeSVG from '../vectors/minimize-window'
import CloseSVG from '../vectors/close-window'

// Components
import End from '../components/tutorial/end'

// Styles
import { sliderStyle, wrapStyle, controlStyle } from '../styles/pages/tutorial'
import styles from '../styles/components/title'

class Sections extends React.PureComponent {
  remote = electron.remote || false
  isWindows = process.platform === 'win32'

  handleMinimizeClick = () => {
    if (!this.remote) {
      return
    }

    const currentWindow = this.remote.getCurrentWindow()
    currentWindow.minimize()
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
      <div>
        {this.isWindows && (
          <div className="window-controls">
            <span onClick={this.handleMinimizeClick}>
              <MinimizeSVG />
            </span>

            <span onClick={this.handleCloseClick}>
              <CloseSVG />
            </span>
          </div>
        )}

        <div className="container">
          <section>
            <End />
          </section>
        </div>

        <style jsx>{controlStyle}</style>
      </div>
    )
  }
}

class Title extends PureComponent {
  static propTypes = {
    children: PropTypes.string
  }

  render() {
    const classes = []

    if (process.platform === 'win32') {
      classes.push('windows')
    }

    return (
      <aside className={classes.join(' ')}>
        <div>
          <h1>{this.props.children}</h1>
        </div>
        <style jsx>{styles}</style>
      </aside>
    )
  }
}

const Tutorial = () => (
  <main>
    <Title>Welcome to Issu</Title>
    <Sections />

    <style jsx>{wrapStyle}</style>
    <style jsx global>
      {sliderStyle}
    </style>
  </main>
)

export default Tutorial
