# Deep modules and real seams

For anyone designing or judging an interface between two parts.

1. **Deep beats shallow.** A good interface is small and hides a lot. The interface is everything a caller must know: types, rules that always hold, order, failure answers, settings, speed.
2. **The deletion test.** Imagine the part or the seam gone. If its complexity vanishes, it was a pass-through: remove it. If the complexity reappears in every caller, it earns its place.
3. **One taker is a guess; two are a seam.** A seam only one part takes, that nothing gives and no criterion needs, is a candidate to remove.
4. **Tests cross the interface callers cross.** If a test must reach past it, the interface has the wrong shape: change the shape, not the test.
5. **Three questions for every interface:** can it have fewer methods? simpler parameters? can more be hidden inside?

Check: every seam kept passes the deletion test in one line of the note; every seam removed names the rule that removed it.
