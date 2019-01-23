// Packages
import electron from 'electron'
import { PureComponent } from 'react'
import { object, bool, string } from 'prop-types'
import dotProp from 'dot-prop'
import ms from 'ms'

// Styles
import { localStyles, globalStyles } from '../../styles/components/feed/event'

// Utilities
import dateDiff from '../../utils/date-diff'

// Components
import Avatar from './avatar'

class EventMessage extends PureComponent {
  state = {
    url: null
  }

  remote = electron.remote || false

  click = () => {
    if (!this.state.url) {
      return
    }

    if (!this.remote) {
      return
    }

    this.remote.shell.openExternal(`https://${this.state.url}`)
  }

  // eslint-disable-next-line react/no-deprecated
  componentWillMount() {
    const info = this.props.content

    const urlProps = [
      'payload.cn',
      'payload.alias',
      'payload.url',
      'payload.domain',
      'payload.deploymentUrl'
    ]

    for (const prop of urlProps) {
      const url = dotProp.get(info, prop)

      if (url) {
        this.setState({ url })
        break
      }
    }
  }

  parseDate(date) {
    const current = new Date()
    const difference = dateDiff(current, date, 'milliseconds')

    const checks = {
      '1 minute': 'seconds',
      '1 hour': 'minutes',
      '1 day': 'hours',
      '7 days': 'days',
      '30 days': 'weeks',
      '1 year': 'months'
    }

    for (const check in checks) {
      if (!{}.hasOwnProperty.call(checks, check)) {
        continue
      }

      const unit = checks[check]
      const shortUnit = unit === 'months' ? 'mo' : unit.charAt(0)

      if (difference < ms(check)) {
        return dateDiff(current, date, unit) + shortUnit
      }
    }

    return null
  }

  render() {
    const { message, content, darkBg, githubAvatar } = this.props
    const classes = ['event']

    if (darkBg) {
      classes.push('dark')
    }

    return (
      <figure className={classes.join(' ')} onClick={this.click}>
        <Avatar event={content} darkBg={darkBg} avatarUrl={githubAvatar} />
        <figcaption>
          {message}
          <span>{this.parseDate(content.created)}</span>
        </figcaption>

        <style jsx>{localStyles}</style>
        <style jsx global>
          {globalStyles}
        </style>
      </figure>
    )
  }
}

EventMessage.propTypes = {
  content: object,
  team: object,
  message: object,
  darkBg: bool,
  githubAvatar: string
}

export default EventMessage
