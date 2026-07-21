# OpenFreeMap Compare — Walkthrough

This document walks through the OpenFreeMap Compare app showing two style approaches
side-by-side: **Liberty** (left) and **Outdoor** (right). It explains why roads work
natively in OpenMapTiles vector tiles but hiking routes do not, using a specific
example from the Monte Grappa area (Italy).

---

## The App

Open the Compare app at `/#13.79/45.82253/11.77781` and split the screen at
approximately the centre to see both panels.

| Panel                 | Style       | Focus                                                                                                                                          |
| --------------------- | ----------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Left (drag to reveal) | **Liberty** | General-purpose — road network prioritised, minimal trail detail                                                                               |
| Right                 | **Outdoor** | Activity-oriented — trails emphasised via `road_path_pedestrian` re-styling, hillshading, and a raster hiking overlay from waymarkedtrails.org |

---

## What you see

### Left (Liberty)

- **SP140** — a provincial road (`highway=secondary`, `ref=SP140`, `name=Via Casale`)
  rendered as a solid orange line with a numbered white shield label (`SP140`).
  Three instances of the shield are visible along the road.
- Roads dominate the visual hierarchy.
- Paths and trails are faint grey dashes, barely visible.
- No hillshading or terrain relief.
- No hiking trail numbers.

### Right (Outdoor)

- The same base OpenMapTiles tiles as Liberty.
- **Extensive red dotted lines** across the mountain slopes — these are the
  `road_path_pedestrian` layer, re-styled by the outdoor theme to use a bold
  orange-red (`#c05a2a`) at all zoom levels. These prove the path **geometry is
  present in the vector tile** — the `transportation` layer with `class=path`
  is there, just styled very differently in each theme.
- **Hillshading** from a raster DEM gives 3D terrain context.
- **Numbered trail shields** (190, 196, 199) — these come from the
  **waymarkedtrails.org raster overlay**, not from the vector tiles.
- SP140 road is there geographically but its **SP140 shield label is absent**
  (the `highway-shield-non-us` layer is suppressed or re-ordered by the outdoor
  style).

---

## The core question

Both panels use the same vector tile source (`openmaptiles`). The outdoor
theme proves the path **geometry** is in the tile — the `road_path_pedestrian`
layer renders the member ways of hiking routes as red dotted lines.

So why can't the outdoor theme also render the **hiking route number** (e.g. "190")
natively, the way Liberty renders "SP140"?

---

## Why roads work natively

SP140 is a single OSM **way** with `highway=secondary` and `ref=SP140`.

OpenMapTiles processes all OSM `highway=*` ways into two layers:

| OpenMapTiles layer    | What it contains                             | What Liberty uses                                                                 |
| --------------------- | -------------------------------------------- | --------------------------------------------------------------------------------- |
| `transportation`      | Road geometry + `class` + `subclass`         | Line styling (colour, width)                                                      |
| `transportation_name` | Road name + `ref` + `ref_length` + `network` | The `highway-shield-non-us` layer reads `ref` → renders the numbered white shield |

The data path is:

```
OSM way → OpenMapTiles tile → layer:transportation_name, field:ref="SP140"
       → Liberty highway-shield-non-us → MapLibre renders "SP140" on the map
```

All the required data travels in a single hop from OSM → tile → renderer. No
external data sources needed.

---

## Why hiking routes don't

[Hiking Route 190](https://www.openstreetmap.org/relation/6457315) is an OSM
**relation** (ID `6457315`) with tags:

```
type=route
route=hiking
ref=190
network=lwn
cai_scale=E
osmc:symbol=red:red:white_stripe:190:black
```

It has four member ways. Those ways go into `transportation` as `class=path`
and `class=track`. But the **relation-level tags** (`ref=190`, `network=lwn`,
`cai_scale=E`) do not exist in any OpenMapTiles layer.

```
OSM way members → transportation[class=path]  ← geometry is here
OSM relation      → ╔══ LOST ══╗              ← ref, network are here
                    ║  No OpenMapTiles layer   ║
                    ║  preserves relation tags ║
                    ╚═══════════╝
```

The `transportation_name` layer has `route_1_ref` / `route_1_network` fields,
but these are populated from OSM **route=road** relations (for road concurrencies
like European E-roads). They are never populated from `route=hiking` relations.

**Result:** From the vector tiles alone, there is no way to:

- Display "190" as a label on the trail (no ref data available)
- Style trails by route importance or network level (no route metadata)
- Show or hide trails by zoom level based on route significance

---

## How waymarkedtrails fills the gap

The waymarkedtrails.org raster overlay works around this limitation by running
its own data pipeline that:

1. Reads OSM route relations directly
2. Resolves member geometries and styles them with route refs and colours
3. Renders the result as pre-rendered **raster tiles**
4. The outdoor theme overlays these at 70% opacity

This is an effective demonstration but it is not a native vector solution — it
can't be interactively queried, styled, or filtered in MapLibre the way vector
layers can.

---

## Summary

| Feature                | OSM type                                           | In OpenMapTiles?                                     | Native label?                             |
| ---------------------- | -------------------------------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| SP140 road             | Way                                                | Yes — `transportation_name[ref]`                     | Yes — Liberty reads `ref` directly        |
| Route 190 hiking trail | Relation (member ways are present as `class=path`) | Way geometry only — **relation-level tags are lost** | No — needs waymarkedtrails raster overlay |

The data needed to label and organise hiking routes exists in OSM but is **not
materialised in the OpenMapTiles vector tile schema**. That's the fundamental
gap this comparison demonstrates.
