import type z from 'zod'
import type { $ZodType } from 'zod/v4/core'
import type { Field } from './fields/field.js'
import type { OneofField } from './fields/oneof.js'

export interface Serializable {
  serialize(): string
}

// Enum schema is a record of string keys to number values
export type EnumSchema = Record<string, number>

// Message schema is a record of field definitions
// Using Field base class to avoid circular dependencies
// The third generic (boolean) allows both required=true and required=false fields
// The fourth generic (boolean) allows both repeated=true and repeated=false fields
export type MessageSchema = Record<
  string,
  Field<unknown, $ZodType, boolean, boolean>
>

// Oneof message schema is a record with a single oneof field
// e.g., { kind: oneof({ string_value: f.string().idx(1), number_value: f.float().idx(2) }) }
export type OneofMessageSchema = Record<string, OneofField<MessageSchema>>

// Mixed message schema allows both regular fields and oneof fields
// e.g., { kind: oneof({...}), test: f.string().idx(3) }
export type MixedMessageSchema = Record<
  string,
  Field<unknown, $ZodType, boolean, boolean> | OneofField<MessageSchema>
>

// Combined schema that can be regular fields, pure oneof fields, or mixed
export type MessageOrOneofSchema =
  | MessageSchema
  | OneofMessageSchema
  | MixedMessageSchema

// External ref can be either a message schema or an enum schema
export type ExternalRefSchema = MessageSchema | EnumSchema

export type Infer<T> = z.infer<T>
