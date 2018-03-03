"use strict";

/* eslint-disable mozilla/use-chromeutils-import */
ChromeUtils.import("resource://gre/modules/Services.jsm");
ChromeUtils.import("resource://gre/modules/ClientID.jsm");
Cu.importGlobalProperties(["crypto", "TextEncoder"]);

const ENABLE_PROB = 0.1;
const DEBUG = false;
const VERSION_MAX_PREF = "security.tls.version.max";
const ADDON_ID = "tls13-rollout-bug1442042@mozilla.org";

/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "rollout" }] */
var rollout = class extends ExtensionAPI {
  getAPI() {
    return {
      experiments: {
        rollout: {
          debug(msg) {
            if (DEBUG) {
              console.log(`TLS 1.3 Test: ${msg}`); // eslint-disable-line no-console
            }
          },
             
          async generateVariate(seed, label) {
            const hasher = crypto.subtle;
            const buffer = new TextEncoder("utf-8").encode(seed + label);
            const hash = await hasher.digest("SHA-256", buffer);
            let view = new DataView(hash);
            return view.getUint32(0) / 0xffffffff;
          },
             
          async startup() {
            // Don't do anything if the user has already messed with this
            // setting.
            if (Services.prefs.prefHasUserValue(VERSION_MAX_PREF)) {
              this.debug("User has changed TLS max version. Skipping");
              return;
            }
             
            this.debug("Installing");
             
            let clientID = ClientID.getClientID();
            let variate = await this.generateVariate(clientID, ADDON_ID);
            this.debug(variate);
            let prefs = Services.prefs.getDefaultBranch("");
             
            if (variate < ENABLE_PROB) {
              this.debug("Setting TLS 1.3 on");
              prefs.setIntPref(VERSION_MAX_PREF, 4);
            }
          },
        },
      },
    };
  }
};
