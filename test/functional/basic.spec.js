'use strict'

/*
 * adonis-auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
*/

const { ioc } = require('@adonisjs/fold')
const test = require('japa')
const supertest = require('supertest')
const http = require('http')
const setup = require('./setup')
const groupSetup = require('../unit/setup')
const helpers = require('../unit/helpers')

test.group('Basic Auth', (group) => {
  groupSetup.databaseHook(group)
  groupSetup.hashHook(group)

  group.before(async () => {
    await setup()
  })

  group.beforeEach(() => {
    this.server = http.createServer()
  })

  test('return error when credentials are not passed', async (assert) => {
    this.server.on('request', (req, res) => {
      const Context = ioc.use('Adonis/Src/HttpContext')

      const ctx = new Context()
      ctx.request = helpers.getRequest(req)
      ctx.response = helpers.getResponse(req, res)
      ctx.session = helpers.getSession(req, res)

      ctx
        .auth
        .authenticator('basic')
        .check()
        .then((status) => {
          res.writeHead(200)
          res.write(String(status))
          res.end()
        })
        .catch(({ status, message }) => {
          res.writeHead(status || 500)
          res.write(message)
          res.end()
        })
    })

    const { text } = await supertest(this.server).get('/').expect(401)
    assert.equal(text, 'E_MISSING_AUTH_HEADER: Cannot parse or read Basic auth header')
  })

  test('return false when user doesn\'t exists', async (assert) => {
    this.server.on('request', (req, res) => {
      const Context = ioc.use('Adonis/Src/HttpContext')

      const ctx = new Context()
      ctx.request = helpers.getRequest(req)
      ctx.response = helpers.getResponse(req, res)
      ctx.session = helpers.getSession(req, res)

      ctx
        .auth
        .authenticator('basic')
        .check()
        .then((status) => {
          res.writeHead(200)
          res.write(String(status))
          res.end()
        })
        .catch(({ status, message }) => {
          res.writeHead(status || 500)
          res.write(message)
          res.end()
        })
    })

    const userCredentials = Buffer.from('foo@bar.com:secret').toString('base64')

    const { text } = await supertest(this.server)
      .get('/')
      .set('Authorization', `Basic ${userCredentials}`)
      .expect(401)

    assert.equal(text, 'E_USER_NOT_FOUND: Cannot find user with email as foo@bar.com')
  })

  test('return true when user does exists', async (assert) => {
    await ioc.use('App/Models/User').create({ email: 'foo@bar.com', password: 'secret' })

    this.server.on('request', (req, res) => {
      const Context = ioc.use('Adonis/Src/HttpContext')

      const ctx = new Context()
      ctx.request = helpers.getRequest(req)
      ctx.response = helpers.getResponse(req, res)
      ctx.session = helpers.getSession(req, res)

      ctx
        .auth
        .authenticator('basic')
        .check()
        .then((status) => {
          res.writeHead(200)
          res.write(String(status))
          res.end()
        })
        .catch(({ status, message }) => {
          console.log(message)
          res.writeHead(status || 500)
          res.write(message)
          res.end()
        })
    })

    const userCredentials = Buffer.from('foo@bar.com:secret').toString('base64')

    const { text } = await supertest(this.server)
      .get('/')
      .set('Authorization', `Basic ${userCredentials}`)
      .expect(200)

    assert.equal(text, 'true')
  })

  test('set user property on auth instance', async (assert) => {
    await ioc.use('App/Models/User').create({ email: 'foo@bar.com', password: 'secret' })

    this.server.on('request', (req, res) => {
      const Context = ioc.use('Adonis/Src/HttpContext')

      const ctx = new Context()
      ctx.request = helpers.getRequest(req)
      ctx.response = helpers.getResponse(req, res)
      ctx.session = helpers.getSession(req, res)

      ctx
        .auth
        .authenticator('basic')
        .check()
        .then((status) => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(ctx.auth.authenticator('basic').user))
          res.end()
        })
        .catch(({ status, message }) => {
          console.log(message)
          res.writeHead(status || 500)
          res.write(message)
          res.end()
        })
    })

    const userCredentials = Buffer.from('foo@bar.com:secret').toString('base64')

    const { body } = await supertest(this.server)
      .get('/')
      .set('Authorization', `Basic ${userCredentials}`)
      .expect(200)

    assert.equal(body.id, 1)
    assert.equal(body.email, 'foo@bar.com')
    assert.equal(body.password, 'secret')
  })

  test('return same user when calling check twice', async (assert) => {
    await ioc.use('App/Models/User').create({ email: 'foo@bar.com', password: 'secret' })

    this.server.on('request', (req, res) => {
      const Context = ioc.use('Adonis/Src/HttpContext')

      const ctx = new Context()
      ctx.request = helpers.getRequest(req)
      ctx.response = helpers.getResponse(req, res)
      ctx.session = helpers.getSession(req, res)

      ctx
        .auth
        .authenticator('basic')
        .check()
        .then(() => {
          return ctx.auth.authenticator('basic').check()
        })
        .then(() => {
          res.writeHead(200, { 'content-type': 'application/json' })
          res.write(JSON.stringify(ctx.auth.authenticator('basic').user))
          res.end()
        })
        .catch(({ status, message }) => {
          console.log(message)
          res.writeHead(status || 500)
          res.write(message)
          res.end()
        })
    })

    const userCredentials = Buffer.from('foo@bar.com:secret').toString('base64')

    const { body } = await supertest(this.server)
      .get('/')
      .set('Authorization', `Basic ${userCredentials}`)
      .expect(200)

    assert.equal(body.id, 1)
    assert.equal(body.email, 'foo@bar.com')
    assert.equal(body.password, 'secret')
  })
})
