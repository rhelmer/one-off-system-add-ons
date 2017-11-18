/* -*- indent-tabs-mode: nil; js-indent-level: 2 -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 *  * License, v. 2.0. If a copy of the MPL was not distributed with this
 *   * file, You can obtain one at http://mozilla.org/MPL/2.0/. */
"use strict";

let {classes: Cc, interfaces: Ci, utils: Cu, results: Cr} = Components;

Cu.import("resource://gre/modules/AppConstants.jsm");
Cu.import("resource://gre/modules/Services.jsm");
Cu.import("resource://gre/modules/XPCOMUtils.jsm");

XPCOMUtils.defineLazyModuleGetter(this, "TelemetryEnvironment",
                                        "resource://gre/modules/TelemetryEnvironment.jsm");

const BAD_VENDOR_ID = "0x1002";

function install() {}

function uninstall() {}

function startup() {
    if (AppConstants.platform == "win") {
        let telemetryEnv = TelemetryEnvironment.currentEnvironment;
        let vendorID = telemetryEnv.system.gfx.adapters[0].deviceID;

        if (vendorID == BAD_VENDOR_ID) {
            let defaultBranch = Services.prefs.getDefaultBranch("");
            defaultBranch.setBoolPref("media.windows-media-foundation.use-nv12-format", false);
        }
    }
}

function shutdown() {}
