import { describe, it, expect } from 'vitest'
import { fluentProto } from '../src/fluent-proto.js'
import { protoConverter } from '../src/proto-converter.js'
import {
  googleProtobuf,
  commonPackage,
  complexDefinition,
  pureOneofDefinition,
  mixedOneofDefinition,
  reservedFieldsDefinition,
} from './fixtures.js'

describe('protoConverter', () => {
  describe('basic structure', () => {
    it('generates syntax declaration', () => {
      const definition = fluentProto().syntax('proto3')

      const proto = protoConverter(definition)

      expect(proto).toContain('syntax = "proto3";')
    })

    it('generates package declaration', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('com.example.app')

      const proto = protoConverter(definition)

      expect(proto).toContain('package com.example.app;')
    })

    it('generates complete minimal definition', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      const proto = protoConverter(definition)

      expect(proto).toBe(`syntax = "proto3";

package test;

message Empty {
}`)
    })
  })

  describe('enum serialization', () => {
    it('generates enum with values', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .enum('Status', {
          UNKNOWN: 0,
          PENDING: 1,
          ACTIVE: 2,
        })

      const proto = protoConverter(definition)

      expect(proto).toContain('enum Status {')
      expect(proto).toContain('UNKNOWN = 0;')
      expect(proto).toContain('PENDING = 1;')
      expect(proto).toContain('ACTIVE = 2;')
    })

    it('generates multiple enums', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .enum('Status', { PENDING: 0, DONE: 1 })
        .enum('Priority', { LOW: 0, HIGH: 1 })

      const proto = protoConverter(definition)

      expect(proto).toContain('enum Status {')
      expect(proto).toContain('enum Priority {')
    })
  })

  describe('message serialization', () => {
    describe('scalar fields', () => {
      it('generates string field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            name: f.string().idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional string name = 1;')
      })

      it('generates int32 field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            count: f.int('int32').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional int32 count = 1;')
      })

      it('generates int64 field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            bigNum: f.int('int64').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional int64 bigNum = 1;')
      })

      it('generates uint32 field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            value: f.int('uint32').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional uint32 value = 1;')
      })

      it('generates uint64 field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            value: f.int('uint64').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional uint64 value = 1;')
      })

      it('generates float field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            value: f.float('float').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional float value = 1;')
      })

      it('generates double field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            value: f.float('double').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional double value = 1;')
      })

      it('generates bool field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            enabled: f.bool().idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional bool enabled = 1;')
      })

      it('generates bytes field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            data: f.bytes().idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional bytes data = 1;')
      })
    })

    describe('repeated fields', () => {
      it('generates repeated string field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            tags: f.string().repeated().idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('repeated string tags = 1;')
      })

      it('generates repeated int32 field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            scores: f.int('int32').repeated().idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('repeated int32 scores = 1;')
      })

      it('generates repeated ref field', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Item', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Container', ({ f }) => ({
            items: f.ref('Item').repeated().idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('repeated Item items = 1;')
      })
    })

    describe('map fields', () => {
      it('generates map with string key and string value', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            metadata: f.map('string', 'string').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('map<string, string> metadata = 1;')
      })

      it('generates map with string key and int32 value', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Test', ({ f }) => ({
            counts: f.map('string', 'int32').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('map<string, int32> counts = 1;')
      })

      it('generates map with enum value', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .enum('Status', { ON: 0, OFF: 1 })
          .message('Test', ({ f }) => ({
            statuses: f.map('string', 'Status').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('map<string, Status> statuses = 1;')
      })

      it('generates map with message value', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Item', ({ f }) => ({
            name: f.string().idx(1),
          }))
          .message('Container', ({ f }) => ({
            items: f.map('string', 'Item').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('map<string, Item> items = 1;')
      })
    })

    describe('reference fields', () => {
      it('generates ref to local message', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .message('Inner', ({ f }) => ({
            value: f.string().idx(1),
          }))
          .message('Outer', ({ f }) => ({
            inner: f.ref('Inner').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional Inner inner = 1;')
      })

      it('generates ref to local enum', () => {
        const definition = fluentProto()
          .syntax('proto3')
          .package('test')
          .enum('Status', { ON: 0, OFF: 1 })
          .message('Test', ({ f }) => ({
            status: f.ref('Status').idx(1),
          }))

        const proto = protoConverter(definition)

        expect(proto).toContain('optional Status status = 1;')
      })
    })

    describe('reserved fields', () => {
      it('generates reserved field indices', () => {
        const proto = protoConverter(reservedFieldsDefinition)

        expect(proto).toContain('reserved 2, 3;')
      })

      it('maintains field indices correctly with reserved', () => {
        const proto = protoConverter(reservedFieldsDefinition)

        expect(proto).toContain('optional string id = 1;')
        expect(proto).toContain('optional string name = 4;')
      })
    })
  })

  describe('oneof serialization', () => {
    it('generates pure oneof message', () => {
      const proto = protoConverter(pureOneofDefinition)

      expect(proto).toBe(`syntax = "proto3";

package test;

message Value {
  oneof kind {
    string stringValue = 1;
    int64 intValue = 2;
    double doubleValue = 3;
    bool boolValue = 4;
  }
}`)
    })

    it('generates mixed oneof and regular fields', () => {
      const proto = protoConverter(mixedOneofDefinition)

      expect(proto).toBe(`syntax = "proto3";

package test;

message Event {
  optional string id = 1;
  optional int64 timestamp = 2;
  oneof payload {
    string textPayload = 3;
    bytes jsonPayload = 4;
    double numericPayload = 5;
  }
}`)
    })

    it('maintains correct structure for oneof', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Value', ({ oneof, f }) => ({
          kind: oneof({
            strVal: f.string().idx(1),
            intVal: f.int('int32').idx(2),
          }),
        }))

      const proto = protoConverter(definition)

      expect(proto).toBe(`syntax = "proto3";

package test;

message Value {
  oneof kind {
    string strVal = 1;
    int32 intVal = 2;
  }
}`)
    })

    it('never emits labels on oneof members', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('demo')
        .message('Event', ({ f, oneof }) => ({
          id: f.string().idx(1),
          payload: oneof({
            text: f.string().idx(2),
            userId: f.string().optional({ implicit: true }).idx(3),
          }),
        }))

      expect(protoConverter(definition)).toBe(`syntax = "proto3";

package demo;

message Event {
  optional string id = 1;
  oneof payload {
    string text = 2;
    string userId = 3;
  }
}`)
    })

    it('serializes multiple oneofs in a mixed message', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Multi', ({ f, oneof }) => ({
          id: f.string().idx(1),
          a: oneof({ x: f.string().idx(2), y: f.bool().idx(3) }),
          b: oneof({ z: f.int('int32').idx(4) }),
        }))

      expect(protoConverter(definition)).toBe(`syntax = "proto3";

package test;

message Multi {
  optional string id = 1;
  oneof a {
    string x = 2;
    bool y = 3;
  }
  oneof b {
    int32 z = 4;
  }
}`)
    })

    it('throws on a repeated field inside a oneof', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Bad', ({ f, oneof }) => ({
          kind: oneof({ tags: f.string().repeated().idx(1) }),
        }))

      expect(() => protoConverter(definition)).toThrow(
        'Field "tags" in oneof "kind" is repeated',
      )
    })

    it('throws on a map field inside a oneof', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Bad', ({ f, oneof }) => ({
          id: f.string().idx(1),
          kind: oneof({ meta: f.map('string', 'string').idx(2) }),
        }))

      expect(() => protoConverter(definition)).toThrow(
        'Field "meta" in oneof "kind" is a map',
      )
    })
  })

  describe('service serialization', () => {
    it('generates service with single method', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Request', ({ f }) => ({
          id: f.string().idx(1),
        }))
        .message('Response', ({ f }) => ({
          result: f.string().idx(1),
        }))
        .service('TestService', {
          doSomething: {
            request: 'Request',
            response: 'Response',
          },
        })

      const proto = protoConverter(definition)

      expect(proto).toContain('service TestService {')
      expect(proto).toContain(
        'rpc doSomething (Request) returns (Response) {};',
      )
    })

    it('generates service with multiple methods', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Req', ({ f }) => ({
          id: f.string().idx(1),
        }))
        .message('Res', ({ f }) => ({
          ok: f.bool().idx(1),
        }))
        .service('API', {
          create: { request: 'Req', response: 'Res' },
          read: { request: 'Req', response: 'Res' },
          update: { request: 'Req', response: 'Res' },
          delete: { request: 'Req', response: 'Res' },
        })

      const proto = protoConverter(definition)

      expect(proto).toContain('rpc create (Req) returns (Res) {};')
      expect(proto).toContain('rpc read (Req) returns (Res) {};')
      expect(proto).toContain('rpc update (Req) returns (Res) {};')
      expect(proto).toContain('rpc delete (Req) returns (Res) {};')
    })
  })

  describe('import serialization', () => {
    it('generates import statement', () => {
      const external = fluentProto()
        .syntax('proto3')
        .package('external')
        .message('Data', ({ f }) => ({
          value: f.string().idx(1),
        }))

      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .import('external/data.proto', external)

      const proto = protoConverter(definition)

      expect(proto).toContain('import "external/data.proto";')
    })

    it('generates multiple import statements', () => {
      const pkg1 = fluentProto()
        .syntax('proto3')
        .package('pkg1')
        .message('A', ({ f }) => ({ val: f.string().idx(1) }))

      const pkg2 = fluentProto()
        .syntax('proto3')
        .package('pkg2')
        .message('B', ({ f }) => ({ val: f.string().idx(1) }))

      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .import('pkg1/a.proto', pkg1)
        .import('pkg2/b.proto', pkg2)

      const proto = protoConverter(definition)

      expect(proto).toContain('import "pkg1/a.proto";')
      expect(proto).toContain('import "pkg2/b.proto";')
    })

    it('generates ref to imported message', () => {
      const external = fluentProto()
        .syntax('proto3')
        .package('external')
        .message('Data', ({ f }) => ({
          value: f.string().idx(1),
        }))

      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .import('external/data.proto', external)
        .message('Test', ({ f }) => ({
          data: f.ref('external.Data').idx(1),
        }))

      const proto = protoConverter(definition)

      expect(proto).toContain('optional external.Data data = 1;')
    })
  })

  describe('complex definition', () => {
    it('generates complete proto file with all features', () => {
      const proto = protoConverter(complexDefinition)

      // Syntax and package
      expect(proto).toContain('syntax = "proto3";')
      expect(proto).toContain('package app;')

      // Imports
      expect(proto).toContain('import "google/protobuf/wrappers.proto";')
      expect(proto).toContain('import "common/types.proto";')

      // Service
      expect(proto).toContain('service UserService {')
      expect(proto).toContain(
        'rpc search (SearchRequest) returns (SearchResponse) {};',
      )
      expect(proto).toContain(
        'rpc getProfile (google.protobuf.StringValue) returns (UserProfile) {};',
      )

      // Enum
      expect(proto).toContain('enum Priority {')
      expect(proto).toContain('LOW = 0;')
      expect(proto).toContain('MEDIUM = 1;')
      expect(proto).toContain('HIGH = 2;')

      // Messages
      expect(proto).toContain('message UserProfile {')
      expect(proto).toContain('message SearchRequest {')
      expect(proto).toContain('message SearchResponse {')

      // Field types
      expect(proto).toContain('optional string id = 1;')
      expect(proto).toContain('optional bool isActive = 6;')
      expect(proto).toContain('optional Priority priority = 7;')
      expect(proto).toContain('optional common.Metadata metadata = 8;')
      expect(proto).toContain('map<string, string> filters = 4;')
      expect(proto).toContain('map<string, Priority> priorityFilter = 5;')
      expect(proto).toContain('repeated string tags = 6;')
      expect(proto).toContain('repeated common.Status statuses = 7;')
    })
  })

  describe('empty message', () => {
    it('generates empty message block', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))

      const proto = protoConverter(definition)

      expect(proto).toBe(`syntax = "proto3";

package test;

message Empty {
}`)
    })

    it('generates multiple messages including empty', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Empty', () => ({}))
        .message('NonEmpty', ({ f }) => ({
          value: f.string().idx(1),
        }))

      const proto = protoConverter(definition)

      expect(proto).toContain('message Empty {\n}')
      expect(proto).toContain('message NonEmpty {')
      expect(proto).toContain('optional string value = 1;')
    })

    it('generates empty message with reserved fields', () => {
      const definition = fluentProto()
        .syntax('proto3')
        .package('test')
        .message('Deprecated', () => ({}), { reserved: [1, 2, 3] })

      const proto = protoConverter(definition)

      expect(proto).toContain('message Deprecated {')
      expect(proto).toContain('reserved 1, 2, 3;')
    })
  })

  describe('standalone package definitions', () => {
    it('generates google protobuf package correctly', () => {
      const proto = protoConverter(googleProtobuf)

      expect(proto).toContain('package google.protobuf;')
      expect(proto).toContain('message StringValue {')
      expect(proto).toContain('message Int32Value {')
    })

    it('generates common package correctly', () => {
      const proto = protoConverter(commonPackage)

      expect(proto).toContain('package common;')
      expect(proto).toContain('enum Status {')
      expect(proto).toContain('message Metadata {')
      expect(proto).toContain('message Response {')
    })
  })
})
