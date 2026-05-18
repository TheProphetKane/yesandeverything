# htbh-sprite-tuning-table-refresh-024 result

- Started: 2026-05-17T19:45
- Finished: 2026-05-17T20:00
- Status: done
- Prompt: GDD section 3 Live sprite tuning reference 33 minors behind pill; add 16 missing building rows; flip 4 unit rows to wired; bump section heading version stamp.

## What was done

Rebuilt the entire `<tbody>` of the Section 3 tuning table from mechanical reads of every `source/buildings/*.gd` `_ready()`.

Added 18 building rows under reorganized category headers:

- New Power header: Steam Plant, Coal Plant.
- New Wonders (Tier 4) header: Cornucopia, Perpetual Engine, Pyre of the Dead, The Sanctum.
- Added to Economy: Brewery, Substation (file warehouse.gd, formerly Storage Shed), Warehouse (file storehouse.gd), Hunter's Camp (renamed from Hunter's Cabin), Market, Oil Refinery, Munitions Workshop.
- Added to Military: Research Lab.
- Added to Defense: Reinforced Wall (subclass of Stone Wall with modulate tint), Ballista Tower, Mortar Tower, Repeater Tower.

Refreshed every existing row since the v0.61.0 cell-halving sweep moved every scale + texture_offset. The Substation rename + Hunter's Camp rename + Warehouse/Storehouse file swap are now reflected.

Flipped Soldier / Tommy Gunner / Shotgunner / Sniper rows from "adopted v0.26.35, not yet wired" to wired (Barracks.TRAIN_RECIPES per v0.35.1) with current SPRITE_SCALE 0.3125 + foot anchor -27.5 px. Scout row also updated from 0.625 / -55 px to current 0.3125 / -27.5 px.

Section heading version stamp bumped v0.26.68 to v0.61.2 to match the pill.

GDD pill bumped v0.61.1 to v0.61.2 PATCH with changelog entry.

## Files touched

- X:\HereThereBeHordes\docs\GDD.html (table tbody + header version stamp + meta-pill + changelog footer entry)
- X:\YesAndEverything\.work-queue.json (status flip to done)

## Followups recommended

- The Section 3 table is still a hand-maintained snapshot. Item 017 (anti-drift-htbh-numbers-tab-autogen) covers the structural fix of generating it from .gd source at publish time. Section 3 sprite tuning could ride the same pipeline once that lands.
- One subtle correctness item caught while rewriting: `wood_wall.gd` SPRITE_SCALE array values look halved twice (0.1525 / 0.0853). The v0.61.0 sweep halved them once, but if the pre-sweep values were already the 0.305 / 0.171 the v0.32.4 changelog suggests, the post-halve values would land at 0.1525 / 0.0855, which matches what is in source. Logging this here as a sanity check rather than a fix; values are what the code currently has.
