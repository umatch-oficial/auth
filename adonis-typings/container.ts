/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Application' {
  import { AuthManagerContract } from '@ioc:Adonis/Addons/Auth'
  export interface ContainerBindings {
    'Adonis/Addons/Auth': AuthManagerContract
  }
}
