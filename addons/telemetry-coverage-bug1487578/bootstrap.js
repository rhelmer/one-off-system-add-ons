/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

let {classes: Cc, interfaces: Ci, utils: Cu} = Components;

/* eslint-disable mozilla/use-chromeutils-import */
Cu.import("resource://gre/modules/AppConstants.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/ClientID.jsm");

Cu.importGlobalProperties(["crypto", "TextEncoder", "FormData", "fetch"]);

// we want to control this on the client rather than
// depending on server-side throttling, as throttling
// cannot account for any other concurrent gradual roll-outs.
const ENABLE_PROB = 0.01;
const DEBUG = false;
const OPT_OUT_PREF = "toolkit.telemetry.coverage.opt-out";
const TELEMETRY_ENABLED_PREF = "toolkit.telemetry.enabled";
const REPORTING_ENDPOINT = "https://telemetry-coverage.mozilla.org/submit/coverage/coverage/1";

function debug(msg, obj) {
  if (DEBUG) {
    console.log(`Telemetry measurement: ${msg}`); // eslint-disable-line no-console
    if (obj) {
        console.log("Telemetry measurement JS object:", obj);
    }
  }
}

async function reportTelemetrySetting() {
  // this is a locked pref so it *really should* be present, but on the off chance it is not let's assume false.
  let enabled = Services.prefs.getBoolPref(TELEMETRY_ENABLED_PREF, false);

  const payload = {
    "appVersion": Services.appinfo.version,
    "appUpdateChannel": Services.appinfo.defaultUpdateChannel,
    "osName": Services.appinfo.OS,
    "osVersion": Services.sysinfo.getProperty("version"),
    "telemetryEnabled": enabled | 0,
  };

  let formData = new FormData();
  formData.append('telemetry_enabled', payload);

  debug(`posting to endpoint ${REPORTING_ENDPOINT} with payload:`, payload);

  await fetch(REPORTING_ENDPOINT, {
    method: 'PUT',
    body: formData
  })
}

async function generateVariate(seed, label) {
  const hasher = crypto.subtle;
  const hash = await hasher.digest("SHA-256", new TextEncoder("utf-8").encode(seed + label));
  let view = new DataView(hash);
  return view.getUint32(0) / 0xffffffff;
}

async function install(data, reason) {
  debug("Installing");

  let optout = Services.prefs.getBoolPref(OPT_OUT_PREF, false);

  if (optout) {
    debug(`User has set opt-out pref, disabling`);
    return;
  }

  let variate = await generateVariate(await ClientID.getClientID(), data.id);
  debug(variate);

  if (variate < ENABLE_PROB) {
    try {
      await reportTelemetrySetting();
    } catch (e) {
      debug("unable to upload payload");
      debug(e);
    }
  }
}

function shutdown() {}
function startup() {}
function uninstall() {}
