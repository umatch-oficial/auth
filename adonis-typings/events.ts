/*
 * @adonisjs/auth
 *
 * (c) Harminder Virk <virk@adonisjs.com>
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

declare module '@ioc:Adonis/Core/Event' {
  import {
    ProvidersList,
    OATLoginEventData,
    SessionLoginEventData,
    OATAuthenticateEventData,
    SessionAuthenticateEventData,
    BasicAuthAuthenticateEventData,
  } from '@ioc:Adonis/Addons/Auth'

  export interface EventsList {
    'adonis:basic:authenticate': BasicAuthAuthenticateEventData<keyof ProvidersList>
    'adonis:session:login': SessionLoginEventData<keyof ProvidersList>
    'adonis:session:authenticate': SessionAuthenticateEventData<keyof ProvidersList>
    'adonis:api:authenticate': OATAuthenticateEventData<keyof ProvidersList>
    'adonis:api:login': OATLoginEventData<keyof ProvidersList>
  }
}
