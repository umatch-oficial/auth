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
      expect(typeof (auth[method])).to.equal('function')
    })
  })

  it('should return a new instance of authenticator using the authenticator method', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    auth.foo = 'bar'
    const newAuth = auth.authenticator('session') // this is cheating
    expect(newAuth.foo).to.equal(undefined)
  })

  it('should throw an error when unable to locate config for an authenticator', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const fn = function () {
      return auth._getAuthenticator('foo')
    }
    expect(fn).to.throw('DomainException', /Cannot find config for foo/)
  })

  it('should return authenticator instance usin _getAuthenticator method', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const sessionAuth = auth._getAuthenticator('session')
    expect(sessionAuth instanceof SessionAuthenticator).to.equal(true)
  })

  it('should return default authenticator when name is default', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const authenticator = auth._makeAuthenticatorName('default')
    expect(authenticator).to.equal('auth.session')
  })

  it('should prefix authenticator to the passed name', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const authenticator = auth._makeAuthenticatorName('api')
    expect(authenticator).to.equal('auth.api')
  })

  it('should throw an error when unable to locate serializer', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const fn = function () {
      return auth._getSerializer('foo')
    }
    expect(fn).to.throw('DomainException', /Cannot find foo serializer/)
  })

  it('should return serializer instance usin _getSerializer method', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const lucid = auth._getSerializer('Lucid')
    expect(lucid instanceof LucidSerializer).to.equal(true)
  })

  it('should throw error when unable to authenticator instance of a given scheme', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const fn = function () {
      return auth._makeAuthenticator('foo')
    }
    expect(fn).to.throw('DomainException', /Cannot find authenticator for foo scheme/)
  })

  it('should return authenticator instance using _makeAuthenticator', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const sessionAuth = auth._makeAuthenticator('session')
    expect(sessionAuth instanceof SessionAuthenticator).to.equal(true)
  })
})
