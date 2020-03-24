const assign = (
  object: Record<string, any>,
  path: (string | number)[],
  value: unknown
): any => {
  const key = path.shift();
  if (key === null || key === undefined) {
    return object;
  }
  if (path.length >= 1) {
    const nextObject =
      object !== null && object !== undefined && key in object
        ? object[key]
        : typeof path[0] === "number" && Number.isInteger(path[0])
        ? []
        : {};

    value = assign(nextObject || {}, path, value);
  }

  object[key] = value;
  return object;
};

export { assign };
