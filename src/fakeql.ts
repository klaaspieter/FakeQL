import {
  DocumentNode,
  SelectionSetNode,
  DefinitionNode,
  OperationDefinitionNode,
  FragmentDefinitionNode,
} from "graphql";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mock = Record<string, any>;
type FragmentMap = { [key: string]: Mock };

interface TraverseOptions {
  fragments: FragmentMap;
}
const traverse = (
  set: SelectionSetNode,
  { fragments = {} }: Partial<TraverseOptions> = {}
): Mock => {
  let object: Mock = {};
  for (const selection of set.selections) {
    switch (selection.kind) {
      case "Field":
        if (selection.selectionSet) {
          object[selection.name.value] = traverse(selection.selectionSet, {
            fragments,
          });
        } else {
          object[
            selection.name.value
          ] = `mock-value-for-field-"${selection.name.value}"`;
        }
        break;

      case "FragmentSpread":
        object = { ...object, ...fragments[selection.name.value] };
        break;
      default:
        console.warn("FakeQL: doing nothing for", selection);
        break;
    }
  }

  return object;
};

const isFragment = (
  definition: DefinitionNode
): definition is FragmentDefinitionNode =>
  definition.kind === "FragmentDefinition";

const isOperation = (
  definition: DefinitionNode
): definition is OperationDefinitionNode =>
  definition.kind === "OperationDefinition";

interface FakeQLProps {
  document: DocumentNode;
}
export const fakeQL = ({ document }: FakeQLProps): Mock => {
  const fragments = document.definitions.filter(isFragment).reduce(
    (fragments, definition) => ({
      ...fragments,
      ...{ [definition.name.value]: traverse(definition.selectionSet) },
    }),
    {} as FragmentMap
  );

  const definition = document.definitions.find(isOperation);

  if (!definition) {
    throw new Error(
      "FakeQL: Document has no operations. Ensure your GraphQL document has a query directive"
    );
  }
  return traverse(definition.selectionSet, { fragments });
};
