# How does sync work?

There are four parts to syncing in PoLo:

* The sync triggers, which are the events that cause the sync function to be called. This includes either individual QSO updates, and a regular "sync loop" that runs periodically.

* The sync function, `doOneRoundOfSyncing` as defined in `src/store/sync/sync.js`, which select which QSOs and Operations to send, and processes any new data received.

* The sync hooks implemented in extensions such as `ham2k-lofi-sync`, which actually perform the communication with the sync server, authentication, etc.

* The actual sync server, which is a completely separate project.

## The Sync Triggers

There are two main ways to trigger a sync:

* When data changes, either `addQSOs`, `saveOperation` or `deleteOperation` thunk actions are dispatched, and these invoke the `sendQSOsToSyncService` or `sendOperationsToSyncService` functions, which in turn invoke the `doOneRoundOfSyncing` function with a "small batch size".

  The "data change actions" mark for syncing any QSOs or Operations that are updated, by setting their `synced` attribute to `false`. Unless the `synced` parameter is specified as `true`, which corresponds to QSOs inbound from the sync server.

* When the sync loop runs, the `doOneRoundOfSyncing` function is called with a "large batch size".

  The sync loop is triggered by the `useSyncLoop` hook, which is called in the `App` component. This loop is triggered every 5 seconds and it uses several debouncing, pagination and timing parameters to decide when to invoke the `doOneRoundOfSyncing` function.

  These parameters have certain defaults (see `src/store/sync/sync.js`), but can also be overriden by the sync server in the `meta` object of the sync response.

## The Sync Function

Regardless of "batch size", the `doOneRoundOfSyncing` function prepares a "sync payload", invokes the sync hook, and processes the response.

* It selects which QSOs and Operations to send, based on their `synced` attribute and the batch size, prioritizing the most recently updated QSOs and Operations.

* It can also include a copy of the current settings.

* It sends the QSOs and Operations to the sync server, using the sync hooks.

* It receives any new data from the sync server, and updates local data accordingly. This includes qsos, operations and sync settings.

* It keeps track of the last sync times for QSOs and Operations, and passes them to the sync server in the `meta` object of the sync payload.

## The Sync Hooks

Sync hooks are implemented in extensions such as `ham2k-lofi-sync`. They are used to send and receive data from the sync server.

They are responsible for managing authentication, calling APIs to submit the payload, receiving any response and passing it back to the sync function.

