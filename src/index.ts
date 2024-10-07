import {Processor, Context, Document, LayoutRoot} from "@localizesh/sdk";
import strings from "./utils.js";

class StringsProcessor implements Processor {
  parse(res: string, ctx?: Context): Document {
    const ast: LayoutRoot = strings.stringToHast(res);

    return strings.hastToDocument(ast, ctx);
  }
  stringify(data: Document, ctx?: Context): string {
    return "";
  }
}

export default StringsProcessor;
