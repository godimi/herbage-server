import {
  DocumentType,
  prop,
  arrayProp,
  getModelForClass,
  modelOptions
} from '@typegoose/typegoose'
import { ModelType } from '@typegoose/typegoose/lib/types'
import { Base64 } from 'js-base64'
import { Schema } from 'mongoose'
import * as crypto from 'crypto'

export enum PostStatus {
  Pending = 'PENDING',
  Accepted = 'ACCEPTED',
  Rejected = 'REJECTED',
  Deleted = 'DELETED'
}

export interface PostPublicFields {
  id: string
  number?: number
  title?: string
  content: string
  tag: string
  fbLink?: string
  createdAt: number
  status: string
}

export interface PostAuthorFields extends PostPublicFields {
  hash: string
}

export class PostHistory {
  @prop({ required: true, trim: true })
  public content: string

  @prop({ required: true })
  public createdAt: Date
}

@modelOptions({
  schemaOptions: {
    timestamps: true,
    collection: 'posts',
    toObject: {
      virtuals: true
    },
    toJSON: {
      virtuals: true,
      transform: (doc, ret): unknown => {
        ret.createdAt = doc.createdAt.getTime()
        return ret
      }
    }
  }
})
class Post {
  // for type analysis
  public _id: Schema.Types.ObjectId
  public createdAt: Date

  @prop()
  public number?: number

  @prop({ trim: true })
  public title?: string

  @prop({ required: true, trim: true })
  public content: string

  @prop({ required: true })
  public tag: string

  @prop({ enum: PostStatus, default: PostStatus.Pending })
  public status: PostStatus

  @prop({ trim: true })
  public reason: string

  @arrayProp({ items: PostHistory, default: [] })
  public history: PostHistory[]

  @prop()
  public fbLink?: string

  @prop({
    default: (): string => {
      return crypto
        .createHash('sha256')
        .update(Date.now().toString())
        .digest('hex')
    }
  })
  public hash: string

  public get cursorId(): string {
    return Base64.encode(this._id.toString())
  }

  public get id(): Schema.Types.ObjectId {
    return this._id
  }

  public async edit(
    this: DocumentType<Post>,
    newContent?: string,
    newFbLink?: string
  ): Promise<DocumentType<Post>> {
    this.history.push({ content: this.content, createdAt: new Date() })
    this.content = newContent || this.content
    this.fbLink = newFbLink || this.fbLink

    return this.save()
  }

  public async setRejected(
    this: DocumentType<Post>,
    reason: string
  ): Promise<DocumentType<Post>> {
    this.status = PostStatus.Rejected
    this.reason = reason
    return this.save()
  }

  public async setDeleted(
    this: DocumentType<Post>
  ): Promise<DocumentType<Post>> {
    this.status = PostStatus.Deleted
    return this.save()
  }

  public async setAccepted(
    this: DocumentType<Post>
  ): Promise<DocumentType<Post>> {
    this.status = PostStatus.Accepted
    this.number =
      ((await PostModel.find()
        .sort({ number: -1 })
        .limit(1)
        .exec())[0].number || 0) + 1
    return this.save()
  }

  public getPublicFields(this: DocumentType<Post>): PostPublicFields {
    return {
      id: this.id,
      number: this.number,
      title: this.title,
      content: this.content,
      tag: this.tag,
      fbLink: this.fbLink,
      createdAt: this.createdAt.getTime(),
      status: this.status
    }
  }

  public getAuthorFields(this: DocumentType<Post>): PostAuthorFields {
    return {
      id: this.id,
      number: this.number,
      title: this.title,
      content: this.content,
      tag: this.tag,
      fbLink: this.fbLink,
      createdAt: this.createdAt.getTime(),
      status: this.status,
      hash: this.hash
    }
  }

  public static async getList(
    this: ModelType<Post> & typeof Post,
    count: number = 10,
    cursor: string = '',
    options: {
      admin: boolean
      condition?: Record<string, unknown>
    } = { admin: false }
  ): Promise<Array<DocumentType<Post>>> {
    // 관리자는 오래된 글부터, 일반 사용자는 최신 글부터
    const isAdminAndNotPending =
      options.admin && (options.condition || {}).status !== PostStatus.Pending
    const condition = options.admin
      ? {
          // 다음 글의 _id: 관리자는 더 크고(커서보다 최신 글),
          // 일반 사용자는 더 작음(커서보다 오래된 글).
          _id: {
            [isAdminAndNotPending ? '$lt' : '$gt']: Base64.decode(cursor)
          }
        }
      : {
          number: {
            $lt: cursor
          },
          status: PostStatus.Accepted
        }

    if (!cursor) {
      if (options.admin) delete condition._id
      else delete condition.number
    }

    const posts = await this.find({
      ...condition,
      ...options.condition
    })
      .sort(
        options.admin ? { _id: isAdminAndNotPending ? -1 : 1 } : { number: -1 }
      )
      .limit(count)
      .exec()
    return posts
  }
}

const PostModel = getModelForClass(Post)

export default PostModel
