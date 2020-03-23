import { DocumentNode, SelectionSetNode } from "graphql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mock = Record<string, any>;

const traverse = (set: SelectionSetNode): Mock => {
  const object: Mock = {};
  for (const selection of set.selections) {
    switch (selection.kind) {
      case "Field":
        if (selection.selectionSet) {
          object[selection.name.value] = traverse(selection.selectionSet);
        } else {
          object[
            selection.name.value
          ] = `mock-value-for-field-"${selection.name.value}"`;
        }
        break;
      default:
        console.log("do nothing for", selection);
        break;
    }
  }

  return object;
};

interface FakeQLProps {
  document: DocumentNode;
}
export const fakeQL = ({ document }: FakeQLProps): Mock => {
  const definition = document.definitions[0];
  if (definition.kind !== "OperationDefinition") {
    throw new Error(
      `FakeQL: Only definitions of kind operation can be mocked. Got definition of kind '${definition.kind}'`
    );
  }

  return traverse(definition.selectionSet);
};
