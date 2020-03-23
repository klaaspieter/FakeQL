import { DocumentNode, SelectionSetNode } from "graphql";

const traverse = (set: SelectionSetNode): Record<string, any> => {
  const object: Record<string, any> = {};
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
export const fakeQL = ({ document }: FakeQLProps): Record<string, any> => {
  const definition = document.definitions[0];
  if (definition.kind !== "OperationDefinition") {
    throw new Error(
      `FakeQL: Only definitions of kind operation can be mocked. Got definition of kind '${definition.kind}'`
    );
  }

  return traverse(definition.selectionSet);
};
