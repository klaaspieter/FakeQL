import { GraphQLError } from "graphql";

export class FakeQLError extends Error {
  constructor(
    readonly message: string,
    readonly graphqlErrors: readonly GraphQLError[] = []
  ) {
    super();
  }
}
