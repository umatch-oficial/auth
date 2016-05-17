'use strict'

const ServiceProvider = require('adonis-fold').ServiceProvider

class AuthManagerProvider extends ServiceProvider {

  * register () {
    this._bindManager()
    this._bindMiddleware()
    this._bindCommands()
  }

  _bindMiddleware () {
    this.app.bind('Adonis/Middleware/AuthInit', function (app) {
      const AuthManager = app.use('Adonis/Src/AuthManager')
      const Config = app.use('Adonis/Src/Config')
      const AuthInit = require('../Middleware/AuthInit')
      return new AuthInit(AuthManager, Config)
    })

    this.app.bind('Adonis/Middleware/Auth', function (app) {
      const View = app.use('Adonis/Src/View')
      const Auth = require('../Middleware/Auth')
      return new Auth(View)
    })
  }

  _bindCommands () {
    this.app.bind('Adonis/Commands/Auth:Setup', function () {
      const AuthSetup = require('../commands/Setup')
      return new AuthSetup()
    })
  }

  _bindManager () {
    this.app.bind('Adonis/Src/AuthManager', function () {
      return require('../src/AuthManager')
    })
  }

}

module.exports = AuthManagerProvider
