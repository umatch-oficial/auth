'use strict'

const ServiceProvider = require('adonis-fold').ServiceProvider

class AuthProvider extends ServiceProvider {

  * register () {
    this.app.bind('Adonis/Src/Auth', function (app) {
      return require('../src/AuthManager')
    })
  }

}

module.exports = AuthProvider
