// node --test light/tools/
import test from 'node:test';
import assert from 'node:assert/strict';
import { sections, criteriaProblems, criterionProblems } from './criteria.mjs';

const ITEM = ({ objective = 'A member asks a question and gets a cited answer.', criteria, counter }) => sections(
  `# Ask\n\n## Objective\n${objective}\n\n## Journey steps\n- J-05.1\n\n## Criteria\n${criteria}\n\n## Counterfactuals\n${counter}\n`);

test('a well-formed item holds', () => {
  const s = ITEM({
    criteria: '- Given tenant-a and member-with-grant, when she asks about the supplier contract, then the answer cites the contract version 3.\n- Given member-without-grant, when he asks the same question, then nothing from the contract appears.',
    counter: '- C1: with the citation lookup removed, the answer shows no citation\n- C2: with the grant check removed, the contract text appears',
  });
  assert.deepEqual(criteriaProblems(s), []);
});

test('an item written before the method is not checked', () => {
  assert.deepEqual(criteriaProblems(sections('# Old\n\n## Criteria\n- Create the table\n')), []);
});

test('a build step, an identifier alone and two behaviours are refused', () => {
  assert.match(criterionProblems('Given the contract, when the builder works, then it creates the conversation table', 1)[0], /"creates" after "then" is a build step/);
  assert.match(criterionProblems('QRY-AC-042', 2)[0], /identifier alone/);
  assert.match(criterionProblems('Given a, when b, then c, and then d', 3).join('\n'), /2 "then"s/);
  assert.match(criterionProblems('When she asks, then she sees it', 4).join('\n'), /start with "Given/);
  assert.match(criterionProblems('Given a, when we migrate the schema, then she sees it', 5).join('\n'), /implementation word/);
});

test('a user action with "adds" before "then" is not a build step', () => {
  assert.deepEqual(criterionProblems('Given an editor, when she adds a tag, then the tag shows on the document', 1), []);
});

test('every criterion needs its own counterfactual line', () => {
  const s = ITEM({
    criteria: '- Given a, when b, then c.\n- Given d, when e, then f.',
    counter: '- C1: x\n- C3: y\n- not numbered',
  });
  const p = criteriaProblems(s).join('\n');
  assert.match(p, /C3: no criterion 3/);
  assert.match(p, /C2: no counterfactual/);
  assert.match(p, /not "C<n>: \.\.\."/);
});

test('an empty or long objective and empty journey steps are refused', () => {
  const s = sections('# x\n\n## Objective\n<!-- one sentence -->\n\n## Journey steps\n\n## Criteria\n');
  const p = criteriaProblems(s).join('\n');
  assert.match(p, /no objective/);
  assert.match(p, /no journey steps/);
  assert.match(criteriaProblems(sections('# x\n\n## Objective\nOne.\nTwo.\n')).join('\n'), /2 lines/);
});
