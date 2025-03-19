### Links

- [Calendar](https://docs.google.com/spreadsheets/d/e/2PACX-1vTav3mnE240lRPPs1RRySJ2QRPJsgq3-ZKCYRAgfLZmwS5uAU_CTh03Mw94LFzafiZeOSwqEscAyI9x/pubhtml?gid=771161833&single=true)

- [Cabrillo Names](https://www.contestcalendar.com/cabnames.php)

### Exchange

Defaults to `"exchange": ["Location"]`. [Not Implemented yet]

Can also be defined as `inStateExchange` and `outOfStateExchange` to have different exchanges for in-state and out-of-state stations. [Not Implemented yet]

- `Number`: Has to be listed first (VA)
- `Location`: Includes suggestions from County Lists
- `Name` (MN) [Not Implemented yet]
- `TheirNumber` (NS) [Not Implemented yet]
- `OurNumber` (NS) [Not Implemented yet]

Relevant `"options"`:

- `dxLocationIsPrefix`: If false, DX is logged as just "DX". If true, DX location is logged as prefix. (OK, ID, LA)

### Points

The `"points":` section is used to define the point values for each exchange item.

- `PHONE`: Phone points
- `CW`: CW points
- `DATA`: Data points
- `_Rover_`: Contacting a rover station, overrides other modes. [Not Implemented yet]
- `_QRP_`: Operating as QRP, overrides other modes. [Not Implemented yet]

Additionally, the `"pointMultipliers":` section is used to define additional point multipliers for certain conditions.

- `PORTABLE`: Portable points multiplier
- `MOBILE`: Mobile points multiplier

Relevant `"options"`:

- `qsosPerBandMode`: If true (default), QSOs are counted per band and mode (Most). If false they are counted only once overall, unless `qsosPerBand` or `qsosPerMode` is also true.
- `qsosPerBand`: If true, QSOs are counted per band. (?)
- `qsosPerMode`: If true, QSOs are counted per mode. (?)
- `inStateToOutOfStatePointsDouble`: If true, in-state to out-of-state QSOs are worth double points (Used by SC)
- `dataAndCWCountAsSameMode`: If true, DATA and CW are counted as the same mode. (LA)

### Multipliers

By default, out-of-state multipliers are only Counties, and in-state multipliers are
Counties, US states (including HI and AK), Canadian Provinces and one DX multiplier.

And also by default, multipliers are awarded per band and mode.

Relevant `"options"`:

- `stateCountsForInState`: If true, an in-state station gets the state as a multiplier when working any other station in the state. This is usually implied in the rules if in-state multipliers lists 50 states. If it says 49 states, then this option should be false.
- `dcCountsAsMaryland`: If true, the District of Columbia will be counted as Maryland. If the rules say "50 states" and no mention of DC, then this option should be true. If the rules mention DC explicitly, then this option should be false.
- `selfCountsForCounty`: If true, a station can count itself as a multiplier for the county of operation. (NC, VA). Some QPs require a minimum number of QSOs, but we don't support this variation yet.
- `selfMobileCountsForCounty`: If true, a station can count itself as a multiplier for the county of operation when operating mobile or portable. Some QPs require a minimum number of QSOs, but we don't support this variation yet. (TN)
- `multsPerBandMode`: If true (default), multipliers are awarded per band and mode (Most). If false they are awarded only once overall, unless `multsPerBand` or `multsPerMode` is also true.
- `multsPerBand`: If true, multipliers are awarded per band. (VT, TN)
- `multsPerMode`: If true, multipliers are awarded per mode. (ID)
- `dxIsMultiplier`: If true (default), DX stations count as a single multiplier "DX". (Many)
- `dxEntityIsMultiplier`: If true, each DX Entity Prefix is awarded as a multiplier. (Many)
- `dxEntityMultiplierMax`: If set, limits the number of DX Entity Prefixes that can be awarded as multipliers. (7QP)
- `specialCallIsMultiplier`: If true, special calls are awarded as multipliers. (VT)

### Bonuses

- `bonusPostMultiplier`: If true (default), bonus points are added after the multiplier is applied. (BC, SC, NC)
- `bonusPerBandMode`: If true, bonus points are awarded per band and mode. (Some)

### Other Options

- `onlineLookup`: If false, should not use online lookup for states or counties. (VT) [Not Implemented yet]
- `selfSpotting`: If true, stations can spot themselves. (Many) [Not Implemented yet]
- `countyLine`: Stations can operate from two counties at the same time. (Many) [Not Implemented yet]
- `removeCountySuffixes`: If true, county suffixes are removed from logged callsigns in Cabrillo Output. (ID) [Not Implemented yet]

### TODO

- Capture location from roaming suffix when logging (i.e. KI2D/SUL)
- Implement specialCallIsMultiplier
- Implement dxIsMultiplier
- Implement dxEntityIsMultiplier
- Implement dxLocationIsPrefix
- Implement removeCountySuffixes
- Implement dataAndCWCountAsSameMode
- Implement support for selfCountsForCounty and selfMobileCountsForCountywith a minimum number of QSOs
- Implement dxEntityMultiplierMax (7QP)
- 7QP allows for multi-county locations to be entered with an abbreviated second location, so that "ORDES/ORJEF" can be entered as "ORDES/JEF".
