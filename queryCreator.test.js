import { describe, expect, test } from "vitest";
import {constructQuery} from './src/assets/queryCreator.js'

// To generate input.json:
//    Uncomment the second line in the constructQuery function from queryCreator.js and
//    then view the output in the developer tools of your browser.

// To generate expected-query.txt:
//    Use the copy button in the UI to copy the entire query

// To generate expected-results.txt:
//    Run the command: psql -t -d osm -U osmuser -c "<YOUR QUERY HERE>" > expected-results.txt
// Warning: The content of expected-results.txt WILL be overwritten with the contents
// properly sorted, if the contents are not already sorted. This is to help you
// directly compare the actual results with the expected results, since the actual
// results will be sorted in the same order.

// description.txt is completely optional

function sortResults(results) {
  let array = results.split('\n');
  array = array.filter((a) => a.length > 0);
  return array.sort().join('\n')
}

const mainDirName = 'tests';
const fs = require('fs');
const dir = fs.opendirSync(mainDirName);
let item;
let tests = [];
while ((item = dir.readSync()) !== null) {
  if (item.isDirectory()) {
    const testName = item.name;
    const dirName = './' + mainDirName + '/' + testName;

    const input = require(dirName + '/input.json');

    const expectedResultsFile = dirName + '/expected-results.txt';
    const expectedResults = fs.readFileSync(expectedResultsFile, 'utf8');
    const sortedResults = sortResults(expectedResults);
    // Overwrites the expected results file if not already sorted
    if (sortedResults !== expectedResults)
      fs.writeFileSync(expectedResultsFile, sortedResults, 'utf8');

    const expectedQueryFile = dirName + '/expected-query.txt';
    const expectedQuery = fs.readFileSync(expectedQueryFile, 'utf8');

    const descriptionFile = dirName + '/description.txt';
    let description = ''
    if (fs.existsSync(descriptionFile))
      description = fs.readFileSync(descriptionFile, 'utf8');

    if (testName == '' || input == '' || expectedQuery == '' || sortedResults == '')
      continue;

    tests.push([testName, description, input, expectedQuery, sortedResults]);
  }
}
dir.closeSync() 

describe("queryCreator.js tester", () => {
  test.each(tests)('%s: %s', (name, desc, json, expectedQuery, expectedResults) => {
    const execSync = require('child_process').execSync;

    const query = constructQuery(json, false) + '\n';
    const resultsFile = mainDirName + '/' + name + '/' + 'actual-results.txt';
    // Stores the results directly to a file since some query results are too large to buffer
    const command = 'psql -t -d osm -U osmuser -c "' + query + '" > ' + resultsFile;

    execSync(command);

    const queryFile = mainDirName + '/' + name + '/' + 'actual-query.txt';
    fs.writeFileSync(queryFile, query);

    let results = fs.readFileSync(resultsFile, 'utf8');
    results = sortResults(results)
    fs.writeFileSync(resultsFile, results, 'utf8');
    
    expect(results).toEqual(expectedResults)
    expect(query).toEqual(expectedQuery)
  });
});
