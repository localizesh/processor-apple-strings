import {Context, Document, IdGenerator, LayoutElement, LayoutRoot, Segment} from "@localizesh/sdk";
import {visitParents} from "unist-util-visit-parents";

type StringsRecord = {
  [key: string]: {
    text: string,
    comment: string
  }
}

function parseStringToObject(input: string, isComments = true): StringsRecord[] {
    const reAssign = /[^\\]" = "/;
    const reLineEnd = /";$/;
    const reCommentEnd = /\*\/$/;

    let result: StringsRecord[] = [];
    const lines = input.split("\n");

    let currentComment = '';
    let currentValue = '';
    let currentId = '';
    let nextLineIsComment = false;
    let nextLineIsValue = false;

    lines.forEach((line) => {
      let val: {[key: string]: string} = {};
      line = line.trim();
      line = line.replace(/([^\\])("\s*=\s*")/g, "$1\" = \"");
      line = line.replace(/"\s+;/g, '";');

      if (nextLineIsComment) {
        if (line.search(reCommentEnd) === -1) {
          currentComment += '\n' + line.trim();
          return;
        } else {
          nextLineIsComment = false;
          currentComment += '\n' + line.substring(0, line.search(reCommentEnd)).trim();
          return;
        }
      } else if (line.substring(0, 2) === '//') {
        currentComment = line.substring(2).trim();
        return;
      } else if (line.substring(0, 2) === '/*' && !nextLineIsValue) {
        if (line.search(reCommentEnd) === -1) {
          nextLineIsComment = true;
          currentComment = line.substring(2).trim();
          return;
        } else {
          nextLineIsComment = false;
          currentComment = line.substring(2, line.search(reCommentEnd)).trim();
          return;
        }
      }
      let keyString = '';
      let valueString = '';
      if (line === '' && !nextLineIsValue) {
        return;
      }

      if (nextLineIsValue) {
        if (line.search(reLineEnd) === -1) {
          currentValue += '\n' + line.trim();
          return;
        } else {
          nextLineIsValue = false;
          currentValue += '\n' + line.substring(0, line.search(reLineEnd)).trim();
          keyString = currentId;
          valueString = currentValue;
          currentId = '';
          currentValue = '';
        }
      } else if (line.search(reLineEnd) === -1 && !nextLineIsComment) {
        nextLineIsValue = true;
        currentId = line;
        currentId = currentId.substring(1);
        currentId = currentId.substring(0, currentId.search(reAssign) + 1);
        currentId = currentId.replace(/\\"/g, "\"");
        currentValue = line;
        currentValue = currentValue.substring(currentValue.search(reAssign) + 6);
        return;
      } else {
        keyString = line;
        keyString = keyString.substring(1);
        keyString = keyString.substring(0, keyString.search(reAssign) + 1);

        valueString = line;
        valueString = valueString.substring(valueString.search(reAssign) + 6);
        valueString = valueString.substring(0, valueString.search(reLineEnd));
        keyString = keyString.replace(/\\"/g, "\"");
      }
      valueString = valueString.replace(/\\"/g, "\"");
      keyString = keyString.replace(/\\n/g, "\n");
      valueString = valueString.replace(/\\n/g, "\n");
      if (!isComments) {
         result = [...result, {[keyString]: valueString} as unknown as StringsRecord];
      } else {
        val = {
          'text': valueString
        };
        if (currentComment) {
          val['comment'] = currentComment;
          currentComment = '';
        }
        result = [...result, {[keyString]: val} as StringsRecord];
      }
    });
    return result;
}


const hastToString = (rootHast: LayoutRoot) => {
  return "";
}

const stringToHast = (rootString: string) => {
  const values: StringsRecord[] = parseStringToObject(rootString);

  const children = values.reduce((accum: LayoutElement[], stringsValue) => {
    const key = Object.keys(stringsValue)[0];
    const {text, comment} = stringsValue[key];

    const hastValues = [
      {
        type: "element",
        tagName: "tr",
        children: [
          {
            type: "element",
            tagName: "td",
            children: [
              {type: "comment", value: comment}
            ],
            properties: {colspan:"2"},
          }
        ],
        properties: {},
      },
      {
        type: "element",
        tagName: "tr",
        children: [
          {
            type: "element",
            tagName: "td",
            children: [
              {type: "text", value: key}
            ],
            properties: {},
          },
          {
            type: "element",
            tagName: "td",
            children: [
              {type: "text", value: text}
            ],
            properties: {},
          },
        ],
        properties: {},
      }
    ];
    accum = [...accum, ...hastValues] as LayoutElement[];
    return accum;
  }, [])

  return {type: "root", children: [
      {
        type: "element",
        tagName: "table",
        children: [
          {
            type: "element",
            tagName: "tbody",
            children: children,
            properties: {},
          },
        ],
        properties: {},
      }
    ]} as LayoutRoot;
}

const hastToDocument = (hastRoot: any, ctx: Context): Document => {
  const idGenerator: IdGenerator = new IdGenerator();
  const segments: Segment[] = [];

  const setSegment = (text: string): string => {
    const id: string = idGenerator.generateId(text, {}, ctx);
    const segment = {text, id};
    segments.push(segment);
    return id;
  }

  visitParents(hastRoot, (node: any) =>
    "tagName" in node && node?.tagName === "tr", (node) => {

      if ("children" in node) {
        const td = node.children[1];

        if (td && "children" in td && td.children[0].type === "text") {
          const textTypeNode = td.children[0];
          const segmentId = setSegment(textTypeNode.value);

          const layoutSegment = {type: "segment", id: segmentId};
          td.children.splice(0, 1, layoutSegment);
        }
      }
    }
  )

  return {segments, layout: hastRoot}
}

const documentToHast = (document: Document): any => {

}

const strings: {
  hastToString: (rootHast: LayoutRoot) => string;
  stringToHast: (rootString: string) => LayoutRoot;
  hastToDocument: (hastRoot: any, ctx: Context) => Document;
} = {
  hastToString,
  stringToHast,
  hastToDocument,
};

export default strings;
