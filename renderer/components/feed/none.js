/**
 * 主要
 * No event component
 */

// Packages
import { Fragment } from 'react'
import { bool } from 'prop-types'

// Styles
import styles from '../../styles/components/feed/none'

const NoEvents = ({ darkBg = false }) => (
  <div className={darkBg ? 'dark' : ''}>
    <Fragment>
      <h1>No Events Found</h1>
    </Fragment>
    <style jsx>{styles}</style>
  </div>
)

NoEvents.propTypes = {
  darkBg: bool
}

export default NoEvents
