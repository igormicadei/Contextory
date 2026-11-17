import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.zLedniD8.js";
import { _ as __name } from "../app.ShOCSKyb.js";
import "./chunk-5VM5RSS4.Dw-LesRo.js";
import "./chunk-XXDRQBXY.Bie4bqBL.js";
import "./chunk-POPQ4Y6H.ChSDkoJj.js";
import "./chunk-F27PBJKO.8EIG8WFb.js";
import "./framework.jTK6_58R.js";
import "./theme.92xPomwU.js";
var diagram = {
  parser: classDiagram_default,
  get db() {
    return new ClassDB();
  },
  renderer: classRenderer_v3_unified_default,
  styles: styles_default,
  init: /* @__PURE__ */ __name((cnf) => {
    if (!cnf.class) {
      cnf.class = {};
    }
    cnf.class.arrowMarkerAbsolute = cnf.arrowMarkerAbsolute;
  }, "init")
};
export {
  diagram
};
