# Test first

Rules 1 to 4 are for builders; rules 5 to 13 for everyone who writes a test.

1. **One criterion at a time.** Pick the next criterion; write its unit test; see it fail for the reason you expect; write only the code that passes it; see it pass. A test that passes at once has proved nothing yet: break the code it covers, see it fail, put the code back, and say so in the note.
2. **Unit tests grow with the code, one per cycle.** The sealed tests already hold the acceptance level; unit tests written in bulk ahead of the code check imagined behaviour.
3. **Let each green shape the next test.** Write code only for the criterion in hand.
4. **Refactor at the end of the work item,** with the required tests green, before the review. During repairs, use `factory/methods/affected-testing.md`: changed-behavior regressions and direct contracts after each fix, compile/static/seal/source/boundary checks as applicable, full commands at their explicit checkpoints. Keep the failing regression or counterexample line; targeted green alone cannot prove completion.
5. **Expected values come from outside the code:** a literal from the criterion, a worked example in the requirements. Never recompute the answer with the code's own logic.
6. **Test through the public interface:** the API, the screen, the event. A test reaches no private method and no table another part owns.
7. **Fake only what is outside the part under test.** A collaborator inside it is used for real.
8. **Each criterion proved once, at the lowest level that can prove it.** A second test only where a test could pass with nothing happening: refusals and permissions, privacy, safety, money, something that must not be sent. A refusal has a control beside it: the same request with one input changed, which succeeds. Without it the refusal may be passing for another reason; on the second project one refused a made-up account, which the code refuses whatever the rule.
9. **A time budget.** A test over 3 seconds carries one comment line saying why. On the first project, 31 tests over 10 seconds took 58% of all test time.
10. **Heavy setup once.** Setup over 5 seconds lives in a fixture shared by the tests that only read it; a test that writes gets its own data.
11. **The smallest data that proves the criterion.**
12. **Nothing changed on shared test state is left changed:** the clock, switches and fakes are put back.
13. **A flaky test is set aside the same day** and diagnosed by `diagnosing.md`; it is never retried until green.

14. **A notice's words are sealed.** Any notice, alert or message the work item sends a person, in words of its own, gets a row that quotes the exact words in each language, the template key and its fields, fixed at the seal and not by the builder (proposed from the School ERP trial, 25–26 November 2026; the kit has no proof table of its own, so the rule sits here). The words must be true in every end state the notice can be read in (sent, settled, retried, dead-lettered, unread by its reader), so a word that promises an outcome the code may not reach is refused. In a gendered language such as Arabic the words address the reader neutrally, with no gendered verb or imperative where the reader's gender is not known. The test asserts the words in the language tested; the other languages are held to the row by a check that reads the template catalogue.

Check: every criterion has one sealed test that names it, and a second only under rule 8; every test has been seen to fail.
