import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-IMKFNOWR.C-4MD-BS.js";
import { _ as __name } from "../app.DVFJgQyE.js";
import "./chunk-XXDRQBXY.B4kFAzCa.js";
import "./chunk-POPQ4Y6H.BvD_stTX.js";
import "./chunk-F27PBJKO.B8_2oeZo.js";
import "./framework.jTK6_58R.js";
import "./theme.cUih1qFl.js";
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
