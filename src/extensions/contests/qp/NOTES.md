### Links

- [Calendar](https://docs.google.com/spreadsheets/d/e/2PACX-1vTav3mnE240lRPPs1RRySJ2QRPJsgq3-ZKCYRAgfLZmwS5uAU_CTh03Mw94LFzafiZeOSwqEscAyI9x/pubhtml?gid=771161833&single=true)

- [Cabrillo Names](https://www.contestcalendar.com/cabnames.php)

### Exchanges

- `Location:county/state/province/dx`
- `Name` (MN)

### Multipliers

- `perBand:county/state/province/entity`
- `perBand:`, `perBandAndMode:`, `overall:`
  - `county` State Counties
  - `state` US States (with or without DC counting separately)
  - `province` Canadian Provices and Territories
  - `entity` DX Entity Prefix (excluding Alaska & Hawaii)
  - `dx` Single Multiplier for any DX Entity
- `powerMultiplier` Special point multipliers for power categories

### Uniqueness

- `perBandAndMode`

### Options

- `dcCountsAsMaryland`: If true, the District of Columbia will be counted as Maryland. (Many)
- `stateCountsForInState`: If true, an in-state station gets the state as a multiplier when working any other station in the state. (SC, NY)
- `selfCountsForCounty`: If true, a station can count itself as a multiplier for the county of operation. (NC)
- `onlineLookup`: If false, should not use online lookup for states or counties. (VT)
- `selfSpotting`: If true, stations can spot themselves. (Many)
- `countyLine`: Stations can operate from two counties at the same time. (Many)
- `bonusPostMultiplier`: If true, bonus points are added after the multiplier is applied. (BC, SC, NC)
- `inStateToOutOfStatePointsDouble`: If true, in-state to out-of-state QSOs are worth double points (Used by SC)
- `bonusPerBandMode`: If true, bonus points are awarded per band and mode. (Many)
- `multsPerBandMode`: If true, multipliers are awarded per band and mode. (Many)
- `multsPerBand`: If true, multipliers are awarded per band. (VT)
- `multsPerMode`: If true, multipliers are awarded per mode. (ID)
- `dxIsMultiplier`: If true, DX stations are awarded multipliers. (Many)
- `dxEntityIsMultiplier`: If true, DX Entity Prefix is awarded a multiplier. (Many)
- `specialCallIsMultiplier`: If true, special calls are awarded multipliers. (VT)
- `dxLocationIsPrefix`: If true, DX location is logged as prefix. (OK, ID)
- `removeCountySuffixes`: If true, county suffixes are removed from logged callsigns in Cabrillo Output. (ID)

### TODO

- Capture location from roaming suffix when logging (i.e. KI2D/SUL)
- Implement specialCallIsMultiplier
- Implement dxIsMultiplier
- Implement dxEntityIsMultiplier
- Implement dxLocationIsPrefix
- Implement removeCountySuffixes
