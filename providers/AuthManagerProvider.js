'use strict'

const ServiceProvider = require('adonis-fold').ServiceProvider

class AuthManagerProvider extends ServiceProvider {

  * register () {
    this._bindManager()
    this._bindMiddleware()
  }

  _bindMiddleware () {
    this.app.bind('Adonis/Middleware/AuthInit', function (app) {
      const AuthManager = app.use('Adonis/Src/AuthManager')
      const Config = app.use('Adonis/Src/Config')
      const AuthInit = require('../Middleware/AuthInit')
      return new AuthInit(AuthManager, Config)
    })

    this.app.bind('Adonis/Middleware/Auth', function () {
      const Auth = require('../Middleware/Auth')
      return new Auth()
    })
  }

  _bindManager () {
    this.app.bind('Adonis/Src/AuthManager', function () {
      return require('../src/AuthManager')
    })
  }

}

module.exports = AuthManagerProvider
