// Preserve Node's registration summaries and outcomes separately from test console output.
// A successful automatic file wrapper has no per-file registration summary and is not discovery.
export default async function* (source) {
  for await (const event of source) {
    if (['test:summary', 'test:pass', 'test:fail', 'test:stdout', 'test:stderr'].includes(event.type)) yield `${JSON.stringify(event)}\n`;
  }
}
