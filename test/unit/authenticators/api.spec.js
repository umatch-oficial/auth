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
const ApiScheme = require('../../../src/Schemes').api
const LucidSerializer = require('../../../src/Serializers').Lucid
const sinon = require('sinon-es6')
require('co-mocha')

const Hash = {
  verify: function * () {}
}

const Config = function (model) {
  return {
    serializer: 'Lucid',
    model: model,
    scheme: 'jwt',
    secret: 'bubblegum'
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
  context('Api', function () {
    it('should be able to generate a token for a given user', function * () {
      class Token extends Model {
        constructor (values) {
          super()
          this.attributes = values
        }
      }
      class User {
        apiTokens () {
          return {
            save: function * (tokenModel) {
              return tokenModel
            }
          }
        }
      }
      const api = new ApiScheme({}, this.serializer, Config(Token))
      const apiToken = yield api.generate(new User())
      expect(apiToken).to.have.property('attributes')
      expect(apiToken.attributes).to.have.all.keys(['token', 'forever', 'expiry', 'is_revoked'])
      expect(apiToken.attributes.forever).to.equal(true)
    })

    it('should be able to generate a token with given expiry', function * () {
      class Token extends Model {
        constructor (values) {
          super()
          this.attributes = values
        }
      }
      class User {
        apiTokens () {
          return {
            save: function * (tokenModel) {
              return tokenModel
            }
          }
        }
      }
      const api = new ApiScheme({}, this.serializer, Config(Token))
      const apiToken = yield api.generate(new User(), '30m')
      expect(apiToken).to.have.property('attributes')
      expect(apiToken.attributes.forever).to.equal(false)
      expect(apiToken.attributes.expiry).to.be.a('date')
    })

    it('should revoke all the tokens for a given user', function * () {
      const apiTokens = {
        query: function () {
          return this
        },
        update: function * () {}
      }
      class Token extends Model {
      }
      class User {
        apiTokens () {
          return apiTokens
        }
      }
      const user = new User()
      sinon.spy(apiTokens, 'query')
      sinon.spy(apiTokens, 'update')
      const api = new ApiScheme({}, this.serializer, Config(Token))
      yield api.revokeAll(user)
      expect(apiTokens.query.calledOnce).to.equal(true)
      expect(apiTokens.update.calledOnce).to.equal(true)
      expect(apiTokens.update.calledWith('is_revoked', true)).to.equal(true)
      apiTokens.query.restore()
      apiTokens.update.restore()
    })

    it('should revoke given tokens for a given user', function * () {
      const apiTokens = {
        query: function () {
          return this
        },
        whereIn: function () {
          return this
        },
        update: function * () {}
      }
      class Token extends Model {
      }
      class User {
        apiTokens () {
          return apiTokens
        }
      }
      const user = new User()
      sinon.spy(apiTokens, 'query')
      sinon.spy(apiTokens, 'update')
      sinon.spy(apiTokens, 'whereIn')
      const api = new ApiScheme({}, this.serializer, Config(Token))
      yield api.revoke(user, [1, 2])
      expect(apiTokens.query.calledOnce).to.equal(true)
      expect(apiTokens.update.calledOnce).to.equal(true)
      expect(apiTokens.whereIn.calledOnce).to.equal(true)
      expect(apiTokens.whereIn.calledWith('token', [1, 2])).to.equal(true)
      apiTokens.query.restore()
      apiTokens.update.restore()
      apiTokens.whereIn.restore()
    })

    it('should revoke except given tokens for a given user', function * () {
      const apiTokens = {
        query: function () {
          return this
        },
        whereNotIn: function () {
          return this
        },
        update: function * () {}
      }
      class Token extends Model {
      }
      class User {
        apiTokens () {
          return apiTokens
        }
      }
      const user = new User()
      sinon.spy(apiTokens, 'query')
      sinon.spy(apiTokens, 'update')
      sinon.spy(apiTokens, 'whereNotIn')
      const api = new ApiScheme({}, this.serializer, Config(Token))
      yield api.revokeExcept(user, [1, 2])
      expect(apiTokens.query.calledOnce).to.equal(true)
      expect(apiTokens.update.calledOnce).to.equal(true)
      expect(apiTokens.whereNotIn.calledOnce).to.equal(true)
      expect(apiTokens.whereNotIn.calledWith('token', [1, 2])).to.equal(true)
      apiTokens.query.restore()
      apiTokens.update.restore()
      apiTokens.whereNotIn.restore()
    })

    it('should revoke given tokens for a given user', function * () {
      const apiTokens = {
        query: function () {
          return this
        },
        whereIn: function () {
          return this
        },
        update: function * () {}
      }
      class Token extends Model {
      }
      class User {
        apiTokens () {
          return apiTokens
        }
      }
      const user = new User()
      sinon.spy(apiTokens, 'query')
      sinon.spy(apiTokens, 'update')
      sinon.spy(apiTokens, 'whereIn')
      const api = new ApiScheme({}, this.serializer, Config(Token))
      yield api.revoke(user, [1, 2])
      expect(apiTokens.query.calledOnce).to.equal(true)
      expect(apiTokens.update.calledOnce).to.equal(true)
      expect(apiTokens.whereIn.calledOnce).to.equal(true)
      expect(apiTokens.whereIn.calledWith('token', [1, 2])).to.equal(true)
      apiTokens.query.restore()
      apiTokens.update.restore()
      apiTokens.whereIn.restore()
    })

    it('should revoke all tokens except given tokens for a given user', function * () {
      const apiTokens = {
        query: function () {
          return this
        },
        whereNotIn: function () {
          return this
        },
        update: function * () {}
      }
      class Token extends Model {
      }
      class User {
        apiTokens () {
          return apiTokens
        }
      }
      const user = new User()
      sinon.spy(apiTokens, 'query')
      sinon.spy(apiTokens, 'update')
      sinon.spy(apiTokens, 'whereNotIn')
      const api = new ApiScheme({}, this.serializer, Config(Token))
      yield api.revokeExcept(user, [1, 2])
      expect(apiTokens.query.calledOnce).to.equal(true)
      expect(apiTokens.update.calledOnce).to.equal(true)
      expect(apiTokens.whereNotIn.calledOnce).to.equal(true)
      expect(apiTokens.whereNotIn.calledWith('token', [1, 2])).to.equal(true)
      apiTokens.query.restore()
      apiTokens.update.restore()
      apiTokens.whereNotIn.restore()
    })

    it('should return false when the token is not specified in the request', function * () {
      class Token extends Model {
      }
      const request = {
        header: function () {
          return null
        },
        input: function () {}
      }
      const apiAuth = new ApiScheme(request, this.serializer, Config(Token))
      const isLoggedIn = yield apiAuth.check()
      expect(isLoggedIn).to.equal(false)
    })

    it('should return false when the token is defined but invalid', function * () {
      class Token extends Model {
        static query () {
          return this
        }
        static where () {
          return this
        }
        static andWhere () {
          return this
        }
        static with () {
          return this
        }
        static * first () {}
      }
      const request = {
        header: function () {
          return 'Bearer 123'
        },
        input: function () {}
      }
      sinon.spy(Token, 'query')
      sinon.spy(Token, 'where')
      sinon.spy(Token, 'andWhere')
      sinon.spy(Token, 'with')
      sinon.spy(Token, 'first')
      const apiAuth = new ApiScheme(request, this.serializer, Config(Token))
      const isLoggedIn = yield apiAuth.check()
      expect(isLoggedIn).to.equal(false)
      expect(Token.query.calledOnce).to.equal(true)
      expect(Token.where.calledOnce).to.equal(true)
      expect(Token.where.calledWith('token', '123')).to.equal(true)
      expect(Token.andWhere.calledOnce).to.equal(true)
      expect(Token.andWhere.calledWith('is_revoked', false)).to.equal(true)
      expect(Token.with.calledOnce).to.equal(true)
      expect(Token.with.calledWith('user')).to.equal(true)
      expect(Token.first.calledOnce).to.equal(true)
    })

    it('should return false when the token is found but is expired', function * () {
      const matchingRecord = {
        forever: false,
        get: function () {
          return 'user'
        },
        toJSON: function () {
          return {
            expiry: new Date(1)
          }
        }
      }

      class Token extends Model {
        static query () {
          return this
        }
        static where () {
          return this
        }
        static andWhere () {
          return this
        }
        static with () {
          return this
        }
        static * first () {
          return matchingRecord
        }
      }
      const request = {
        header: function () {
          return 'Bearer 123'
        },
        input: function () {}
      }
      sinon.spy(matchingRecord, 'toJSON')
      const apiAuth = new ApiScheme(request, this.serializer, Config(Token))
      const isLoggedIn = yield apiAuth.check()
      expect(isLoggedIn).to.equal(false)
      expect(matchingRecord.toJSON.calledOnce).to.equal(true)
      matchingRecord.toJSON.restore()
    })

    it('should return true when a valid token is passed', function * () {
      const futureDate = new Date(new Date().setDate(new Date().getDate() + 1))
      const matchingRecord = {
        forever: false,
        get: function () {
          return 'user'
        },
        toJSON: function () {
          return {
            expiry: futureDate
          }
        }
      }

      class Token extends Model {
        static query () {
          return this
        }
        static where () {
          return this
        }
        static andWhere () {
          return this
        }
        static with () {
          return this
        }
        static * first () {
          return matchingRecord
        }
      }
      const request = {
        header: function () {
          return 'Bearer 123'
        },
        input: function () {}
      }
      sinon.spy(matchingRecord, 'toJSON')
      const apiAuth = new ApiScheme(request, this.serializer, Config(Token))
      const isLoggedIn = yield apiAuth.check()
      expect(isLoggedIn).to.equal(true)
      expect(matchingRecord.toJSON.calledOnce).to.equal(true)
      matchingRecord.toJSON.restore()
      expect(apiAuth.user).to.equal('user')
    })
  })
})
