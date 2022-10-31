import { describe, expect, test } from "vitest";
import {constructQuery} from './src/assets/queryCreator.js'

// To generate test#-input.json:
//    Uncomment the second line in the constructQuery function from queryCreator.js

// To generate test#-expected-query.txt:
//    Use the copy button in the UI to copy the entire query

// To generate test#-expected-results.txt:
//    Run the command: psql -t -d osm -U osmuser -c "<YOUR QUERY HERE>" > test#-results.txt

function sortResults(results) {
  let array = results.split('\n');
  return array.sort().join('\n')
}

const dirName = 'tests';
const fs = require('fs')
const dir = fs.opendirSync(dirName);
let file;
let tests = [];
while ((file = dir.readSync()) !== null) {
  if (file.name.endsWith('-input.json') && file.isFile()) {
    const testName = file.name.replace('-input.json', '')

    const input = require('./' + dirName + '/' + file.name);

    const expectedResultsFile = dirName + '/' + testName + '-expected-results.txt';
    let expectedResults = fs.readFileSync(expectedResultsFile, 'utf8');
    expectedResults = sortResults(expectedResults);

    const expectedQueryFile = dirName + '/' + testName + '-expected-query.txt';
    const expectedQuery = fs.readFileSync(expectedQueryFile, 'utf8');

    tests.push([testName, input, expectedQuery, expectedResults]);
  }
}
dir.closeSync() 

describe("queryCreator.js tester", () => {
  test.each(tests)('%s', (name, json, expectedQuery, expectedResults) => {
    const execSync = require('child_process').execSync;

    const query = constructQuery(json) + '\n';
    const resultsFile = dirName + '/results/' + name + '-results.txt';
    const command = 'psql -t -d osm -U osmuser -c "' + query + '" > ' + resultsFile;

    execSync(command);

    const queryFile = dirName + '/results/' + name + '-query.txt';
    fs.writeFileSync(queryFile, query);

    let results = fs.readFileSync(resultsFile, 'utf8');
    results = sortResults(results)
    
    expect(results).toEqual(expectedResults)
    expect(query).toEqual(expectedQuery)
  });
});
