import { BaseModel } from '@ioc:Adonis/Lucid/Orm'

export class User extends BaseModel {
  public password: string
  public rememberMeToken: string
}
