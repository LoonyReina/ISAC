'use strict';
const paths={
  "otfs-receiver/statistics/browser-worker.mjs": "labs/otfs-receiver/statistics/browser-worker.mjs",
  "otfs-receiver/statistics/fixed-frame.json": "labs/otfs-receiver/statistics/fixed-frame.json",
  "otfs-receiver/statistics/fixed-frame.mjs": "labs/otfs-receiver/statistics/fixed-frame.mjs",
  "otfs-receiver/statistics/offline-rmse.svg": "labs/otfs-receiver/statistics/offline-rmse.svg",
  "otfs-receiver/statistics/offline-summary.json": "labs/otfs-receiver/statistics/offline-summary.json",
  "otfs-receiver/statistics/otfs-core.mjs": "labs/otfs-receiver/statistics/otfs-core.mjs",
  "otfs-receiver/statistics/statistics.css": "labs/otfs-receiver/statistics/statistics.css",
  "otfs-receiver/statistics/statistics.mjs": "labs/otfs-receiver/statistics/statistics.mjs",

  "otfs-receiver/communication/FREEZE.json": "labs/otfs-receiver/communication/FREEZE.json",
  "otfs-receiver/communication/browser-worker.mjs": "labs/otfs-receiver/communication/browser-worker.mjs",
  "otfs-receiver/communication/kernel.mjs": "labs/otfs-receiver/communication/kernel.mjs",
  "otfs-receiver/communication/protocol.mjs": "labs/otfs-receiver/communication/protocol.mjs",
  "otfs-receiver/communication/simulation.mjs": "labs/otfs-receiver/communication/simulation.mjs",
  "otfs-receiver/lesson-controller.mjs": "labs/otfs-receiver/lesson-controller.mjs",
  "otfs-receiver/lesson-evidence.mjs": "labs/otfs-receiver/lesson-evidence.mjs",
  "otfs-receiver/lesson-model.mjs": "labs/otfs-receiver/lesson-model.mjs",
  "otfs-receiver/otfs-receiver.css": "labs/otfs-receiver/otfs-receiver.css",
  "otfs-receiver/otfs-receiver.mjs": "labs/otfs-receiver/otfs-receiver.mjs",
  "otfs-receiver/sensing/FREEZE.json": "labs/otfs-receiver/sensing/FREEZE.json",
  "otfs-receiver/sensing/browser-worker.mjs": "labs/otfs-receiver/sensing/browser-worker.mjs",
  "otfs-receiver/sensing/evidence.mjs": "labs/otfs-receiver/sensing/evidence.mjs",
  "otfs-receiver/sensing/kernel.mjs": "labs/otfs-receiver/sensing/kernel.mjs",
  "otfs-receiver/sensing/operators.mjs": "labs/otfs-receiver/sensing/operators.mjs",
  "otfs-receiver/sensing/protocol.mjs": "labs/otfs-receiver/sensing/protocol.mjs",
  "otfs-receiver/sensing/validation.mjs": "labs/otfs-receiver/sensing/validation.mjs"
};
module.exports=file=>Object.hasOwn(paths,file)?paths[file]:file;
