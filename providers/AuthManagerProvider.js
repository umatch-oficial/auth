'use strict'

const ServiceProvider = require('adonis-fold').ServiceProvider

class AuthManagerProvider extends ServiceProvider {

  * register () {
    this.app.bind('Adonis/Src/AuthManager', function (app) {
      return require('../src/AuthManager')
    })
  }

}

module.exports = AuthManagerProvider
