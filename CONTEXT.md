# LotFoundry Domain Context

LotFoundry evaluates accessory dwelling unit (ADU) feasibility, financial yield, and spatial fit for residential properties across the United States.

## Language

### Parcel & Geography

**Parcel**:
A legally platted tract of residential real property characterized by boundary geometry, lot area, street address, and municipal jurisdiction.
_Avoid_: Lot (when referring to legal entity), property, land tract

**Live Parcel**:
A parcel whose geometry, dimensions, setbacks, and jurisdiction attributes are resolved from authoritative municipal GIS or commercial spatial registries.
_Avoid_: Real parcel, dynamic lot, external parcel

**Demo Preset**:
A curated, synthetic parcel representing typical residential conditions in target metropolitan areas (e.g. Seattle R-1, Portland Corner, Austin Suburban) used when live provider data is unavailable or exploring unauthenticated.
_Avoid_: Default lot, mock parcel, sample property

**Parcel Resolution**:
The deterministic process of resolving land geometry, dimensions, setbacks, existing structures, and market economic basis from geographic coordinates and optional street address.
_Avoid_: Parcel lookup, parcel fetching, parcel scraping

**Provider Chain**:
The ordered fallback sequence of spatial data providers (Paid Parcel API &rarr; Public County GIS &rarr; Regional Demo Preset) executed during parcel resolution.
_Avoid_: Fallback stack, geodata pipeline, parcel waterfall
