import { s as styles_default, c as classRenderer_v3_unified_default, a as classDiagram_default, C as ClassDB } from "./chunk-TICWLB2K.D04fLIKh.js";
import { _ as __name } from "../app.mW2l85j6.js";
import "./chunk-5VM5RSS4.OjQCMptn.js";
import "./chunk-XXDRQBXY.BeLcRP3l.js";
import "./chunk-POPQ4Y6H.DWJoDl4p.js";
import "./chunk-F27PBJKO.OR1GFuwP.js";
import "./framework.jTK6_58R.js";
import "./theme.MwvFCDNb.js";
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
