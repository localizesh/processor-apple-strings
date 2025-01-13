import {assert} from "chai";

import fs from "fs";
import path from "path";

import StringsProcessor from "../src/index.js";

const processor = new StringsProcessor();

function processAndCompare(filename: string) {
  const inDoc = fs.readFileSync(path.join('test', 'fixtures', filename), {encoding: 'utf-8'});

  const doc = processor.parse(inDoc);
  const docStr = JSON.stringify(doc);

  const outDoc = processor.stringify(doc);
  debugger
  const outDocStructure = processor.parse(outDoc);

  const outDocStructureStr = JSON.stringify(outDocStructure);

  assert.equal(outDocStructureStr, docStr);
  console.log(filename);
}

describe('YamlProcessorTest', function() {
  it('documents should be equal', function() {
    processAndCompare('typical.strings');
    processAndCompare('test.strings');
    processAndCompare('sections.strings');
    processAndCompare('comments.strings');
  });
});



