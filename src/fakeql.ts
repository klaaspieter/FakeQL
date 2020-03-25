import {
  visit,
  visitWithTypeInfo,
  parse,
  isNonNullType,
  DocumentNode,
  validate,
  validateSchema,
  TypeInfo,
  GraphQLSchema,
  isObjectType,
  isScalarType,
  GraphQLScalarType,
  isListType,
  GraphQLCompositeType,
} from "graphql";
import { assign } from "./assign";
import { FakeQLError } from "./error";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Mock = Record<string, any>;

const valueForScalarType = (type: GraphQLScalarType, name: string): unknown => {
  switch (type.name) {
    default:
    case "String":
      return `mock-value-for-field-"${name}"`;
    case "Int":
      return 42;

    case "Boolean":
      return false;
  }
};

interface FakeQLProps {
  document: DocumentNode;
  schema: GraphQLSchema;
}
export const fakeQL = ({ document, schema }: FakeQLProps): Mock => {
  const schemaValidationErrors = validateSchema(schema);
  if (schemaValidationErrors.length > 0) {
    throw new FakeQLError("Invalid Schema", schemaValidationErrors);
  }

  const source = document && document.loc && document.loc.source;
  if (!source) {
    throw new FakeQLError("The provided document has no source");
  }
  const documentAST = parse(source);

  const validationErrors = validate(schema, documentAST);
  if (validationErrors.length > 0) {
    throw new FakeQLError("Invalid Document", validationErrors);
  }

  const typeInfo = new TypeInfo(schema);

  let mock: Mock = {};
  let path: (string | number)[] = [];
  visit(
    documentAST,
    visitWithTypeInfo(typeInfo, {
      enter: (node) => {
        switch (node.kind) {
          case "Field": {
            let type = typeInfo.getType();

            if (isNonNullType(type)) {
              type = type.ofType;
            }

            if (isScalarType(type)) {
              if (
                node.name.value === "__typename" &&
                typeInfo.getParentType()
              ) {
                const parentType = typeInfo.getParentType() as GraphQLCompositeType;
                mock = assign(
                  mock,
                  [...path, node.name.value],
                  parentType.name
                );
              } else {
                const value = valueForScalarType(type, node.name.value);
                mock = assign(mock, [...path, node.name.value], value);
              }
            } else if (isListType(type)) {
              path = [...path, node.name.value, 0];
            } else if (isObjectType(type)) {
              path = [...path, node.name.value];
            }

            break;
          }
        }
      },
    })
  );

  return mock;
};
