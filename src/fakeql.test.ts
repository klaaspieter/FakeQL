import { parse } from "graphql";
import { fakeQL } from "./index";

describe("fakeQL", () => {
  it("fails when document is not an OperationDefinition", () => {
    const document = parse(`
      fragment foo on Foo {
        bar
      }
    `);

    expect(() =>
      fakeQL({
        document
      })
    ).toThrow(
      "FakeQL: Only definitions of kind operation can be mocked. Got definition of kind 'FragmentDefinition'"
    );
  });
});
