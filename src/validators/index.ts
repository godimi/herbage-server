import { registerDecorator, ValidationOptions, isInt } from 'class-validator'

export function IsIntString(
  validationOptions?: ValidationOptions
): (object: Record<string, unknown>, propertyName: string) => void {
  return function (
    object: Record<string, unknown>,
    propertyName: string
  ): void {
    registerDecorator({
      name: 'isIntString',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: {
        validate(value: unknown): boolean {
          return typeof value === 'string' && isInt(Number(value))
        }
      }
    })
  }
}
