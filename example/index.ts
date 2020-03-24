import { User } from './models'
import { AuthConfig, AuthContract, LucidAuthenticatable, DatabaseAuthenticatable } from '@ioc:Adonis/Addons/Auth'

export const config: AuthConfig = {
  session: {
    driver: 'session',
    provider: {
      driver: 'lucid',
      model: User,
      identifierKey: 'id',
      uids: ['email'],
      authenticatable: LucidAuthenticatable,
    },
  },
  sessionDb: {
    driver: 'session',
    provider: {
      driver: 'database',
      usersTable: 'users',
      identifierKey: 'id',
      uids: ['email'],
      authenticatable: DatabaseAuthenticatable,
    },
  },
}

const a = {} as AuthContract

a.use('session').provider
a.use('session').verifyCredentials('asd', 'sda').then(() => {
})
