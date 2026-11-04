import type { Serializable } from '../types.js'

export type SyntaxVersion = 'proto2' | 'proto3'

export class SyntaxDefinition implements Serializable {
  private readonly SYNTAX_KEYWORD = 'syntax'

  constructor(private readonly val: SyntaxVersion) {}

  serialize(): string {
    return `${this.SYNTAX_KEYWORD} = "${this.val}";`
  }
}
