"use strict";

/* global browser */

browser.experiments.rollout.startup().then(result => {
  console.log(result);
});
