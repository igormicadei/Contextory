import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-IMKFNOWR.B1SKhpYh.js";
import { _ as __name } from "../app.CRu3CliF.js";
import "./chunk-XXDRQBXY.CwhzAR0N.js";
import "./chunk-POPQ4Y6H.DIr_LA7Y.js";
import "./chunk-F27PBJKO.B4xkvjtn.js";
import "./framework.jTK6_58R.js";
import "./theme.IoSdND7m.js";
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
