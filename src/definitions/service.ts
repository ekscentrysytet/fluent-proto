import type { Serializable } from '../types.js'
import { indent } from '../utils.js'

type ServiceMethod<MessageNames extends string = string> = {
  request: MessageNames
  response: MessageNames
}

export type ServiceMethods<MessageNames extends string = string> = Record<
  string,
  ServiceMethod<MessageNames>
>

export class ServiceDefinition implements Serializable {
  private readonly SERVICE_KEYWORD = 'service'
  private readonly RPC_KEYWORD = 'rpc'
  private readonly RETURNS_KEYWORD = 'returns'

  constructor(
    public readonly serviceName: string,
    private readonly serviceMethods: ServiceMethods,
  ) {}

  private serializeMethod(name: string, definition: ServiceMethod): string {
    return [
      this.RPC_KEYWORD,
      name,
      `(${definition.request})`,
      this.RETURNS_KEYWORD,
      `(${definition.response})`,
      '{};',
    ].join(' ')
  }

  private serializeMethods(): string {
    return Object.entries(this.serviceMethods)
      .map(([methodName, methodDefinition]) =>
        indent(`${this.serializeMethod(methodName, methodDefinition)}`),
      )
      .join('\n')
  }

  serialize(): string {
    return [
      this.SERVICE_KEYWORD,
      this.serviceName,
      `{\n${this.serializeMethods()}\n}`,
    ].join(' ')
  }
}
