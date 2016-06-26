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
const SessionScheme = require('../../src/Schemes').session
const LucidSerializer = require('../../src/Serializers').Lucid
const NE = require('node-exceptions')
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
      case 'auth.myauth':
        return {
          serializer: 'Lucid',
          scheme: 'oauth'
        }
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
    expect(auth.authenticatorInstance instanceof SessionScheme).to.equal(true)
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
    expect(sessionAuth instanceof SessionScheme).to.equal(true)
  })

  it('should return default authenticator when name is default', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const authenticator = auth._makeAuthenticatorName('default')
    expect(authenticator).to.equal('auth.session')
  })

  it('should prefix scheme to the passed name', function () {
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

  it('should throw error when unable to find given scheme', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const fn = function () {
      return auth._makeScheme('foo')
    }
    expect(fn).to.throw('DomainException', /Cannot find authenticator for foo scheme/)
  })

  it('should return scheme instance using _makeScheme', function () {
    const request = {}
    const auth = new AuthManager(Config, request)
    const sessionAuth = auth._makeScheme('session')
    expect(sessionAuth instanceof SessionScheme).to.equal(true)
  })

  it('should throw an error when there are no arguments supplied to the extend method', function () {
    const fn = function () {
      return AuthManager.extend()
    }
    expect(fn).to.throw(NE.InvalidArgumentException, /Make sure to provide the extend type name, type and body/)
  })

  it('should throw an error when extend body and type is not defined', function () {
    const fn = function () {
      return AuthManager.extend('mongo')
    }
    expect(fn).to.throw(NE.InvalidArgumentException, /Make sure to provide the extend type name, type and body/)
  })

  it('should throw an error when extend type is not defined', function () {
    const fn = function () {
      return AuthManager.extend('mongo', function () {})
    }
    expect(fn).to.throw(NE.InvalidArgumentException, /Make sure to provide the extend type name, type and body/)
  })

  it('should throw an error when extend type is not a serializer or authenticator', function () {
    const fn = function () {
      return AuthManager.extend('mongo', function () {}, 'foo')
    }
    expect(fn).to.throw(NE.InvalidArgumentException, /When extending Auth provider, type must be a serializer or an scheme/)
  })

  it('should add and make use of a custom serializer', function () {
    class Mongo {}
    AuthManager.extend('mongo', new Mongo(), 'serializer')
    const auth = new AuthManager(Config, {})
    const serializer = auth._getSerializer('mongo')
    expect(serializer.constructor.name).to.equal('Mongo')
    expect(serializer instanceof Mongo).to.equal(true)
  })

  it('should add and make use of a custom scheme', function () {
    class OAuth {}
    AuthManager.extend('oauth', OAuth, 'scheme')
    const auth = new AuthManager(Config, {})
    const authenticator = auth._getAuthenticator('myauth')
    expect(authenticator.constructor.name).to.equal('OAuth')
    expect(authenticator instanceof OAuth).to.equal(true)
  })
})
