#!/usr/bin/env node
// Checks a status document against the kit's schema for its kind. No packages: a small reader of the
// JSON Schema words these schemas use ($ref, type, required, properties, items, additionalProperties,
// const, enum, minimum, maximum, format date-time). Extra fields are allowed on purpose.
//
//   node core/schemas/validate.mjs tmp/ci/progress.json            (kind from the "schema" field or the file name)
//   node core/schemas/validate.mjs some.json --kind lanes
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const VERSION = 1;
export const KINDS = ['progress', 'lanes', 'pulse', 'walks', 'decisions'];

const cache = new Map();
const load = (file) => {
  if (!cache.has(file)) cache.set(file, JSON.parse(fs.readFileSync(path.join(HERE, file), 'utf8')));
  return cache.get(file);
};
export const schemaFile = (kind, version = VERSION) => `${kind}.v${version}.schema.json`;

/** The kind and version a document says it is ("factory/progress@1"), or null. */
export function declared(doc) {
  const m = typeof doc?.schema === 'string' && doc.schema.match(/^factory\/([a-z]+)@(\d+)$/);
  return m ? { kind: m[1], version: Number(m[2]) } : null;
}

/** The kind of a file: its "schema" field, else its name (walks-main.json is walks). */
export function kindOf(doc, file = '') {
  const d = declared(doc);
  if (d) return d.kind;
  const base = path.basename(file).replace(/\.json$/, '');
  return KINDS.find((k) => base === k || base.startsWith(`${k}-`)) ?? null;
}

const typeOf = (v) => (v === null ? 'null' : Array.isArray(v) ? 'array' : typeof v);
const typeOk = (want, v) => [want].flat().some((t) => (t === 'integer' ? Number.isInteger(v) : typeOf(v) === t));

function resolve(ref, file) {
  const [f, pointer = ''] = ref.split('#');
  const target = f || file;
  let node = load(target);
  for (const part of pointer.split('/').filter(Boolean)) node = node?.[part];
  if (!node) throw new Error(`schema ref ${ref} not found from ${file}`);
  return { node, file: target };
}

function check(schema, value, at, file, out) {
  if (schema.$ref) {
    const r = resolve(schema.$ref, file);
    check(r.node, value, at, r.file, out);
    const { $ref, ...rest } = schema;
    if (Object.keys(rest).some((k) => !['description', 'title'].includes(k))) check(rest, value, at, file, out);
    return;
  }
  if (schema.type && !typeOk(schema.type, value)) {
    out.push(`${at || '(root)'}: is ${typeOf(value)}, should be ${[schema.type].flat().join(' or ')}`);
    return;
  }
  if ('const' in schema && value !== schema.const) out.push(`${at}: is ${JSON.stringify(value)}, should be ${JSON.stringify(schema.const)}`);
  if (schema.enum && !schema.enum.includes(value)) out.push(`${at}: ${JSON.stringify(value)} is not one of ${schema.enum.join(', ')}`);
  if (typeof value === 'number') {
    if (schema.minimum !== undefined && value < schema.minimum) out.push(`${at}: ${value} is below ${schema.minimum}`);
    if (schema.maximum !== undefined && value > schema.maximum) out.push(`${at}: ${value} is above ${schema.maximum}`);
  }
  if (schema.format === 'date-time' && typeof value === 'string' && Number.isNaN(Date.parse(value))) out.push(`${at}: "${value}" is not a date and time`);
  if (typeOf(value) === 'object') {
    for (const k of schema.required ?? []) if (!(k in value)) out.push(`${at ? `${at}.` : ''}${k}: missing`);
    for (const [k, v] of Object.entries(value)) {
      const sub = schema.properties?.[k] ?? (typeOf(schema.additionalProperties) === 'object' ? schema.additionalProperties : null);
      if (sub) check(sub, v, at ? `${at}.${k}` : k, file, out);
    }
  }
  if (Array.isArray(value) && schema.items) value.forEach((v, i) => check(schema.items, v, `${at}[${i}]`, file, out));
}

/** Problems with a document as the kind's schema reads it; [] when it holds. */
export function validate(kind, doc) {
  if (!KINDS.includes(kind)) return [`unknown kind "${kind}"; the kinds are ${KINDS.join(', ')}`];
  const d = declared(doc);
  if (d && d.kind !== kind) return [`schema: says ${doc.schema}, read as ${kind}`];
  if (d && d.version > VERSION) return [`schema: ${doc.schema} is newer than this viewer (version ${VERSION})`];
  const out = [];
  check(load(schemaFile(kind)), doc, '', schemaFile(kind), out);
  return out;
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = process.argv.slice(2);
  const i = args.indexOf('--kind');
  const forced = i >= 0 ? args.splice(i, 2)[1] : null;
  let bad = 0;
  for (const file of args) {
    const doc = JSON.parse(fs.readFileSync(file, 'utf8'));
    const kind = forced ?? kindOf(doc, file);
    const problems = kind ? validate(kind, doc) : ['cannot tell the kind; pass --kind'];
    if (!declared(doc) && kind) problems.unshift(`(note) no "schema" field; read as factory/${kind}@${VERSION}`);
    const real = problems.filter((p) => !p.startsWith('(note)'));
    bad += real.length ? 1 : 0;
    console.log(`${file}: ${real.length ? 'does not hold' : 'holds'} (${kind ?? '?'})`);
    for (const p of problems.slice(0, 40)) console.log(`  ${p}`);
  }
  process.exit(bad ? 1 : 0);
}
