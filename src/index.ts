import {Processor, Context, Document, LayoutRoot} from "@localizesh/sdk";
import strings from "./utils.js";

class StringsProcessor implements Processor {
  parse(res: string, ctx?: Context): Document {
    const hast: LayoutRoot = strings.stringToHast(res);

    return strings.hastToDocument(hast, ctx);
  }
  stringify(document: Document, ctx?: Context): string {
    const hast = strings.documentToHast(document, ctx);

    return "";
  }
}

export default StringsProcessor;
