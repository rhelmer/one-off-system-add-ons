/* eslint no-unused-vars: ["error", { "varsIgnorePattern": "skeleton" }]*/
/* global ExtensionAPI */
ChromeUtils.defineModuleGetter(this, "XPIDatabase", "resource://gre/modules/addons/XPIDatabase.jsm");
ChromeUtils.defineModuleGetter(this, "XPIProvider", "resource://gre/modules/addons/XPIProvider.jsm");

const skeleton = class extends ExtensionAPI {
  getAPI(/* context */) {
    return {
      experiments: {
        skeleton: {
          async doTheThing() {
            // First, check if there's a master password on the token DB. If so,
            // the user will need to login before we can add a certificate.
            try {
              let tokendb = Cc["@mozilla.org/security/pk11tokendb;1"].getService(Ci.nsIPK11TokenDB);
              let token = tokendb.getInternalKeyToken();

              if (!token.checkPassword("")) {
                token.login(true);
              }
            } catch (e) {
              console.error("failed to login pkcs#11 token:", e); // eslint-disable-line no-console
            }

            // Second, inject the new cert.
            try {
              let intermediate = "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";
              let certDB = Cc["@mozilla.org/security/x509certdb;1"].getService(Ci.nsIX509CertDB);
              // The last argument is a name which was actually ignored so later removed:
              // https://dxr.mozilla.org/mozilla-esr52/rev/5350524bb6543084fbba8604ce050794d0bc70ae/security/manager/ssl/nsIX509CertDB.idl#418
              certDB.addCertFromBase64(intermediate, ",,", "");
              console.log("new intermediate certificate added"); // eslint-disable-line no-console
            } catch (e) {
              // If this fails, do not move on to the re-verify step.
              return;
            }

            // Finally, force a re-verify of signatures.
            try {
              await XPIDatabase.verifySignatures();
              console.log("signatures re-verified"); // eslint-disable-line no-console
            } catch (e) {
              try {
                await XPIProvider.verifySignatures();
              } catch (f) {
                console.error("failed to re-verify signatures:", e); // eslint-disable-line no-console
              }
            }
          }
        }
      }
    };
  }
};
