import { c as createFlowDiagram, s as styles_default } from "./flowDiagram-HODETNUW.ALSDOcT4.js";
import { _ as __name } from "../app.BLuEM-Wb.js";
import "./chunk-5VM5RSS4.ByVetnYN.js";
import "./chunk-XXDRQBXY.D3MYmI39.js";
import "./chunk-POPQ4Y6H.BxrSvyIV.js";
import "./chunk-F27PBJKO.DLjITJbs.js";
import "./channel.1y8TENZr.js";
import "./framework.jTK6_58R.js";
import "./theme.DrJPW6QC.js";
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
