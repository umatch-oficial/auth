'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global it, describe  */
const chai = require('chai')
const expect = chai.expect
const SessionAuthenticator = require('../../src/Authenticators').session
const LucidSerializer = require('../../src/Serializers').Lucid
const Ioc = require('adonis-fold').Ioc
Ioc.bind('Adonis/Src/Hash', function () {
  return {}
})
const AuthManager = require('../../src/AuthManager')

class User {}
const Config = {
  get: function (key) {
    switch (key) {
      case 'auth.authenticator':
        return 'session'
      case 'auth.session':
        return {
          serializer: 'Lucid',
          model: User,
          uid: 'email',
          password: 'password',
          scheme: 'session'
        }
    }
  }
}

describe('AuthManager', function () {
  it('should setup the proper serializer and authenticator when instantiated', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    expect(auth instanceof AuthManager).to.equal(true)
    expect(auth.authenticatorInstance instanceof SessionAuthenticator).to.equal(true)
    expect(auth.serializer instanceof LucidSerializer).to.equal(true)
  })

  it('should proxy all methods of authenticator instance', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const methods = ['check', 'validate', 'attempt', 'login', 'loginViaId', 'getUser']
    methods.forEach(function (method) {
      expect(auth[method]).to.be.a('function')
    })
  })

  it('should return a new instance of authenticator using the authenticator method', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    auth.foo = 'bar'
    const newAuth = auth.authenticator('session') // this is cheating
    expect(newAuth.foo).to.equal(undefined)
  })
})
