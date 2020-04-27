import { User } from './models'
import { AuthConfig, AuthContract } from '@ioc:Adonis/Addons/Auth'

export const config: AuthConfig = {
  guard: 'session',
  list: {
    session: {
      loginRoute: '/login',
      driver: 'session',
      provider: {
        driver: 'lucid',
        model: User,
        identifierKey: 'id',
        uids: ['email'],
      },
    },
    sessionDb: {
      loginRoute: '/login',
      driver: 'session',
      provider: {
        driver: 'database',
        usersTable: 'users',
        identifierKey: 'id',
        uids: ['email'],
      },
    },
  },
}

const a = {} as AuthContract
a.check().then((state) => {
  state
})
