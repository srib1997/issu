// Packages
import { PureComponent } from 'react'
import { object, bool, number, string } from 'prop-types'

// Styles
import styles from '../../styles/components/feed/avatar'

class Avatar extends PureComponent {
  state = {
    url: null,
    title: null,
    scaled: false
  }

  // eslint-disable-next-line react/no-deprecated
  componentWillMount() {
    this.setURL()
    this.setTitle()
  }

  componentDidMount() {
    if (!this.props.scale) {
      return
    }

    if (!this.state.scaled) {
      this.prepareScale(this.props.delay)
    }
  }

  async setURL() {
    const { avatarUrl } = this.props

    this.setState({
      url: avatarUrl
    })
  }

  async setTitle() {
    const { team } = this.props
    const title = team.name
    this.setState({ title })
  }

  prepareScale(delay) {
    const when = 100 + 100 * delay

    setTimeout(() => {
      this.setState({
        scaled: true
      })
    }, when)
  }

  render() {
    let classes = this.props.event ? 'in-event' : ''

    if (this.props.scale) {
      classes += ' scale'
    }

    if (this.state.scaled) {
      classes += ' scaled'
    }

    if (this.state.darkBg) {
      classes += ' dark'
    }

    return (
      <div>
        <img
          src={this.state.url}
          title={this.state.title}
          draggable="false"
          className={classes}
        />

        <style jsx>{styles}</style>
      </div>
    )
  }
}

Avatar.propTypes = {
  team: object,
  event: object,
  scale: bool,
  delay: number,
  avatarUrl: string
}

export default Avatar
