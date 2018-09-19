/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

/* eslint-disable mozilla/no-define-cc-etc */
const {utils: Cu, classes: Cc, interfaces: Ci} = Components;

/* eslint-disable mozilla/use-chromeutils-import */
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ClientID.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "UpdateUtils",
  "resource://gre/modules/UpdateUtils.jsm");

Cu.importGlobalProperties(["crypto", "TextEncoder", "XMLHttpRequest"]);

// we want to control this on the client rather than
// depending on server-side throttling, as throttling
// cannot account for any other concurrent gradual roll-outs.
const ENABLE_PROB = 0.01;
const DEBUG = false;
const OPT_OUT_PREF = "toolkit.telemetry.coverage.opt-out";
const TELEMETRY_ENABLED_PREF = "datareporting.healthreport.uploadEnabled";
const REPORTING_ENDPOINT = "https://telemetry-coverage.mozilla.org/submit/coverage/coverage/1";

/* eslint-disable no-console */
function debug(msg, obj) {
  if (DEBUG) {
    console.log(`Telemetry measurement: ${msg}`); // eslint-disable-line no-console
    if (obj) {
      console.log("Telemetry measurement JS object:", obj);
    }
  }
}

function reportTelemetrySetting() {
  const enabled = Services.prefs.getBoolPref(TELEMETRY_ENABLED_PREF, false);

  const payload = {
    "appVersion": Services.appinfo.version,
    "appUpdateChannel": UpdateUtils.getUpdateChannel(false),
    "osName": Services.appinfo.OS,
    "osVersion": Services.sysinfo.getProperty("version"),
    "telemetryEnabled": enabled | 0
  };

  const uuidGenerator = Cc["@mozilla.org/uuid-generator;1"].getService(Ci.nsIUUIDGenerator);
  // generateUUID() gives a UUID surrounded by {...}, slice them off.
  const uuid = uuidGenerator.generateUUID().toString().slice(1, -1);

  const endpoint = `${REPORTING_ENDPOINT}/${uuid}`;

  debug(`posting to endpoint ${endpoint} with payload:`, payload);

  const xhr = new XMLHttpRequest();
  xhr.open("PUT", endpoint);
  xhr.setRequestHeader("Content-type", "application/json; charset=utf-8");
  xhr.addEventListener("loadend", e => {
    const result = xhr.responseText;
    if (xhr.readyState == 4 && xhr.status == "200") {
      debug("success:", result);
    } else {
      debug("failed:", result);
    }
  });
  xhr.send(JSON.stringify(payload));

  return uuid;
}

function generateHash(seed, label) {
  Cu.importGlobalProperties(["crypto"]);

  const hasher = crypto.subtle;
  const hash = hasher.digest("SHA-256", new TextEncoder("utf-8").encode(seed + label));

  return hash;
}

/* eslint-disable no-unused-vars */
/* eslint-disable mozilla/use-default-preference-values */
function install(data, reason) {
  debug("Installing", ClientID.getClientID(), data.id);

  let optout;
  try {
    optout = Services.prefs.getBoolPref(OPT_OUT_PREF, false);
  } catch (e) {
    debug("No opt-out pref:", e);
    optout = false;
  }

  if (optout) {
    debug(`User has set opt-out pref, disabling`);
    return;
  }

  ClientID.getClientID().then(clientID => {
    if (!clientID) {
      throw new Error("No Telemetery client ID");
    }
    const hasher = generateHash(clientID, data.id);
    hasher.then(hash => {
      if (!hash) {
        throw new Error("No cryptographic hash");
      }
      const view = new DataView(hash);
      const variate = view.getUint32(0) / 0xffffffff;
      debug(`Variate: ${variate}`);

      let uuid;
      if (variate < ENABLE_PROB) {
        try {
          uuid = reportTelemetrySetting();
        } catch (e) {
          debug("unable to upload payload", e);
          debug(e);
        }
      }
      return uuid;
    }).catch(err => debug(err));
    return clientID;
  }).catch(err => debug(err));
}

function shutdown() {}
function startup() {}
function uninstall() {}
