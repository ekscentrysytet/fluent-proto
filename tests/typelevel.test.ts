import { describe, it, expectTypeOf } from 'vitest'
import type { Infer } from '../src/types.js'
import { fluentProto } from '../src/fluent-proto.js'
import {
  complexDefinition,
  pureOneofDefinition,
  mixedOneofDefinition,
} from './fixtures.js'

describe('type-level tests', () => {
  describe('enum types', () => {
    it('infers enum as union of string literals', () => {
      const definition = fluentProto().enum('Status', {
        PENDING: 0,
        ACTIVE: 1,
        DONE: 2,
      })

      type StatusType = Infer<typeof definition.schemas.Status>

      expectTypeOf<StatusType>().toEqualTypeOf<'PENDING' | 'ACTIVE' | 'DONE'>()
    })

    it('imported enum has correct type', () => {
      type Priority = Infer<typeof complexDefinition.schemas.Priority>

      expectTypeOf<Priority>().toEqualTypeOf<'LOW' | 'MEDIUM' | 'HIGH'>()
    })

    it('imported external enum has correct type', () => {
      type CommonStatus = Infer<typeof complexDefinition.schemas.CommonStatus>

      expectTypeOf<CommonStatus>().toEqualTypeOf<
        'UNKNOWN' | 'ACTIVE' | 'INACTIVE'
      >()
    })
  })

  describe('message types', () => {
    describe('required vs optional fields', () => {
      it('required field is not optional', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          id: f
            .string()
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>

        // Required field should be present
        expectTypeOf<TestType>().toHaveProperty('id')
        expectTypeOf<TestType['id']>().toBeString()
      })

      it('optional field is nullable and optional', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          name: f.string().idx(1),
        }))

        type TestType = Infer<typeof definition.schemas.Test>

        // Optional field should accept undefined and null
        expectTypeOf<TestType>().toExtend<{
          name?: string | null | undefined
        }>()
      })

      it('message with mixed required and optional fields', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          id: f
            .string()
            .idx(1)
            .validate((s) => s.required()),
          name: f.string().idx(2),
        }))

        type TestType = Infer<typeof definition.schemas.Test>

        // Should have required id and optional name
        expectTypeOf<{ id: string }>().toExtend<TestType>()
        expectTypeOf<{ id: string; name: null }>().toExtend<TestType>()
      })
    })

    describe('scalar field types', () => {
      it('string field has string type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f
            .string()
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>
        expectTypeOf<TestType['value']>().toBeString()
      })

      it('int32 field has number type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f
            .int('int32')
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>
        expectTypeOf<TestType['value']>().toBeNumber()
      })

      it('int64 field has bigint type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f
            .int('int64')
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>
        expectTypeOf<TestType['value']>().toEqualTypeOf<bigint>()
      })

      it('float/double field has number type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          floatVal: f
            .float('float')
            .idx(1)
            .validate((s) => s.required()),
          doubleVal: f
            .float('double')
            .idx(2)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>
        expectTypeOf<TestType['floatVal']>().toBeNumber()
        expectTypeOf<TestType['doubleVal']>().toBeNumber()
      })

      it('bool field has boolean type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          value: f
            .bool()
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>
        expectTypeOf<TestType['value']>().toBeBoolean()
      })
    })

    describe('reference types', () => {
      it('ref to message has correct nested type', () => {
        const definition = fluentProto()
          .message('Inner', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Outer', ({ f }) => ({
            inner: f
              .ref('Inner')
              .idx(1)
              .validate((s) => s.required()),
          }))

        type OuterType = Infer<typeof definition.schemas.Outer>
        type InnerType = Infer<typeof definition.schemas.Inner>

        expectTypeOf<OuterType['inner']>().toEqualTypeOf<InnerType>()
      })

      it('ref to enum has correct union type', () => {
        const definition = fluentProto()
          .enum('Status', { PENDING: 0, DONE: 1 })
          .message('Task', ({ f }) => ({
            status: f
              .ref('Status')
              .idx(1)
              .validate((s) => s.required()),
          }))

        type TaskType = Infer<typeof definition.schemas.Task>

        expectTypeOf<TaskType['status']>().toEqualTypeOf<'PENDING' | 'DONE'>()
      })
    })

    describe('repeated fields', () => {
      it('repeated string is array of strings', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          tags: f
            .string()
            .repeated()
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>

        expectTypeOf<TestType['tags']>().toEqualTypeOf<string[]>()
      })

      it('repeated ref to message is array of messages', () => {
        const definition = fluentProto()
          .message('Item', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Container', ({ f }) => ({
            items: f
              .ref('Item')
              .repeated()
              .idx(1)
              .validate((s) => s.required()),
          }))

        type ContainerType = Infer<typeof definition.schemas.Container>
        type ItemType = Infer<typeof definition.schemas.Item>

        expectTypeOf<ContainerType['items']>().toEqualTypeOf<ItemType[]>()
      })

      it('repeated ref to enum is array of enum values', () => {
        const definition = fluentProto()
          .enum('Priority', { LOW: 0, HIGH: 1 })
          .message('Task', ({ f }) => ({
            priorities: f
              .ref('Priority')
              .repeated()
              .idx(1)
              .validate((s) => s.required()),
          }))

        type TaskType = Infer<typeof definition.schemas.Task>

        expectTypeOf<TaskType['priorities']>().toEqualTypeOf<
          ('LOW' | 'HIGH')[]
        >()
      })
    })

    describe('map fields', () => {
      it('map with primitive values has Record type', () => {
        const definition = fluentProto().message('Test', ({ f }) => ({
          data: f
            .map('string', 'int32')
            .idx(1)
            .validate((s) => s.required()),
        }))

        type TestType = Infer<typeof definition.schemas.Test>

        expectTypeOf<TestType['data']>().toEqualTypeOf<Record<string, number>>()
      })

      it('map with enum values has Record with enum type', () => {
        const definition = fluentProto()
          .enum('Status', { ON: 0, OFF: 1 })
          .message('Test', ({ f }) => ({
            statuses: f
              .map('string', 'Status')
              .idx(1)
              .validate((s) => s.required()),
          }))

        type TestType = Infer<typeof definition.schemas.Test>

        expectTypeOf<TestType['statuses']>().toEqualTypeOf<
          Record<string, 'ON' | 'OFF'>
        >()
      })

      it('map with message values has Record with message type', () => {
        const definition = fluentProto()
          .message('Item', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Container', ({ f }) => ({
            items: f
              .map('string', 'Item')
              .idx(1)
              .validate((s) => s.required()),
          }))

        type ContainerType = Infer<typeof definition.schemas.Container>
        type ItemType = Infer<typeof definition.schemas.Item>

        expectTypeOf<ContainerType['items']>().toEqualTypeOf<
          Record<string, ItemType>
        >()
      })
    })

    describe('imported types', () => {
      it('imported message has correct type', () => {
        type CommonMetadata = Infer<
          typeof complexDefinition.schemas.CommonMetadata
        >

        expectTypeOf<CommonMetadata>().toExtend<{
          createdAt?: string | null
          updatedAt?: string | null
        }>()
      })

      it('ref to imported message has correct type', () => {
        type UserProfile = Infer<typeof complexDefinition.schemas.UserProfile>

        // metadata field references common.Metadata
        expectTypeOf<UserProfile>().toHaveProperty('metadata')
      })

      it('google protobuf wrapper type is correct', () => {
        type StringValue = Infer<
          typeof complexDefinition.schemas.GoogleProtobufStringValue
        >

        expectTypeOf<StringValue>().toExtend<{
          value?: string | null
        }>()
      })
    })
  })

  describe('oneof types', () => {
    describe('pure oneof', () => {
      it('pure oneof is union of variant objects', () => {
        type ValueType = Infer<typeof pureOneofDefinition.schemas.Value>

        // Each variant should be a valid assignable type
        expectTypeOf<{ stringValue: string }>().toExtend<ValueType>()
        expectTypeOf<{ intValue: bigint }>().toExtend<ValueType>()
        expectTypeOf<{ doubleValue: number }>().toExtend<ValueType>()
        expectTypeOf<{ boolValue: boolean }>().toExtend<ValueType>()
      })
    })

    describe('mixed oneof', () => {
      it('mixed oneof includes regular fields in each variant', () => {
        type EventType = Infer<typeof mixedOneofDefinition.schemas.Event>

        // Regular fields should be present in the type - use toExtend since it's a union
        expectTypeOf<{
          id: string
          timestamp: bigint
          textPayload: string
        }>().toExtend<EventType>()
      })

      it('mixed oneof allows variant with regular fields', () => {
        type EventType = Infer<typeof mixedOneofDefinition.schemas.Event>

        // Should accept objects with regular fields and one variant
        expectTypeOf<{
          id: string
          textPayload: string
        }>().toExtend<EventType>()
        expectTypeOf<{
          id: string
          numericPayload: number
        }>().toExtend<EventType>()
      })
    })
  })

  describe('empty message', () => {
    it('empty message type accepts empty object', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      type EmptyType = Infer<typeof definition.schemas.Empty>

      // Empty message should accept empty object
      expectTypeOf<{}>().toExtend<EmptyType>()
    })

    it('empty message type is object with no known properties', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      type EmptyType = Infer<typeof definition.schemas.Empty>

      // The type should be an object with no known properties
      // Using toExtend to verify it's a valid object type
      expectTypeOf<EmptyType>().toExtend<object>()
    })
  })

  describe('complex definition types', () => {
    it('UserProfile has all expected fields with correct types', () => {
      type UserProfile = Infer<typeof complexDefinition.schemas.UserProfile>

      // Required field
      expectTypeOf<UserProfile>().toHaveProperty('id')

      // Optional fields
      expectTypeOf<UserProfile>().toExtend<{
        id: string
        name?: string | null
        email?: string | null
        age?: number | null
        balance?: number | null
        isActive?: boolean | null
      }>()
    })

    it('SearchRequest has correct complex field types', () => {
      type SearchRequest = Infer<typeof complexDefinition.schemas.SearchRequest>

      expectTypeOf<SearchRequest>().toExtend<{
        query?: string | null
        limit?: number | null
        offset?: number | null
        filters?: Record<string, string> | null
        priorityFilter?: Record<string, 'LOW' | 'MEDIUM' | 'HIGH'> | null
        tags?: string[] | null
        statuses?: ('UNKNOWN' | 'ACTIVE' | 'INACTIVE')[] | null
      }>()
    })

    it('SearchResponse has correct nested types', () => {
      type SearchResponse = Infer<
        typeof complexDefinition.schemas.SearchResponse
      >
      type UserProfile = Infer<typeof complexDefinition.schemas.UserProfile>

      // results should be array of UserProfile
      expectTypeOf<SearchResponse>().toExtend<{
        results?: UserProfile[] | null
        total?: bigint | null
      }>()
    })
  })
})
