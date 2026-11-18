import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.Bg6yeD_j.js";
import { _ as __name } from "../app.DU8CzkSb.js";
import "./chunk-5VM5RSS4.DVoZQgSU.js";
import "./chunk-XXDRQBXY.wFoeXJC0.js";
import "./chunk-POPQ4Y6H.DAy4LQuM.js";
import "./chunk-F27PBJKO.Dvfp43Ym.js";
import "./framework.jTK6_58R.js";
import "./theme.BXtjRCEW.js";
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
