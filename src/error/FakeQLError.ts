export class FakeQLError extends Error {
  constructor(
    readonly _message: string,
    readonly underlyingErrors: readonly Error[] = []
  ) {
    super();
  }

  get message(): string {
    return `${this._message}
Underlying errors:
  ${this.underlyingErrors}`;
  }
}
