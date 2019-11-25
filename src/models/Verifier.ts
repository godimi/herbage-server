import { Schema } from 'mongoose'
import {
  getModelForClass,
  DocumentType,
  prop,
  modelOptions
} from '@typegoose/typegoose'

@modelOptions({
  schemaOptions: {
    collection: 'verifiers'
  }
})
class Verifier {
  public _id: Schema.Types.ObjectId

  @prop({ required: true })
  public question: string

  @prop({ required: true })
  public answer: string

  public get id(): string {
    return Base64.encode(this._id.toString())
  }

  public isCorrect(this: DocumentType<Verifier>, target: string): boolean {
    return this.answer === target
  }
}

const VerifierModel = getModelForClass(Verifier)

export default VerifierModel
