import type {
  MessageSchema,
  MessageOrOneofSchema,
  EnumSchema,
} from './types.js'
import { OneofField } from './fields/oneof.js'

export const indent = (str: string, spaces: number = 2) =>
  ' '.repeat(spaces) + str

export const pascalCaseMessageName = (messageName: string) => {
  // Split by dots and capitalize each part, then join
  return messageName
    .split('.')
    .map((part) => `${part.charAt(0).toUpperCase()}${part.slice(1)}`)
    .join('')
}

// Helper to check if schema is pure oneof (all fields are OneofField)
export const isPureOneofSchema = (
  schema: MessageOrOneofSchema | EnumSchema,
): schema is Record<string, OneofField<MessageSchema>> => {
  const values = Object.values(schema)
  return values.length > 0 && values.every((v) => v instanceof OneofField)
}

// Helper to check if schema has mixed fields (regular fields + oneof fields)
export const hasMixedOneofFields = (
  schema: MessageOrOneofSchema | EnumSchema,
): boolean => {
  const values = Object.values(schema)
  const hasOneof = values.some((v) => v instanceof OneofField)
  const hasRegular = values.some(
    (v) => !(v instanceof OneofField) && typeof v !== 'number',
  )
  return hasOneof && hasRegular
}

// Helper to check if schema is an enum (all values are numbers, and non-empty)
export const isEnumSchema = (
  schema: MessageOrOneofSchema | EnumSchema,
): schema is EnumSchema => {
  const values = Object.values(schema)
  return values.length > 0 && values.every((v) => typeof v === 'number')
}
