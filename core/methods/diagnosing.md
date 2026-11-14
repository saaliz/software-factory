# Diagnosing a defect

For a failing test, a flaky test, a slow test or endpoint, anything that "fails only sometimes". Go through the gates in order; a gate is passed only by its evidence.

1. **The loop.** One command that goes red on the exact symptom, quick, run once already. A flaky failure gets a loop that repeats it until it fails. A slow one gets a baseline in seconds. No theory before the loop exists. *Evidence:* the command and its output.
2. **The real symptom, smallest.** Confirm the loop shows the reported failure, not a nearby one. Cut the repro until each remaining piece is needed. *Evidence:* the minimal repro.
3. **Hypotheses.** Three to five, ranked, each with a prediction a probe can test. *Evidence:* the written list.
4. **Probes.** One variable per probe, tied to one prediction. Tag added logs `[DEBUG-<words>]`. *Evidence:* each prediction confirmed or refuted.
5. **The fix and its test.** A test that fails, then the fix, then the test passes, then the loop from gate 1 is green.
6. **Clean up.** Every `[DEBUG-...]` line and throwaway file removed; the confirmed hypothesis named in the commit message.

Quote logs with secrets as `<REDACTED>`. A cause still unknown after gate 4 is reported with the refuted hypotheses, never as "timing" or "load" alone.
