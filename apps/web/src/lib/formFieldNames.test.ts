import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * No form control may be named after a property of the element that holds it.
 *
 * This test is here because of a real bug that cost a whole page. The settings
 * form had a `<select name="nodeType">`. An `HTMLFormElement` publishes its
 * named controls as properties of itself, and — uniquely among DOM interfaces —
 * that named getter is specified to *override* the built-ins rather than defer
 * to them. So `form.nodeType` stopped being the number 1 and started being the
 * `<select>` element.
 *
 * React's hydration reads `node.nodeType` to decide whether the DOM node it is
 * standing on is an element it can reuse. It read a `<select>`, concluded the
 * server had not sent a `<form>` at all, threw away the server markup for the
 * whole route and re-rendered it in the browser. Nothing looked broken; the
 * page simply rendered twice and the console carried a hydration error.
 *
 * The failure mode is silent and the cause is three layers from the symptom, so
 * the defence is a list rather than a habit.
 *
 * `id`, `name`, `title` and `class` are deliberately absent. They shadow real
 * IDL attributes of the form too, but nothing in React's hydration path or in
 * Jade reads them back off a form element, and `name="id"` carries the record
 * id in a dozen places. The names below are the ones that break tree-walking or
 * submission — the two things something else is guaranteed to do to the form.
 */
const RESERVED = new Set([
  // Node and Element: what React walks during hydration.
  'attributes',
  'baseURI',
  'childNodes',
  'children',
  'classList',
  'className',
  'dataset',
  'firstChild',
  'firstElementChild',
  'hidden',
  'innerHTML',
  'isConnected',
  'lastChild',
  'lastElementChild',
  'localName',
  'namespaceURI',
  'nextElementSibling',
  'nextSibling',
  'nodeName',
  'nodeType',
  'nodeValue',
  'outerHTML',
  'ownerDocument',
  'parentElement',
  'parentNode',
  'prefix',
  'previousElementSibling',
  'previousSibling',
  'style',
  'tagName',
  'textContent',
  // HTMLFormElement: what submitting the form needs.
  'acceptCharset',
  'action',
  'checkValidity',
  'elements',
  'encoding',
  'enctype',
  'length',
  'method',
  'noValidate',
  'reportValidity',
  'requestSubmit',
  'reset',
  'submit',
  'target',
]);

const ROOTS = ['../app', '../components'].map((dir) =>
  fileURLToPath(new URL(dir, import.meta.url)),
);

/** Every `.tsx` under the roots, since any of them may render a control. */
function sources(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sources(path);
    return entry.isFile() && entry.name.endsWith('.tsx') ? [path] : [];
  });
}

/**
 * `name="…"` on a literal `input`, `select`, `textarea` or `button`.
 *
 * Deliberately a regex over the source rather than a parse. A `name` built at
 * runtime cannot be checked here anyway, and every control in Jade spells its
 * name as a literal — which is itself worth keeping true.
 */
const CONTROL = /<(input|select|textarea|button)\b[^>]*?\bname="([^"]+)"/g;

describe('form control names', () => {
  it('never shadow a property of the form element', () => {
    const offences: string[] = [];

    for (const file of ROOTS.flatMap(sources)) {
      const source = readFileSync(file, 'utf8');
      for (const [, tag, name] of source.matchAll(CONTROL)) {
        if (RESERVED.has(name!)) {
          offences.push(`${file.slice(file.indexOf('/src/') + 1)}: <${tag} name="${name}">`);
        }
      }
    }

    expect(offences).toEqual([]);
  });

  /**
   * The regex has to actually find things, or the test above passes by seeing
   * nothing. The settings form is the one that broke, so it is the one checked.
   */
  it('finds the controls it is meant to be checking', () => {
    const settings = fileURLToPath(new URL('../app/settings/page.tsx', import.meta.url));
    const names = [...readFileSync(settings, 'utf8').matchAll(CONTROL)].map(([, , name]) => name);

    expect(names).toContain('nodes');
    expect(names).toContain('ayanamsa');
    expect(names).not.toContain('nodeType');
  });
});
