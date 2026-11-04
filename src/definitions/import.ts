import type { Serializable } from '../types.js'

export class ImportDefinition implements Serializable {
  private readonly IMPORT_KEYWORD = 'import'

  constructor(private readonly val: string) {}

  serialize(): string {
    return `${this.IMPORT_KEYWORD} "${this.val}";`
  }
}
