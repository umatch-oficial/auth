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
import { DatabaseContract } from '@ioc:Adonis/Lucid/Database'

import { getDb, cleanup, setup, reset, getTokensDbProvider } from '../../test-helpers'
let db: DatabaseContract

const sleep = (time: number) => new Promise((resolve) => setTimeout(resolve, time))

test.group('Database Token Provider', (group) => {
	group.before(async () => {
		db = await getDb()
		await setup(db)
	})

	group.after(async () => {
		await cleanup(db)
	})

	group.afterEach(async () => {
		await reset(db)
	})

	test('save token to the database', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local(),
		})

		assert.exists(tokenId)
	})

	test('read token from the database', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local().plus({ minutes: 30 }),
		})

		const tokenRow = await provider.read(tokenId, token)
		assert.equal(tokenRow!.name, 'Auth token')
		assert.equal(tokenRow!.tokenHash, token)
		assert.equal(tokenRow!.type, 'api_token')
		assert.exists(tokenRow!.expiresAt)
	})

	test('read null when there is a token hash mis-match', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local(),
		})

		assert.isNull(await provider.read(tokenId, 'foo'))
	})

	test('read null when token has been expired', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local(),
		})

		await sleep(1000)
		assert.isNull(await provider.read(tokenId, token))
	})

	test('work fine when token has no expiry', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
		})

		await sleep(1000)
		assert.isNotNull(await provider.read(tokenId, token))
	})

	test('read null when token is missing', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local(),
		})

		assert.isNull(await provider.read(tokenId + 1, token))
	})

	test('delete token from the database', async (assert) => {
		const token = randomString(40)
		const provider = getTokensDbProvider(db)

		const tokenId = await provider.write({
			name: 'Auth token',
			tokenHash: token,
			userId: '1',
			type: 'api_token',
			expiresAt: DateTime.local(),
		})

		await provider.destroy(tokenId)
		const tokens = await db.from('api_tokens').select('*')
		assert.lengthOf(tokens, 0)
	})
})
