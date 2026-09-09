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
# Archive selector extension

The exhibit derives its choices from the homepage research dataset. Selection remounts the scene, stopping playback and resetting loss to zero. Greek drachma uses an intact note because the archive describes euro replacement. The 1944 example note is explicitly dated and is not presented as the note exchanged in 2002.

All purchasing-power percentages remain user-controlled illustrations, not historical measurements. The source photographs are linked and credited beneath each note; provenance and licenses are in `lib/data/currency-artwork.ts`. Images were downloaded from those Wikimedia Commons file pages and reduced in resolution/JPEG quality for local delivery. Display-only framing, tilt and masking are applied. The Greek photo is CC BY-SA 4.0; its adapted display retains attribution and the license link. The Venezuelan note visibly reads 23 June 2015. No historical price series or source records changed.

Local review only: no push, merge or deployment.
