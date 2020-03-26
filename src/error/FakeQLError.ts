import { GraphQLError } from "graphql";

export class FakeQLError extends Error {
  constructor(
    readonly _message: string,
    readonly graphqlErrors: readonly GraphQLError[] = []
  ) {
    super();
  }

  get message(): string {
    return `${this._message}
GraphQL errors:
  ${this.graphqlErrors}`;
  }
}
