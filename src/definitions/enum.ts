import type { Serializable } from '../types.js'
import { indent } from '../utils.js'

export type EnumSchema = Record<string, number>

export class EnumDefinition implements Serializable {
  private readonly ENUM_KEYWORD = 'enum'

  constructor(
    private readonly enumName: string,
    private readonly enumSchema: EnumSchema,
  ) {}

  private serializeFields(): string {
    return Object.entries(this.enumSchema)
      .map(([key, value]) => indent(`${key} = ${value};`))
      .join('\n')
  }

  serialize(): string {
    return [
      this.ENUM_KEYWORD,
      this.enumName,
      `{\n${this.serializeFields()}\n}`,
    ].join(' ')
  }
}
