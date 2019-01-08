import * as Sentry from '@sentry/electron'
import React from 'react'
import Error from 'next/error'
import PropTypes from 'prop-types'

Sentry.init({
  dsn: 'https://c8371db438994884a56ff32199f5f4ba@sentry.io/1364904'
})

class ErrorPage extends React.Component {
  static getInitialProps({ res, err }) {
    const statusCode = res ? res.statusCode : err ? err.statusCode : null
    Sentry.captureException(err)
    return { statusCode }
  }

  render() {
    return <Error statusCode={this.props.statusCode} />
  }
}

ErrorPage.propTypes = {
  statusCode: PropTypes.number
}

export default ErrorPage
