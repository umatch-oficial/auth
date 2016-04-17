'use strict'

const fold = require('adonis-fold')
const Ioc = fold.Ioc
const Registrar = fold.Registrar
const path = require('path')

class DummyModel {
  static query () {
    return this
  }
  static where (key, value) {
    this[key] = value
    return this
  }
  static * first () {
    if (this.email === 'foo@adonisjs.com') {
      return {
        password: 'secret'
      }
    }
    return null
  }
  static * find (id) {
    return id === 2
  }
}

const basicAuthConfig = {
  serializer: 'Lucid',
  model: DummyModel,
  uid: 'email',
  password: 'password',
  scheme: 'basic'
}

const jwtConfig = {
  serializer: 'Lucid',
  model: DummyModel,
  scheme: 'jwt',
  secret: 'bubblegum'
}

const Config = {
  get: function (key) {
    switch (key) {
      case 'auth.authenticator':
        return 'basic'
      case 'auth.basic':
        return basicAuthConfig
      case 'auth.jwt':
        return jwtConfig
    }
  }
}

const setup = exports = module.exports = {}

setup.registerProviders = function () {
  Ioc.bind('Adonis/Src/Hash', function () {
    return {
      verify: function * (a, b) {
        return a === b
      }
    }
  })
  return Registrar.register([path.join(__dirname, '../../../providers/AuthManagerProvider')])
}

setup.decorateRequest = function (req, name) {
  const request = {
    request: req
  }
  const AuthManager = Ioc.use('Adonis/Src/AuthManager')
  request.auth = new AuthManager(Config, request, name)
  request.header = function () {
    return req.headers['authorization']
  }
  return request
}

setup.use = Ioc.use
