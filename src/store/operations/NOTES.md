# Operation Store Notes

Operations are stored in the filesystem in the following structure:

```
ops/
  ops/1/
    info.json
      { call: "KI2D", name: "General Log" }
    qson.json
      Full QSON data
  ops/2/
    info.json
      { call: "KI2D", type: "POTA", name: "K-5279" }
    qsos.json
```
