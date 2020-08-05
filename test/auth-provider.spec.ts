/*
 * @adonisjs/session
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import test from 'japa'
import { join } from 'path'
import { Registrar, Ioc } from '@adonisjs/fold'
import { Application } from '@adonisjs/application/build/standalone'
import { AuthManager } from '../src/AuthManager'

test.group('Auth Provider', () => {
	test('register auth provider', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Application', () => {
			return new Application(join(__dirname, 'fixtures'), ioc, {}, {})
		})

		await new Registrar(ioc, join(__dirname, '..'))
			.useProviders(['@adonisjs/core', './providers/AuthProvider'])
			.registerAndBoot()

		assert.instanceOf(ioc.use('Adonis/Addons/Auth'), AuthManager)
	})

	test('define auth property on http context', async (assert) => {
		const ioc = new Ioc()
		ioc.bind('Adonis/Core/Application', () => {
			return new Application(join(__dirname, 'fixtures'), ioc, {}, {})
		})

		await new Registrar(ioc, join(__dirname, '..'))
			.useProviders(['@adonisjs/core', './providers/AuthProvider'])
			.registerAndBoot()

		assert.isTrue(ioc.use('Adonis/Core/HttpContext').hasGetter('auth'))
	})
})
