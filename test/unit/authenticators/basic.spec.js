'use strict'

/**
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

/* global it, describe, before, context */
const chai = require('chai')
const expect = chai.expect
const BasicAuthAuthenticator = require('../../../src/Authenticators').basic
const LucidSerializer = require('../../../src/Serializers').Lucid
const sinon = require('sinon-es6')
require('co-mocha')

const Config = function (model) {
  return {
    serializer: 'Lucid',
    model: model,
    scheme: 'session',
    uid: 'email',
    password: 'password'
  }
}

const request = {
  request: {
    headers: {
      authorization: 'a'
    }
  }
}

const Hash = {
  verify: function * (password, actualPassword) {
    return password === actualPassword
  }
}

class Model {
  static query () {
    return this
  }
  static where () {
    return this
  }
}

describe('Authenticators', function () {
  before(function () {
    this.serializer = new LucidSerializer(Hash)
  })

  context('Basic Auth', function () {
    it('should return false when request does not have basic auth headers set', function * () {
      class User extends Model {
      }
      const basicAuth = new BasicAuthAuthenticator(request, this.serializer, Config(User))
      const isLoggedIn = yield basicAuth.check()
      expect(isLoggedIn).to.equal(false)
    })

    it('should return false when request basic auth headers are invalid', function * () {
      class User extends Model {
        static * first () {
          return null
        }
      }
      sinon.spy(User, 'query')
      sinon.spy(User, 'where')
      sinon.spy(User, 'first')
      const altRequest = request
      altRequest.request.headers.authorization = 'Basic ' + new Buffer('foo@bar.com' + ':' + 'secret').toString('base64')
      const basicAuth = new BasicAuthAuthenticator(altRequest, this.serializer, Config(User))
      const isLoggedIn = yield basicAuth.check()
      expect(isLoggedIn).to.equal(false)
      expect(User.query.calledOnce).to.equal(true)
      expect(User.where.calledOnce).to.equal(true)
      expect(User.first.calledOnce).to.equal(true)
      expect(User.where.calledWith({ email: 'foo@bar.com' })).to.equal(true)
      expect(basicAuth.user).to.equal(null)
      User.query.restore()
      User.where.restore()
      User.first.restore()
    })

    it('should return false when request basic auth username is correct but password is invalid', function * () {
      class User extends Model {
        static * first () {
          return {
            password: '123'
          }
        }
      }
      sinon.spy(User, 'query')
      sinon.spy(User, 'where')
      sinon.spy(User, 'first')
      sinon.spy(Hash, 'verify')
      const altRequest = request
      altRequest.request.headers.authorization = 'Basic ' + new Buffer('foo@bar.com' + ':' + 'secret').toString('base64')
      const basicAuth = new BasicAuthAuthenticator(altRequest, this.serializer, Config(User))
      const isLoggedIn = yield basicAuth.check()
      expect(isLoggedIn).to.equal(false)
      expect(User.query.calledOnce).to.equal(true)
      expect(User.where.calledOnce).to.equal(true)
      expect(User.first.calledOnce).to.equal(true)
      expect(Hash.verify.calledOnce).to.equal(true)
      expect(Hash.verify.calledWith('secret', '123')).to.equal(true)
      expect(User.where.calledWith({ email: 'foo@bar.com' })).to.equal(true)
      expect(basicAuth.user).to.equal(null)
      User.query.restore()
      User.where.restore()
      User.first.restore()
      Hash.verify.restore()
    })

    it('should return true when serializer validates user credentials', function * () {
      class User extends Model {
        static * first () {
          return {
            password: 'secret'
          }
        }
      }
      sinon.spy(User, 'query')
      sinon.spy(User, 'where')
      sinon.spy(User, 'first')
      sinon.spy(Hash, 'verify')
      const altRequest = request
      altRequest.request.headers.authorization = 'Basic ' + new Buffer('foo@bar.com' + ':' + 'secret').toString('base64')
      const basicAuth = new BasicAuthAuthenticator(altRequest, this.serializer, Config(User))
      const isLoggedIn = yield basicAuth.check()
      expect(isLoggedIn).to.equal(true)
      expect(User.query.calledOnce).to.equal(true)
      expect(User.where.calledOnce).to.equal(true)
      expect(User.first.calledOnce).to.equal(true)
      expect(Hash.verify.calledOnce).to.equal(true)
      expect(Hash.verify.calledWith('secret', 'secret')).to.equal(true)
      expect(User.where.calledWith({ email: 'foo@bar.com' })).to.equal(true)
      expect(basicAuth.user).deep.equal({password: 'secret'})
      User.query.restore()
      User.where.restore()
      User.first.restore()
      Hash.verify.restore()
    })

    it('should return user if check is successfull', function * () {
      class User extends Model {
        static * first () {
          return {
            password: 'secret'
          }
        }
      }
      const altRequest = request
      altRequest.request.headers.authorization = 'Basic ' + new Buffer('foo@bar.com' + ':' + 'secret').toString('base64')
      const basicAuth = new BasicAuthAuthenticator(altRequest, this.serializer, Config(User))
      const user = yield basicAuth.getUser()
      expect(user).deep.equal({password: 'secret'})
    })
  })
})
