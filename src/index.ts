import {Processor, Context, Document, LayoutRoot} from "@localizesh/sdk";
import strings from "./utils.js";

class StringsProcessor implements Processor {
  parse(res: string, ctx?: Context): any {
    const ast: LayoutRoot = strings.stringToHast(res);

    const document = "document"
  }
  stringify(data: Document, ctx?: Context): any {

  }
}

export default StringsProcessor;
