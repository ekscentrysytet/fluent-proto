import type { Serializable } from '../types.js'

export class PackageDefinition implements Serializable {
  private readonly PACKAGE_KEYWORD = 'package'

  constructor(public readonly val: string) {}

  serialize(): string {
    return `${this.PACKAGE_KEYWORD} ${this.val};`
  }
}
