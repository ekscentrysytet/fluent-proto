import { describe, it, expect } from 'vitest'
import { fluentProto } from '../src/fluent-proto.js'
import {
  commonPackage,
  complexDefinition,
  pureOneofDefinition,
  mixedOneofDefinition,
  customSchemaDefinition,
} from './fixtures.js'

describe('schemas', () => {
  describe('scalar types', () => {
    describe('string', () => {
      it('accepts valid string values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.string().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: 'hello' })
        expect(result.success).toBe(true)
      })

      it('accepts null for optional string', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.string().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: null })
        expect(result.success).toBe(true)
      })

      it('accepts undefined/missing for optional string', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.string().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({})
        expect(result.success).toBe(true)
      })

      it('rejects non-string values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.string().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: 123 })
        expect(result.success).toBe(false)
      })
    })

    describe('int32', () => {
      it('accepts valid int32 values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.int('int32').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: 42 })
        expect(result.success).toBe(true)
      })

      it('rejects non-number values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.int('int32').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          value: 'not a number',
        })
        expect(result.success).toBe(false)
      })
    })

    describe('int64', () => {
      it('accepts bigint values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.int('int64').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          value: BigInt(9007199254740991),
        })
        expect(result.success).toBe(true)
      })
    })

    describe('uint32', () => {
      it('accepts valid uint32 values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.int('uint32').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: 42 })
        expect(result.success).toBe(true)
      })
    })

    describe('uint64', () => {
      it('accepts bigint values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.int('uint64').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          value: BigInt(9007199254740991),
        })
        expect(result.success).toBe(true)
      })
    })

    describe('float', () => {
      it('accepts valid float values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.float('float').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: 3.14 })
        expect(result.success).toBe(true)
      })
    })

    describe('double', () => {
      it('accepts valid double values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.float('double').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          value: 3.141592653589793,
        })
        expect(result.success).toBe(true)
      })
    })

    describe('bool', () => {
      it('accepts boolean true', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.bool().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: true })
        expect(result.success).toBe(true)
      })

      it('accepts boolean false', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.bool().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: false })
        expect(result.success).toBe(true)
      })

      it('rejects non-boolean values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.bool().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ value: 'true' })
        expect(result.success).toBe(false)
      })
    })

    describe('bytes', () => {
      it('accepts any value for bytes field', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f.bytes().idx(1),
        }))

        // bytes maps to z.unknown() so accepts anything
        const result = definition.schemas.Test.safeParse({
          value: Buffer.from('hello'),
        })
        expect(result.success).toBe(true)
      })
    })
  })

  describe('complex types', () => {
    describe('ref to message', () => {
      it('accepts valid nested message', () => {
        const definition = fluentProto()
          .message('Inner', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Outer', ({ f }) => ({
            inner: f.ref('Inner').idx(1),
          }))

        const result = definition.schemas.Outer.safeParse({
          inner: { name: 'test' },
        })
        expect(result.success).toBe(true)
      })

      it('accepts null for optional ref', () => {
        const definition = fluentProto()
          .message('Inner', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Outer', ({ f }) => ({
            inner: f.ref('Inner').idx(1),
          }))

        const result = definition.schemas.Outer.safeParse({ inner: null })
        expect(result.success).toBe(true)
      })

      it('rejects invalid nested message structure', () => {
        const definition = fluentProto()
          .message('Inner', ({ f }) => ({
            name: f
              .string()
              .idx(1)
              .validate((s) => s.required()),
          }))
          .message('Outer', ({ f }) => ({
            inner: f
              .ref('Inner')
              .idx(1)
              .validate((s) => s.required()),
          }))

        const result = definition.schemas.Outer.safeParse({
          inner: { wrongField: 'test' },
        })
        expect(result.success).toBe(false)
      })
    })

    describe('ref to enum', () => {
      it('accepts valid enum value', () => {
        const definition = fluentProto()
          .enum('Status', { PENDING: 0, ACTIVE: 1 })
          .message('Test', ({ f }) => ({
            status: f.ref('Status').idx(1),
          }))

        const result = definition.schemas.Test.safeParse({ status: 'ACTIVE' })
        expect(result.success).toBe(true)
      })

      it('rejects invalid enum value', () => {
        const definition = fluentProto()
          .enum('Status', { PENDING: 0, ACTIVE: 1 })
          .message('Test', ({ f }) => ({
            status: f.ref('Status').idx(1),
          }))

        const result = definition.schemas.Test.safeParse({ status: 'INVALID' })
        expect(result.success).toBe(false)
      })
    })

    describe('ref to imported types', () => {
      it('resolves imported message references', () => {
        const result = complexDefinition.schemas.SearchResponse.safeParse({
          results: [{ id: 'user-1', name: 'Test User' }],
          total: BigInt(1),
        })
        expect(result.success).toBe(true)
      })

      it('resolves imported enum references', () => {
        const result = complexDefinition.schemas.SearchRequest.safeParse({
          statuses: ['ACTIVE', 'INACTIVE'],
        })
        expect(result.success).toBe(true)
      })
    })

    describe('map fields', () => {
      it('accepts valid map with primitive values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f.map('string', 'string').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          tags: { key1: 'value1', key2: 'value2' },
        })
        expect(result.success).toBe(true)
      })

      it('accepts empty map', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f.map('string', 'string').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ tags: {} })
        expect(result.success).toBe(true)
      })

      it('accepts map with int32 values', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          scores: f.map('string', 'int32').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          scores: { player1: 100, player2: 200 },
        })
        expect(result.success).toBe(true)
      })

      it('accepts map with enum values', () => {
        const definition = fluentProto()
          .enum('Priority', { LOW: 0, HIGH: 1 })
          .message('Test', ({ f }) => ({
            priorities: f.map('string', 'Priority').idx(1),
          }))

        const result = definition.schemas.Test.safeParse({
          priorities: { task1: 'HIGH', task2: 'LOW' },
        })
        expect(result.success).toBe(true)
      })

      it('accepts map with message values', () => {
        const definition = fluentProto()
          .message('Item', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Container', ({ f }) => ({
            items: f.map('string', 'Item').idx(1),
          }))

        const result = definition.schemas.Container.safeParse({
          items: { item1: { name: 'First' }, item2: { name: 'Second' } },
        })
        expect(result.success).toBe(true)
      })

      it('rejects map with wrong value type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          scores: f.map('string', 'int32').idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          scores: { player1: 'not a number' },
        })
        expect(result.success).toBe(false)
      })
    })

    describe('repeated fields', () => {
      it('accepts array of strings', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f.string().repeated().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          tags: ['tag1', 'tag2', 'tag3'],
        })
        expect(result.success).toBe(true)
      })

      it('accepts empty array', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f.string().repeated().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({ tags: [] })
        expect(result.success).toBe(true)
      })

      it('accepts array of messages', () => {
        const definition = fluentProto()
          .message('Item', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Container', ({ f }) => ({
            items: f.ref('Item').repeated().idx(1),
          }))

        const result = definition.schemas.Container.safeParse({
          items: [{ name: 'First' }, { name: 'Second' }],
        })
        expect(result.success).toBe(true)
      })

      it('accepts array of enum values', () => {
        const definition = fluentProto()
          .enum('Status', { PENDING: 0, DONE: 1 })
          .message('Task', ({ f }) => ({
            statuses: f.ref('Status').repeated().idx(1),
          }))

        const result = definition.schemas.Task.safeParse({
          statuses: ['PENDING', 'DONE'],
        })
        expect(result.success).toBe(true)
      })

      it('rejects non-array value', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f.string().repeated().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          tags: 'not an array',
        })
        expect(result.success).toBe(false)
      })

      it('rejects array with wrong element type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          numbers: f.int('int32').repeated().idx(1),
        }))

        const result = definition.schemas.Test.safeParse({
          numbers: ['not', 'numbers'],
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('modifiers and validation', () => {
    describe('required', () => {
      it('requires field when marked required', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          id: f
            .string()
            .idx(1)
            .validate((s) => s.required()),
        }))

        const result = definition.schemas.Test.safeParse({})
        expect(result.success).toBe(false)
      })

      it('rejects null for required field', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          id: f
            .string()
            .idx(1)
            .validate((s) => s.required()),
        }))

        const result = definition.schemas.Test.safeParse({ id: null })
        expect(result.success).toBe(false)
      })

      it('accepts value for required field', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          id: f
            .string()
            .idx(1)
            .validate((s) => s.required()),
        }))

        const result = definition.schemas.Test.safeParse({ id: 'abc' })
        expect(result.success).toBe(true)
      })
    })

    describe('default', () => {
      it('uses default value when field is missing', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          count: f
            .int('int32')
            .idx(1)
            .validate((s) => s.default(10)),
        }))

        const result = definition.schemas.Test.safeParse({})
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.count).toBe(10)
        }
      })

      it('uses provided value over default', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          count: f
            .int('int32')
            .idx(1)
            .validate((s) => s.default(10)),
        }))

        const result = definition.schemas.Test.safeParse({ count: 5 })
        expect(result.success).toBe(true)
        if (result.success) {
          expect(result.data.count).toBe(5)
        }
      })
    })

    describe('max/min constraints', () => {
      it('enforces max constraint on string', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          name: f
            .string()
            .idx(1)
            .validate((s) => s.max(5)),
        }))

        const tooLong = definition.schemas.Test.safeParse({ name: 'toolong' })
        expect(tooLong.success).toBe(false)

        const valid = definition.schemas.Test.safeParse({ name: 'hi' })
        expect(valid.success).toBe(true)
      })

      it('enforces min constraint on string', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          name: f
            .string()
            .idx(1)
            .validate((s) => s.min(3)),
        }))

        const tooShort = definition.schemas.Test.safeParse({ name: 'hi' })
        expect(tooShort.success).toBe(false)

        const valid = definition.schemas.Test.safeParse({ name: 'hello' })
        expect(valid.success).toBe(true)
      })

      it('applies validate to element type in repeated fields', () => {
        // Note: validate() applies to the element type, not the array itself
        const definition = fluentProto().message('Test', ({ f }) => ({
          items: f
            .string()
            .repeated()
            .idx(1)
            .validate((s) => s.min(3)),
        }))

        // Empty array is valid (no elements to validate)
        const empty = definition.schemas.Test.safeParse({ items: [] })
        expect(empty.success).toBe(true)

        // Array with short string fails (element validation)
        const shortItem = definition.schemas.Test.safeParse({ items: ['hi'] })
        expect(shortItem.success).toBe(false)

        // Array with valid strings passes
        const valid = definition.schemas.Test.safeParse({
          items: ['hello', 'world'],
        })
        expect(valid.success).toBe(true)
      })
    })

    describe('required repeated', () => {
      it('requires repeated field when marked required', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f
            .string()
            .repeated()
            .idx(1)
            .validate((s) => s.required()),
        }))

        const missing = definition.schemas.Test.safeParse({})
        expect(missing.success).toBe(false)

        const present = definition.schemas.Test.safeParse({ tags: [] })
        expect(present.success).toBe(true)
      })
    })

    describe('required map', () => {
      it('requires map field when marked required', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          data: f
            .map('string', 'string')
            .idx(1)
            .validate((s) => s.required()),
        }))

        const missing = definition.schemas.Test.safeParse({})
        expect(missing.success).toBe(false)

        const present = definition.schemas.Test.safeParse({ data: {} })
        expect(present.success).toBe(true)
      })
    })
  })

  describe('enum schemas', () => {
    it('accepts all valid enum values', () => {
      const definition = fluentProto().enum('Status', {
        UNKNOWN: 0,
        PENDING: 1,
        ACTIVE: 2,
        DONE: 3,
      })

      const schema = definition.schemas.Status

      expect(schema.safeParse('UNKNOWN').success).toBe(true)
      expect(schema.safeParse('PENDING').success).toBe(true)
      expect(schema.safeParse('ACTIVE').success).toBe(true)
      expect(schema.safeParse('DONE').success).toBe(true)
    })

    it('rejects invalid enum values', () => {
      const definition = fluentProto().enum('Status', {
        PENDING: 0,
        ACTIVE: 1,
      })

      const schema = definition.schemas.Status

      expect(schema.safeParse('INVALID').success).toBe(false)
      expect(schema.safeParse('pending').success).toBe(false) // case sensitive
      expect(schema.safeParse(0).success).toBe(false) // not a number
      expect(schema.safeParse(null).success).toBe(false)
    })

    it('provides imported enum schema', () => {
      const definition = fluentProto()
        .import('common.proto', commonPackage)
        .message('Test', ({ f }) => ({
          status: f.ref('common.Status').idx(1),
        }))

      const enumSchema = definition.schemas.CommonStatus
      expect(enumSchema.safeParse('ACTIVE').success).toBe(true)
      expect(enumSchema.safeParse('INVALID').success).toBe(false)
    })
  })

  describe('oneof schemas', () => {
    describe('pure oneof', () => {
      it('accepts single variant', () => {
        const schema = pureOneofDefinition.schemas.Value

        expect(schema.safeParse({ stringValue: 'hello' }).success).toBe(true)
        expect(schema.safeParse({ intValue: BigInt(42) }).success).toBe(true)
        expect(schema.safeParse({ doubleValue: 3.14 }).success).toBe(true)
        expect(schema.safeParse({ boolValue: true }).success).toBe(true)
      })

      it('rejects multiple variants at once', () => {
        const schema = pureOneofDefinition.schemas.Value

        const result = schema.safeParse({
          stringValue: 'hello',
          intValue: BigInt(42),
        })
        expect(result.success).toBe(false)
      })

      it('rejects unrecognized fields', () => {
        const schema = pureOneofDefinition.schemas.Value

        const result = schema.safeParse({ unknownField: 'test' })
        expect(result.success).toBe(false)
      })
    })

    describe('mixed oneof', () => {
      it('accepts regular fields with one variant', () => {
        const schema = mixedOneofDefinition.schemas.Event

        const result = schema.safeParse({
          id: 'event-1',
          timestamp: BigInt(Date.now()),
          textPayload: 'Hello world',
        })
        expect(result.success).toBe(true)
      })

      it('accepts regular fields with different variant', () => {
        const schema = mixedOneofDefinition.schemas.Event

        const result = schema.safeParse({
          id: 'event-2',
          numericPayload: 42.5,
        })
        expect(result.success).toBe(true)
      })

      it('accepts regular fields with no variant (proto3 optional)', () => {
        const schema = mixedOneofDefinition.schemas.Event

        const result = schema.safeParse({
          id: 'event-3',
          timestamp: BigInt(Date.now()),
        })
        expect(result.success).toBe(true)
      })

      it('rejects multiple variants in mixed oneof', () => {
        const schema = mixedOneofDefinition.schemas.Event

        const result = schema.safeParse({
          id: 'event-4',
          textPayload: 'text',
          numericPayload: 42,
        })
        expect(result.success).toBe(false)
      })
    })
  })

  describe('custom schema override', () => {
    it('uses custom schema for validation', () => {
      const schema = customSchemaDefinition.schemas.StrictUser

      // Valid data
      const valid = schema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'admin',
      })
      expect(valid.success).toBe(true)
    })

    it('rejects invalid uuid in custom schema', () => {
      const schema = customSchemaDefinition.schemas.StrictUser

      const result = schema.safeParse({
        id: 'not-a-uuid',
        email: 'test@example.com',
        role: 'admin',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid email in custom schema', () => {
      const schema = customSchemaDefinition.schemas.StrictUser

      const result = schema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'not-an-email',
        role: 'admin',
      })
      expect(result.success).toBe(false)
    })

    it('rejects invalid role enum in custom schema', () => {
      const schema = customSchemaDefinition.schemas.StrictUser

      const result = schema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'superadmin',
      })
      expect(result.success).toBe(false)
    })

    it('rejects extra fields when strict', () => {
      const schema = customSchemaDefinition.schemas.StrictUser

      const result = schema.safeParse({
        id: '550e8400-e29b-41d4-a716-446655440000',
        email: 'test@example.com',
        role: 'admin',
        extraField: 'not allowed',
      })
      expect(result.success).toBe(false)
    })
  })

  describe('empty message', () => {
    it('accepts empty object', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      const result = definition.schemas.Empty.safeParse({})
      expect(result.success).toBe(true)
    })

    it('rejects object with extra properties', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      const result = definition.schemas.Empty.safeParse({ extra: 'value' })
      expect(result.success).toBe(false)
    })

    it('rejects null', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      const result = definition.schemas.Empty.safeParse(null)
      expect(result.success).toBe(false)
    })

    it('rejects non-object values', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      expect(definition.schemas.Empty.safeParse('string').success).toBe(false)
      expect(definition.schemas.Empty.safeParse(123).success).toBe(false)
      expect(definition.schemas.Empty.safeParse([]).success).toBe(false)
    })
  })

  describe('complex definition integration', () => {
    it('validates UserProfile with all field types', () => {
      const schema = complexDefinition.schemas.UserProfile

      const result = schema.safeParse({
        id: 'user-123',
        name: 'John Doe',
        email: 'john@example.com',
        age: 30,
        balance: 1000.5,
        isActive: true,
        priority: 'HIGH',
        metadata: {
          createdAt: '2024-01-01',
          updatedAt: '2024-01-02',
        },
      })
      expect(result.success).toBe(true)
    })

    it('validates SearchRequest with maps and repeated fields', () => {
      const schema = complexDefinition.schemas.SearchRequest

      const result = schema.safeParse({
        query: 'test',
        limit: 20,
        filters: { category: 'electronics' },
        priorityFilter: { urgent: 'HIGH' },
        tags: ['new', 'sale'],
        statuses: ['ACTIVE'],
      })
      expect(result.success).toBe(true)
    })

    it('validates SearchResponse with nested repeated refs', () => {
      const schema = complexDefinition.schemas.SearchResponse

      const result = schema.safeParse({
        results: [
          { id: 'user-1', name: 'User 1', priority: 'LOW' },
          { id: 'user-2', isActive: false },
        ],
        total: BigInt(2),
        wrapper: { value: 'wrapped' },
      })
      expect(result.success).toBe(true)
    })
  })
})
