# Local purchasing-power exhibit

MAR-186 follow-up, owner-approved local viewing first. No remote push or deployment.

The exhibit sits after the stress hero and before the research metrics. A realistic
generated fictional banknote connects the abstract idea of declining purchasing
power to a 100-unit basket. The slider is illustrative loss, never historical years
or dollar forecasts. 35% loss means the same note buys 65 of the original 100 units.

Art direction retains the approved paper texture, warm fragments, negative space,
and restrained serif headline. The implementation is a texture-based 2.5D Canvas
illustration, not a physically simulated 3D banknote. Organic polygon fragments and
a jagged clipping boundary replace the earlier square tiles. The visible note area
is an artistic metaphor; the numeric readout supplies the precise relationship.

Native Canvas needs no new library. Playback is finite, explicitly initiated, and
pauses when hidden or offscreen. Reduced motion disables playback but preserves
the slider and static positions. Image fallback and HTML readouts survive Canvas
failure. No score/data/provider/watchlist/dependency changes are in scope.

Asset: `public/images/banknote-texture.png`, generated specifically for this
prototype with imagegen. It depicts a fictional United Commonwealth note, not a
historical specimen. The final source is
`exec-17a489d7-9e46-437f-b697-05f648d9a6de.png`: an intact antique engraved note
with worn ivory paper, edited to replace the initial checkerboard with pure black.
Screen blending integrates that black backdrop into the dark stage.

Verification: required lint, typecheck, tests, production build; local desktop and
mobile screenshots, slider/keyboard/play/pause/reset, reduced motion, offscreen
pause, image fallback. Independent review before handoff. Rollback: revert only
the scoped local feature commit. Production must stay unchanged for local review.
