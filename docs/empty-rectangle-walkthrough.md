# Empty Rectangle diagram walkthrough

The game and replay share the approved nine-scene explanation: inspect the box's candidate distribution, explain its four empty positions, identify the external pair, assume the target, exclude the far pair candidate, force the near candidate, remove candidates on one arm, expose the contradiction, then withdraw assumptions and show the original elimination.

The introduction gives the standard definition: within a box, all candidates for one digit lie on one row and one column; the four cells outside that row and column lack that candidate and form the empty rectangle. Those positions are hatched and labeled for accessibility. Player copy introduces the pattern directly, without referring to misconceptions from the design discussion. The box outline and full surrounding pattern stay visible while current houses are highlighted.

The approved example uses box 6 with 5 in R5C9/R6C8 and the row-9 pair R9C5/R9C8. Assuming R5C5=5 excludes R9C5, forces R9C8=5, excludes R6C8, then forces R5C9=5, contradicting row 5. The presentation verifies the pre-hint candidate snapshot, not just the shape of the saved premise list.

For a remaining arm with multiple candidates, none is falsely displayed as a forced value. The walkthrough instead shows that the assumption rules out every remaining position and leaves the box without a place for the digit. Both arm orientations, arbitrary digits and rotated boards are supported. Unverifiable patterns fall back to the existing presentation. No native solver, persisted contract or hint application semantics change.

Scope: this walkthrough covers the shapes currently emitted by `findEmptyRectangle`: two to four box candidates, no focused candidate at the row/column intersection, and an external conjugate pair. It does not claim support for every published variant. The [HoDoKu reference](https://hodoku.sourceforge.net/en/tech_sdp.php#er) also includes standard examples with a candidate at the intersection and a dual form, neither of which the current detector emits as such. Two-candidate examples overlap Turbot Fish, and their classification as Empty Rectangle varies by convention. Adding detection for these other forms is a separate solver change.

Tests cover the actual example in four languages, filled cells in the empty rectangle, rotated/renumbered patterns, grouped arms, invalid snapshots, the native fixture, light/dark hatching and outlines, backward navigation, final overlay cleanup, game application and saved replay.
