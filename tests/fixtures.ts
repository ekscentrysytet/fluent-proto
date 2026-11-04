import { fluentProto } from '../src/fluent-proto.js'

/**
 * Google protobuf wrappers - simulates google.protobuf package
 */
export const googleProtobuf = fluentProto()
  .syntax('proto3')
  .package('google.protobuf')
  .message('StringValue', ({ f }) => ({
    value: f.string().idx(1),
  }))
  .message('Int32Value', ({ f }) => ({
    value: f.int('int32').idx(1),
  }))

/**
 * Common/shared package - simulates an external common definitions package
 */
export const commonPackage = fluentProto()
  .syntax('proto3')
  .package('common')
  .enum('Status', {
    UNKNOWN: 0,
    ACTIVE: 1,
    INACTIVE: 2,
  })
  .message('Metadata', ({ f }) => ({
    createdAt: f.string().idx(1),
    updatedAt: f.string().idx(2),
  }))
  .message('Response', ({ f }) => ({
    id: f.int('int32').idx(1),
    message: f.string().idx(2),
  }))

/**
 * Complex definition that imports from multiple packages
 * and uses various field types, refs, maps, and services
 */
export const complexDefinition = fluentProto()
  .syntax('proto3')
  .package('app')
  .import('google/protobuf/wrappers.proto', googleProtobuf)
  .import('common/types.proto', commonPackage)
  .enum('Priority', {
    LOW: 0,
    MEDIUM: 1,
    HIGH: 2,
  })
  .message('UserProfile', ({ f }) => ({
    id: f
      .string()
      .idx(1)
      .validate((s) => s.required()),
    name: f.string().idx(2),
    email: f.string().idx(3),
    age: f.int('int32').idx(4),
    balance: f.float('double').idx(5),
    isActive: f.bool().idx(6),
    priority: f.ref('Priority').idx(7),
    metadata: f.ref('common.Metadata').idx(8),
  }))
  .message('SearchRequest', ({ f }) => ({
    query: f.string().idx(1),
    limit: f
      .int('int32')
      .idx(2)
      .validate((s) => s.default(10)),
    offset: f.int('int32').idx(3),
    filters: f.map('string', 'string').idx(4),
    priorityFilter: f.map('string', 'Priority').idx(5),
    tags: f.string().repeated().idx(6),
    statuses: f.ref('common.Status').repeated().idx(7),
  }))
  .message('SearchResponse', ({ f }) => ({
    results: f.ref('UserProfile').repeated().idx(1),
    total: f.int('int64').idx(2),
    wrapper: f.ref('google.protobuf.StringValue').idx(3),
  }))
  .service('UserService', {
    search: {
      request: 'SearchRequest',
      response: 'SearchResponse',
    },
    getProfile: {
      request: 'google.protobuf.StringValue',
      response: 'UserProfile',
    },
  })

/**
 * Oneof definition - pure oneof (all fields in oneof)
 */
export const pureOneofDefinition = fluentProto()
  .syntax('proto3')
  .package('test')
  .message('Value', ({ oneof, f }) => ({
    kind: oneof({
      stringValue: f.string().idx(1),
      intValue: f.int('int64').idx(2),
      doubleValue: f.float('double').idx(3),
      boolValue: f.bool().idx(4),
    }),
  }))

/**
 * Mixed oneof definition - regular fields + oneof
 */
export const mixedOneofDefinition = fluentProto()
  .syntax('proto3')
  .package('test')
  .message('Event', ({ oneof, f }) => ({
    id: f.string().idx(1),
    timestamp: f.int('int64').idx(2),
    payload: oneof({
      textPayload: f.string().idx(3),
      jsonPayload: f.bytes().idx(4),
      numericPayload: f.float('double').idx(5),
    }),
  }))

/**
 * Definition with custom schema override
 */
export const customSchemaDefinition = fluentProto()
  .syntax('proto3')
  .package('test')
  .message(
    'StrictUser',
    ({ f }) => ({
      id: f.string().idx(1),
      email: f.string().idx(2),
      role: f.string().idx(3),
    }),
    {
      schema: (z) =>
        z
          .object({
            id: z.string().uuid(),
            email: z.string().email(),
            role: z.enum(['admin', 'user', 'guest']),
          })
          .strict(),
    },
  )

/**
 * Definition with reserved fields
 */
export const reservedFieldsDefinition = fluentProto()
  .syntax('proto3')
  .package('test')
  .message(
    'Versioned',
    ({ f }) => ({
      id: f.string().idx(1),
      name: f.string().idx(4),
    }),
    {
      reserved: [2, 3],
    },
  )
