/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import 'reflect-metadata'
import { DateTime } from 'luxon'
import { randomString } from '@poppinss/utils'
import { ApplicationContract } from '@ioc:Adonis/Core/Application'

import { setupApplication, cleanup, setup, reset, getTokensRedisProvider } from '../../test-helpers'
let app: ApplicationContract

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

test.group('Database Token Provider', (group) => {
	group.before(async () => {
		app = await setupApplication()
		await setup(app)
	})

	group.after(async () => {
		await cleanup(app)
		await app.container.use('Adonis/Addons/Redis').flushdb()
	})

	group.afterEach(async () => {
		await reset(app)
	})

	test('save token to the database', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ days: 2 }),
		})

		assert.exists(tokenId)
		const tokenRow = JSON.parse((await redis.get(tokenId))!)
		assert.deepEqual(tokenRow, {
			user_id: '1',
			name: 'Auth token',
			token,
			type: 'api_token',
		})

		let expiry = await redis.ttl(tokenId)
		assert.isBelow(expiry, 2 * 24 * 3600 + 1)
	})

	test('read token from the database', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ days: 2 }),
		})

		assert.exists(tokenId)
		const tokenRow = await provider.read(tokenId, token)
		assert.equal(tokenRow!.name, 'Auth token')
		assert.equal(tokenRow!.tokenHash, token)
		assert.equal(tokenRow!.type, 'api_token')
	})

	test('return null when there is a token hash mis-match', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ minutes: 30 }),
		})

		assert.isNull(await provider.read(tokenId, 'foo'))
	})

	test('return null when token has been expired', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ seconds: 1 }),
		})

		await sleep(2000)
		assert.isNull(await provider.read(tokenId, token))
	}).timeout(3000)

	test('work fine when token has no expiry', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
		})

		await sleep(2000)
		assert.isNotNull(await provider.read(tokenId, token))

		let expiry = await redis.ttl(tokenId)
		assert.equal(expiry, -1)
	}).timeout(3000)

	test('return null when token is missing', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ seconds: 1 }),
		})

		assert.isNull(await provider.read(tokenId + 1, token))
	})

	test('delete token from the database', async (assert) => {
		const token = randomString(40)
		const redis = app.container.use('Adonis/Addons/Redis')
		const provider = getTokensRedisProvider(redis)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ seconds: 1 }),
		})

		await provider.destroy(tokenId)
		const tokenRow = await redis.get(tokenId)
		assert.isNull(tokenRow)
	})
})
