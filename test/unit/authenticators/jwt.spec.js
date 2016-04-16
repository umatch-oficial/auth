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
const jwt = require('jsonwebtoken')
const JwtAuthenticator = require('../../../src/Authenticators').jwt
const LucidSerializer = require('../../../src/Serializers').Lucid
const sinon = require('sinon-es6')
require('co-mocha')

const Config = function (model) {
  return {
    serializer: 'Lucid',
    model: model,
    scheme: 'jwt',
    secret: 'bubblegum'
  }
}

const request = {
  header: function () {
    return null
  },
  input: function () {}
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

  context('Jwt', function () {
    it('should return false when request does not have authorization header set', function * () {
      class User extends Model {
      }
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const isLoggedIn = yield jwtAuth.check()
      expect(isLoggedIn).to.equal(false)
    })

    it('should return false when request has authorization header set but value is not a valid jwt token', function * () {
      class User extends Model {
      }
      const request = {
        header: function () {
          return 'Bearer foo'
        }
      }
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const isLoggedIn = yield jwtAuth.check()
      expect(isLoggedIn).to.equal(false)
    })

    it('should return false when request has valid jwt token but user does not exists', function * () {
      class User extends Model {
        static * find () {
          return null
        }
      }
      const request = {
        header: function () {
          return 'Bearer ' + jwt.sign({payload: 1}, Config(User).secret)
        }
      }
      sinon.spy(User, 'find')
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const isLoggedIn = yield jwtAuth.check()
      expect(isLoggedIn).to.equal(false)
      expect(User.find.calledOnce).to.equal(true)
      expect(User.find.calledWith(1)).to.equal(true)
      User.find.restore()
    })

    it('should return true when request has valid jwt token and serializer returns user', function * () {
      class User extends Model {
        static * find (id) {
          return {
            id: id
          }
        }
      }
      const request = {
        header: function () {
          return 'Bearer ' + jwt.sign({payload: 1}, Config(User).secret)
        }
      }
      sinon.spy(User, 'find')
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const isLoggedIn = yield jwtAuth.check()
      expect(isLoggedIn).to.equal(true)
      expect(User.find.calledOnce).to.equal(true)
      expect(User.find.calledWith(1)).to.equal(true)
      expect(jwtAuth.user).deep.equal({id: 1})
      User.find.restore()
    })

    it('should return true when request has valid jwt token as a query string and serializer returns user', function * () {
      class User extends Model {
        static * find (id) {
          return {
            id: id
          }
        }
      }
      const request = {
        header: function () {
          return null
        },
        input: function () {
          return jwt.sign({payload: 1}, Config(User).secret)
        }
      }
      sinon.spy(User, 'find')
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const isLoggedIn = yield jwtAuth.check()
      expect(isLoggedIn).to.equal(true)
      expect(User.find.calledOnce).to.equal(true)
      expect(User.find.calledWith(1)).to.equal(true)
      expect(jwtAuth.user).deep.equal({id: 1})
      User.find.restore()
    })

    it('should return user if check is successful', function * () {
      class User extends Model {
        static * find (id) {
          return {
            id: id
          }
        }
      }
      const request = {
        header: function () {
          return 'Bearer ' + jwt.sign({payload: 1}, Config(User).secret)
        }
      }
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const user = yield jwtAuth.getUser()
      expect(user).deep.equal({id: 1})
    })

    it('should be able to generate a token for a given user', function * () {
      class User {
        static get primaryKey () {
          return 'id'
        }
      }
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const token = yield jwtAuth.generate({id: 1})
      expect(jwt.verify(token, Config(User).secret).payload).to.equal(1)
    })

    it('should be able to define issuer while generating a token', function * () {
      class User {
        static get primaryKey () {
          return 'id'
        }
      }
      const jwtAuth = new JwtAuthenticator(request, this.serializer, Config(User))
      const token = yield jwtAuth.generate({id: 1}, {issuer: 'adonisjs.com'})
      const decoded = jwt.verify(token, Config(User).secret)
      expect(decoded.payload).to.equal(1)
      expect(decoded.iss).to.equal('adonisjs.com')
    })
  })
})
