import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-IMKFNOWR.BDL5Ch7D.js";
import { _ as __name } from "../app.BLuEM-Wb.js";
import "./chunk-XXDRQBXY.D3MYmI39.js";
import "./chunk-POPQ4Y6H.BxrSvyIV.js";
import "./chunk-F27PBJKO.DLjITJbs.js";
import "./framework.jTK6_58R.js";
import "./theme.DrJPW6QC.js";
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
