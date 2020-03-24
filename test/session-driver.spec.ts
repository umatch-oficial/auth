/*
* @adonisjs/auth
*
* (c) Harminder Virk <virk@adonisjs.com>
*
* For the full copyright and license information, please view the LICENSE
* file that was distributed with this source code.
*/

import test from 'japa'
import { JWS } from 'jose'
import supertest from 'supertest'
import { createServer } from 'http'
import { parse, pack } from '@poppinss/cookie'
import cookieParser from 'set-cookie-parser'
import { Store } from '@adonisjs/session/build/src/Store'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'
import {
  hash,
  setup,
  reset,
  getDb,
  secret,
  getCtx,
  emitter,
  cleanup,
  getModel,
  getUserModel,
  getSessionDriver,
  getLucidProvider,
  getLucidProviderConfig,
} from '../test-helpers'

let db: DatabaseContract
let BaseModel: ReturnType<typeof getModel>

test.group('Session Driver | Verify Credentials', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('return error when unable to lookup user', async (assert) => {
    assert.plan(1)

    const User = getUserModel(BaseModel)
    const lucidProvider = getLucidProvider({ model: User })
    const ctx = getCtx()
    const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

    try {
      await sessionDriver.verifyCredentials('virk@adonisjs.com', 'password')
    } catch (error) {
      assert.deepEqual(error.message, 'E_INVALID_AUTH_UID: Invalid username or email')
    }
  })

  test('return error when password is incorrect', async (assert) => {
    assert.plan(1)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const ctx = getCtx()
    const lucidProvider = getLucidProvider({ model: User })
    const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

    try {
      await sessionDriver.verifyCredentials('virk@adonisjs.com', 'password')
    } catch (error) {
      assert.deepEqual(error.message, 'E_INVALID_AUTH_PASSWORD: Password mis-match')
    }
  })

  test('return user when able to verify credentials', async (assert) => {
    assert.plan(1)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const ctx = getCtx()
    const lucidProvider = getLucidProvider({ model: User })
    const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

    const user = await sessionDriver.verifyCredentials('virk@adonisjs.com', 'secret')
    assert.instanceOf(user, User)
  })
})

test.group('Session Driver | attempt', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('login user by setting the session', async (assert) => {
    assert.plan(4)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })
    emitter.once('auth:session:login', ([mapping, user, _, token]) => {
      assert.equal(mapping, 'session')
      assert.instanceOf(user, User)
      assert.isNull(token)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)

      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)
      await sessionDriver.attempt('virk@adonisjs.com', 'secret')
      ctx.response.send({})

      await ctx.session.commit()
      ctx.response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const sessionCookie = parse(headers['set-cookie'][2].split(';')[0], secret)
    const sessionValueCookie = parse(headers['set-cookie'][3].split(';')[0], secret)

    const sessionValue = sessionValueCookie.signedCookies[sessionCookie.signedCookies['adonis-session']]
    assert.deepEqual(new Store(sessionValue).all(), { auth_session: 1 })
  })

  test('define remember me cookie when remember me is set to true', async (assert) => {
    assert.plan(5)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:login', ([mapping, user, _, token]) => {
      assert.equal(mapping, 'session')
      assert.instanceOf(user, User)
      assert.exists(token)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)

      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)
      await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
      ctx.response.send({})

      await ctx.session.commit()
      ctx.response.finish()
    })

    const { headers } = await supertest(server).get('/')
    const rememberMeCookie = parse(headers['set-cookie'][0].split(';')[0], secret)
    const sessionCookie = parse(headers['set-cookie'][2].split(';')[0], secret)
    const sessionValueCookie = parse(headers['set-cookie'][3].split(';')[0], secret)

    const sessionValue = sessionValueCookie.signedCookies[sessionCookie.signedCookies['adonis-session']]
    const { token } = JWS.verify(rememberMeCookie.signedCookies.remember_session, secret) as { token: string }
    await user.refresh()

    assert.deepEqual(new Store(sessionValue).all(), { auth_session: 1 })
    assert.equal(user.rememberMeToken!, token)
  })

  test('delete remember_me cookie explicitly when login with remember me is false', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)

      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)
      await sessionDriver.attempt('virk@adonisjs.com', 'secret')
      await ctx.session.commit()
      ctx.response.finish()
    })

    const rememberMeCookie = pack('1234', secret)
    const { headers } = await supertest(server).get('/').set('cookie', `remember_me=${rememberMeCookie}`)
    const sessionCookie = parse(headers['set-cookie'][2].split(';')[0], secret)
    const sessionValueCookie = parse(headers['set-cookie'][3].split(';')[0], secret)

    const sessionValue = sessionValueCookie.signedCookies[sessionCookie.signedCookies['adonis-session']]
    assert.deepEqual(new Store(sessionValue).all(), { auth_session: 1 })
    assert.equal(headers['set-cookie'][0].split(';')[0], 'remember_session=')
  })
})

test.group('Session Driver | authenticate', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('authenticate user session and load user from db', async (assert) => {
    assert.plan(9)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:authenticate', ([mapping, user, _, viaRemember]) => {
      assert.equal(mapping, 'session')
      assert.instanceOf(user, User)
      assert.isFalse(viaRemember)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret')
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.authenticate()
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          viaRemember: sessionDriver.viaRemember,
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    const cookies = cookieParser(headers['set-cookie'])
    const reqCookies = cookies
      .filter((cookie) => cookie.maxAge > 0)
      .map((cookie) => `${cookie.name}=${cookie.value};`)

    const { body, headers: authHeaders } = await supertest(server).get('/').set('cookie', reqCookies)

    assert.deepEqual(authHeaders['set-cookie'], headers['set-cookie'].splice(2, 2))
    assert.equal(body.user.id, 1)
    assert.equal(body.user.username, 'virk')
    assert.equal(body.user.email, 'virk@adonisjs.com')
    assert.isTrue(body.isAuthenticated)
    assert.isFalse(body.viaRemember)
  })

  test('re-login user using remember me token', async (assert) => {
    assert.plan(8)

    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    emitter.once('auth:session:authenticate', ([mapping, user, _, viaRemember]) => {
      assert.equal(mapping, 'session')
      assert.instanceOf(user, User)
      assert.isTrue(viaRemember)
    })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.authenticate()
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          viaRemember: sessionDriver.viaRemember,
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    const cookies = cookieParser(headers['set-cookie'])

    const reqCookies = `${cookies[0].name}=${cookies[0].value};`
    const { body } = await supertest(server).get('/').set('cookie', reqCookies)
    assert.equal(body.user.id, 1)
    assert.equal(body.user.username, 'virk')
    assert.equal(body.user.email, 'virk@adonisjs.com')
    assert.isTrue(body.isAuthenticated)
    assert.isTrue(body.viaRemember)
  })
})

test.group('Session Driver | logout', (group) => {
  group.before(async () => {
    db = await getDb()
    BaseModel = getModel(db)
    await setup(db)
  })

  group.after(async () => {
    await cleanup(db)
  })

  group.afterEach(async () => {
    await reset(db)
  })

  test('logout the user by clearing up the session and removing remember_me cookie', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.logout()
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          isLoggedOut: sessionDriver.isLoggedOut
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    await user.refresh()

    const initialToken = user.rememberMeToken
    const cookies = cookieParser(headers['set-cookie'])
    const reqCookies = cookies
      .filter((cookie) => cookie.maxAge > 0)
      .map((cookie) => `${cookie.name}=${cookie.value};`)

    const { body, headers: authHeaders } = await supertest(server).get('/').set('cookie', reqCookies)
    const rememberMeCookie = authHeaders['set-cookie'][0].split(';')[0]
    const sessionCookie = parse(authHeaders['set-cookie'][1].split(';')[0], secret)
    const sessionValueCookie = authHeaders['set-cookie'][2].split(';')[0]

    assert.equal(rememberMeCookie, 'remember_session=')
    assert.equal(sessionValueCookie, `${sessionCookie.signedCookies['adonis-session']}=`)
    assert.isNull(body.user)
    assert.isFalse(body.isAuthenticated)
    assert.isTrue(body.isLoggedOut)

    await user.refresh()
    assert.equal(user.rememberMeToken, initialToken)
  })

  test('logout and recycle user remember me token', async (assert) => {
    const User = getUserModel(BaseModel)
    const password = await hash.hash('secret')
    const user = await User.create({ username: 'virk', email: 'virk@adonisjs.com', password })

    const server = createServer(async (req, res) => {
      const ctx = getCtx(req, res)
      await ctx.session.initiate(false)
      const lucidProvider = getLucidProvider({ model: User })
      const sessionDriver = getSessionDriver(lucidProvider, getLucidProviderConfig({ model: User }), ctx)

      if (req.url === '/login') {
        await sessionDriver.attempt('virk@adonisjs.com', 'secret', true)
        await ctx.session.commit()
        ctx.response.finish()
      } else {
        await sessionDriver.logout(true)
        ctx.response.send({
          user: sessionDriver.user,
          isAuthenticated: sessionDriver.isAuthenticated,
          isLoggedOut: sessionDriver.isLoggedOut
        })
        await ctx.session.commit()
        ctx.response.finish()
      }
    })

    const { headers } = await supertest(server).get('/login')
    await user.refresh()

    const initialToken = user.rememberMeToken
    const cookies = cookieParser(headers['set-cookie'])
    const reqCookies = cookies
      .filter((cookie) => cookie.maxAge > 0)
      .map((cookie) => `${cookie.name}=${cookie.value};`)

    const { body, headers: authHeaders } = await supertest(server).get('/').set('cookie', reqCookies)

    const rememberMeCookie = authHeaders['set-cookie'][0].split(';')[0]
    const sessionCookie = parse(authHeaders['set-cookie'][1].split(';')[0], secret)
    const sessionValueCookie = authHeaders['set-cookie'][2].split(';')[0]

    assert.equal(rememberMeCookie, 'remember_session=')
    assert.equal(sessionValueCookie, `${sessionCookie.signedCookies['adonis-session']}=`)
    assert.isNull(body.user)
    assert.isFalse(body.isAuthenticated)
    assert.isTrue(body.isLoggedOut)

    await user.refresh()
    assert.notEqual(user.rememberMeToken, initialToken)
  })
})
