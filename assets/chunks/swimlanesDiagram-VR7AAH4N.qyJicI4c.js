import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-HODETNUW.C97nDHVV.js";
import { _ as __name } from "../app.mW2l85j6.js";
import "./chunk-5VM5RSS4.OjQCMptn.js";
import "./chunk-XXDRQBXY.BeLcRP3l.js";
import "./chunk-POPQ4Y6H.DWJoDl4p.js";
import "./chunk-F27PBJKO.OR1GFuwP.js";
import "./channel.CLcTK3bk.js";
import "./framework.jTK6_58R.js";
import "./theme.MwvFCDNb.js";
var getStyles = /* @__PURE__ */ __name((options) => `${styles_default(options)}
  .swimlane.cluster rect {
    stroke: ${options.clusterBorder} !important;
  }
  [data-look="neo"].cluster rect {
    filter: none;
  }
`, "getStyles");
var styles_default2 = getStyles;
var diagram = createFlowDiagram({ defaultLayout: "swimlane", styles: styles_default2 });
export {
  diagram
};
