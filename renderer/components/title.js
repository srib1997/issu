// Packages
import { PureComponent } from 'react'
import PropTypes from 'prop-types'
import setRef from 'react-refs'

// Styles
import styles from '../styles/components/title'

class Title extends PureComponent {
  setReference = setRef.bind(this)

  render() {
    const classes = []

    if (this.props.darkBg) {
      classes.push('dark')
    }

    if (this.props.light) {
      classes.push('light')
    }

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

Title.propTypes = {
  children: PropTypes.oneOfType([
    PropTypes.string,
    PropTypes.element.isRequired
  ]),
  light: PropTypes.bool,
  darkBg: PropTypes.bool
}

export default Title
