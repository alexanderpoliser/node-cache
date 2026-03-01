import { ErrorTemplates, ErrorGenerators, NodeCacheError } from "./types";

export const ERROR_TEMPLATES: ErrorTemplates = {
  ENOTFOUND: "Key `__key` not found",
  ECACHEFULL: "Cache max keys amount exceeded",
  EKEYTYPE: "The key argument has to be of type `string` or `number`. Found: `__key`",
  EKEYSTYPE: "The keys argument has to be an array.",
  ETTLTYPE: "The ttl argument has to be a number.",
};

export function compileErrorTemplates(templates: ErrorTemplates): ErrorGenerators {
  const generators: ErrorGenerators = {};
  for (const code of Object.keys(templates)) {
    const msg = templates[code];
    generators[code] = (args: Record<string, any>) => msg.replace("__key", args.type);
  }
  return generators;
}

export function createError(
  type: string,
  generators: ErrorGenerators,
  data: Record<string, any> = {}
): NodeCacheError {
  const error = new Error() as NodeCacheError;
  error.name = type;
  error.errorcode = type;
  error.message = generators[type] ? generators[type](data) : "-";
  error.data = data;
  return error;
}
