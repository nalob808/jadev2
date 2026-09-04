/**
 * The interpretation layer.
 *
 * Two constitutional rules shape everything here.
 *
 * **Interpretation is grounded** (CLAUDE.md #5). No statement is returned
 * without the computed factors that produced it, and those factors are shown
 * beside the text rather than kept as metadata. That rules out a library of
 * pre-written paragraphs, because "Mars in the 7th" written once cannot say
 * which Mars, at what degree, in what dignity — it is the same text for
 * everyone and therefore grounded in nothing.
 *
 * **No death, disease, or legal outcomes** (CLAUDE.md #6). Enforced in
 * `readingFor` by dropping any statement that carries the vocabulary, so a
 * future caller cannot route around it by composing text elsewhere.
 *
 * The significations libraries do double duty: they are what a reading is
 * composed from, and they are what the /learn pages display. One place where
 * "what the 7th house means" is written down means the lesson and the reading
 * can never drift apart.
 */
export * from './significations/houses.js';
export * from './significations/signs.js';
export * from './significations/grahas.js';
export * from './reading.js';
export * from './daily.js';
export * from './synastry.js';
export * from './prep.js';
