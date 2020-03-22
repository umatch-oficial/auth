declare module '@ioc:Adonis/Addons/Auth' {
  interface ProvidersList {
    lucid: {
      implementation: LucidProviderContract<any>,
      config: LucidProviderConfig<any>,
    },
    database: {
      config: DatabaseProviderConfig,
      implementation: DatabaseProviderContract<any>,
    },
  }
}

declare module '@ioc:Adonis/Core/Hash' {
  interface HashersList {
    bcrypt: {
      config: BcryptConfigContract,
      implementation: BcryptContract,
    }
  }
}
