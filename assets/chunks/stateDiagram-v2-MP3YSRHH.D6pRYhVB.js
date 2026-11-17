import { s as styles_default, b as stateRenderer_v3_unified_default, a as stateDiagram_default, S as StateDB } from "./chunk-IMKFNOWR.av_MKbzS.js";
import { _ as __name } from "../app.ShOCSKyb.js";
import "./chunk-XXDRQBXY.Bie4bqBL.js";
import "./chunk-POPQ4Y6H.ChSDkoJj.js";
import "./chunk-F27PBJKO.8EIG8WFb.js";
import "./framework.jTK6_58R.js";
import "./theme.92xPomwU.js";
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
