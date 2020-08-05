/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import supertest from 'supertest'
import { createServer } from 'http'
import { base64 } from '@poppinss/utils'
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import {
	hash,
	setup,
	reset,
	getDb,
	getCtx,
	emitter,
	cleanup,
	getModel,
	getUserModel,
	getLucidProvider,
	getBasicAuthGuard,
	getLucidProviderConfig,
} from '../../test-helpers'

let db: DatabaseContract
let BaseModel: ReturnType<typeof getModel>

test.group('Basic Auth Guard | authenticate', (group) => {
	group.before(async () => {
		db = await getDb()
		BaseModel = getModel(db)
		await setup(db)
	})

	group.after(async () => {
		await cleanup(db)
	})

	group.afterEach(async () => {
		emitter.clearAllListeners()
		await reset(db)
	})

	test('authenticate request by reading the basic auth credentials', async (assert) => {
		assert.plan(7)

		const User = getUserModel(BaseModel)
		const user = await User.create({
			username: 'virk',
			email: 'virk@adonisjs.com',
			password: await hash.make('secret'),
		})

		const credentials = base64.encode(`${user.email}:secret`)

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', ({ name, user: model }) => {
			assert.equal(name, 'basic')
			assert.instanceOf(model, User)
		})

		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { body } = await supertest(server)
			.get('/')
			.set('Authorization', `Basic ${credentials}`)
			.expect(200)

		assert.isTrue(body.authenticationAttempted)
		assert.isTrue(body.isAuthenticated)
		assert.isFalse(body.isGuest)
		assert.isTrue(body.isLoggedIn)
		assert.property(body, 'user')
	})

	test('raise error when Authorization header is missing', async (assert) => {
		const User = getUserModel(BaseModel)

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', () => {
			throw new Error('Not expected to be invoked')
		})

		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { header } = await supertest(server).get('/').expect(401)
		assert.deepEqual(header['www-authenticate'], 'Basic realm="Login", charset="UTF-8"')
	})

	test('raise error when type is not basic', async (assert) => {
		const User = getUserModel(BaseModel)
		const user = await User.create({
			username: 'virk',
			email: 'virk@adonisjs.com',
			password: await hash.make('secret'),
		})

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', () => {
			throw new Error('Not expected to be invoked')
		})

		const credentials = base64.encode(`${user.email}:secret`)
		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { header } = await supertest(server)
			.get('/')
			.set('Authorization', `Foo ${credentials}`)
			.expect(401)

		assert.deepEqual(header['www-authenticate'], 'Basic realm="Login", charset="UTF-8"')
	})

	test('raise error when credentials are not base64 encoded', async (assert) => {
		const User = getUserModel(BaseModel)
		const user = await User.create({
			username: 'virk',
			email: 'virk@adonisjs.com',
			password: await hash.make('secret'),
		})

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', () => {
			throw new Error('Not expected to be invoked')
		})

		const credentials = `${user.email}:secret`
		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { header } = await supertest(server)
			.get('/')
			.set('Authorization', `Foo ${credentials}`)
			.expect(401)

		assert.deepEqual(header['www-authenticate'], 'Basic realm="Login", charset="UTF-8"')
	})

	test('raise error when credentials are not separated using colon', async (assert) => {
		const User = getUserModel(BaseModel)
		const user = await User.create({
			username: 'virk',
			email: 'virk@adonisjs.com',
			password: await hash.make('secret'),
		})

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', () => {
			throw new Error('Not expected to be invoked')
		})

		const credentials = base64.encode(`${user.email}_secret`)
		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { header } = await supertest(server)
			.get('/')
			.set('Authorization', `Foo ${credentials}`)
			.expect(401)

		assert.deepEqual(header['www-authenticate'], 'Basic realm="Login", charset="UTF-8"')
	})

	test('raise error when uid is incorrect', async (assert) => {
		const User = getUserModel(BaseModel)

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', () => {
			throw new Error('Not expected to be invoked')
		})

		const credentials = base64.encode(`foo:secret`)
		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { header } = await supertest(server)
			.get('/')
			.set('Authorization', `Foo ${credentials}`)
			.expect(401)

		assert.deepEqual(header['www-authenticate'], 'Basic realm="Login", charset="UTF-8"')
	})

	test('raise error when password is incorrect', async (assert) => {
		const User = getUserModel(BaseModel)
		const user = await User.create({
			username: 'virk',
			email: 'virk@adonisjs.com',
			password: await hash.make('secret'),
		})

		/**
		 * Assert the event is fired with correct set of arguments
		 */
		emitter.once('adonis:basic:authenticate', () => {
			throw new Error('Not expected to be invoked')
		})

		const credentials = base64.encode(`${user.email}:helloworld`)
		const server = createServer(async (req, res) => {
			const ctx = getCtx(req, res)
			const basicAuth = getBasicAuthGuard(
				getLucidProvider({ model: User }),
				getLucidProviderConfig({ model: User }),
				ctx
			)

			try {
				await basicAuth.authenticate()
				ctx.response.send(basicAuth.toJSON())
			} catch (error) {
				await error.handle(error, { ...ctx, auth: { use: () => basicAuth } as any })
			}

			ctx.response.finish()
		})

		const { header } = await supertest(server)
			.get('/')
			.set('Authorization', `Foo ${credentials}`)
			.expect(401)

		assert.deepEqual(header['www-authenticate'], 'Basic realm="Login", charset="UTF-8"')
	})
})
