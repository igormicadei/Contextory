import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-IMKFNOWR.DSXP460W.js";
import { _ as __name } from "../app.mW2l85j6.js";
import "./chunk-XXDRQBXY.BeLcRP3l.js";
import "./chunk-POPQ4Y6H.DWJoDl4p.js";
import "./chunk-F27PBJKO.OR1GFuwP.js";
import "./framework.jTK6_58R.js";
import "./theme.MwvFCDNb.js";
var diagram = {
  parser: stateDiagram_default,
  get db() {
    return new StateDB(2);
  },
  renderer: stateRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.state) {
      cnf.state = {};
    }
    cnf.state.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
