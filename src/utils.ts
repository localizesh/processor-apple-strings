import {Context, Document, IdGenerator, LayoutElement, LayoutRoot, Segment} from "@localizesh/sdk";
import {visitParents} from "unist-util-visit-parents";

type SegmentsMap = {
  [id: string]: Segment;
};

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


const hastToString = (rootHast: LayoutRoot): string => {

  const hastToObjectsRecursive = (layoutElement: any) => {

    if("tagName" in layoutElement && layoutElement.tagName === "tbody") {
      return layoutElement.children.reduce((acc: StringsRecord[], child: any, index: number) => {
        const isEven = index % 2 === 0;
        if (isEven) {
          const comment = child.children[0]?.children[0]?.value || "";
          const nextTr = layoutElement?.children[index + 1];
          if (nextTr) {
            const key = nextTr.children[0]?.children[0]?.value;
            const text = nextTr.children[1]?.children[0]?.value;
            acc.push({[key]: {text, comment}});
          }
        }
        return acc;
      }, [])
    }

    if("children" in layoutElement) {
      for (let child of layoutElement.children) {
        return hastToObjectsRecursive(child);
      }
    }
  }

  const stringsObjects: StringsRecord[] = hastToObjectsRecursive(rootHast);

  const stringsObjectsToStr = (stringsObjects: StringsRecord[]): string => {

    return stringsObjects.reduce((acc: string, stringsObj: StringsRecord, index: number) => {
      let key = Object.keys(stringsObj)[0];
      let {text, comment} = stringsObj[key];
      const isLast = index === stringsObjects.length - 1;

      acc += `/* ${comment} */\n"${key}" = "${text}";${isLast ? "\n" : "\n\n"}`;
      return acc;
    }, "")
  }

  return stringsObjectsToStr(stringsObjects);
}

const stringToHast = (rootString: string) => {
  const values: StringsRecord[] = parseStringToObject(rootString);

  const children = values.reduce((accum: LayoutElement[], stringsValue) => {
    const key = Object.keys(stringsValue)[0];
    const {text, comment} = stringsValue[key];

    const commentRowStyles = {display: "none"};

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
        properties: {style: commentRowStyles},
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

const documentToHast = (document: Document): LayoutRoot => {
  const {layout, segments} = document;

  const segmentsMap: SegmentsMap = {};

  segments.forEach((segment: Segment): void => {
    segmentsMap[segment.id] = segment;
  });

  visitParents(layout, "segment", (node: any, parent) => {
      const currentParent = parent[parent.length - 1];
      currentParent.children = [{type: "text", value: segmentsMap[node.id].text}];
    }
  )
  return layout;
}

const strings: {
  stringToHast: (rootString: string) => LayoutRoot;
  hastToDocument: (hastRoot: any, ctx: Context) => Document;
  documentToHast: (document: Document, ctx: Context) => LayoutRoot;
  hastToString: (rootHast: LayoutRoot) => string;
} = {
  stringToHast,
  hastToDocument,
  documentToHast,
  hastToString,
};

export default strings;
