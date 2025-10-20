import { getLastPathSegment } from '@stoplight/json';
import {
  isBooleanishNode,
  isReferenceNode,
  isRegularNode,
  RegularNode,
  SchemaCombinerName,
  SchemaNode,
  SchemaNodeKind,
} from '@stoplight/json-schema-tree';
import { Box } from '@stoplight/mosaic';
import * as React from 'react';

import { printName } from '../../utils';
import { getApplicableFormats } from '../../utils/getApplicableFormats';

function shouldRenderName(type: SchemaNodeKind | SchemaCombinerName | '$ref'): boolean {
  return type === SchemaNodeKind.Array || type === SchemaNodeKind.Object || type === '$ref';
}

function getTypes(schemaNode: RegularNode): Array<SchemaNodeKind | SchemaCombinerName> {
  return [schemaNode.types, schemaNode.combiners].reduce<Array<SchemaNodeKind | SchemaCombinerName>>(
    (values, value) => {
      if (value === null) {
        return values;
      }

      values.push(...value);
      return values;
    },
    [],
  );
}

export const Types: React.FunctionComponent<{ schemaNode: SchemaNode }> = ({ schemaNode }) => {
  if (isReferenceNode(schemaNode)) {
    return (
      <Box as="span" textOverflow="truncate" data-test="property-type-ref">
        {schemaNode.value ?? '$ref'}
      </Box>
    );
  }

  if (isBooleanishNode(schemaNode)) {
    return (
      <Box as="span" textOverflow="truncate" color="muted" data-test="property-type">
        {schemaNode.fragment ? 'any' : 'never'}
      </Box>
    );
  }

  if (!isRegularNode(schemaNode)) {
    return null;
  }

  const formats = getApplicableFormats(schemaNode);
  const types = getTypes(schemaNode);

  if (types.length === 0) {
    return (
      <Box as="span" textOverflow="truncate" color="muted" data-test="property-type">
        {formats === null ? 'any' : `<${formats[1]}>`}
      </Box>
    );
  }

  const rendered = types.map((type, i, { length }) => {
    let printedName;
    if (shouldRenderName(type)) {
      printedName = printName(schemaNode);
    }

    printedName ??= type + (formats === null || formats[0] !== type ? '' : `<${formats[1]}>`);

    // It addresses https://github.com/stoplightio/elements/issues/2762.
    // Abstract: instead of displaying "object" or "array[object]" we want to display the actual type of 'object'.
    //
    // The optional 'objectRefType' property is what ti&m Stoplight Elements core supplies for $ref types.
    // In some cases (which ones?), the type information is available in the standard '$ref' property (evaluate both).
    //
    // We cannot redefine the SchemaFragment type as it's defined outside the scope of this project.
    // -> sprinkle with '@ts-ignore'
    //
    if (type === SchemaNodeKind.Array) {
      // @ts-ignore
      if (schemaNode.fragment?.items?.objectRefType) {
        // @ts-ignore
        printedName = `array[${schemaNode.fragment.items.objectRefType}]`;
        // @ts-ignore
      } else if (schemaNode.fragment?.items?.$ref) {
        // @ts-ignore
        printedName = getLastPathSegment(schemaNode.fragment.items.$ref as string);
      }
    } else if (type === SchemaNodeKind.Object) {
      // @ts-ignore
      if (schemaNode.fragment?.objectRefType) {
        // @ts-ignore
        printedName = schemaNode.fragment.objectRefType;
      } else if (schemaNode.fragment?.$ref) {
        printedName = getLastPathSegment(schemaNode.fragment.$ref as string);
      }
    }

    return (
      <React.Fragment key={type}>
        <Box as="span" textOverflow="truncate" color="muted" data-test="property-type">
          {printedName}
        </Box>

        {i < length - 1 && (
          <Box as="span" key={`${i}-sep`} color="muted">
            {' or '}
          </Box>
        )}
      </React.Fragment>
    );
  });

  return rendered.length > 1 ? <Box textOverflow="truncate">{rendered}</Box> : <>{rendered}</>;
};
Types.displayName = 'JsonSchemaViewer.Types';
