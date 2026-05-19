#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const {
  evaluateFixtures,
  summarizeEvaluation,
} = require('../src/utils/analysisEvaluator');

const fixtureDir = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(__dirname, '../evals/fixtures');

function loadFixtures(dir) {
  if (!fs.existsSync(dir)) {
    throw new Error(`Fixture directory not found: ${dir}`);
  }

  return fs.readdirSync(dir)
    .filter((file) => file.endsWith('.json'))
    .sort()
    .map((file) => {
      const fullPath = path.join(dir, file);
      return {
        ...JSON.parse(fs.readFileSync(fullPath, 'utf8')),
        id: path.basename(file, '.json'),
      };
    });
}

function formatResult(result) {
  const status = result.matchesExpectation ? 'OK' : 'FAIL';
  const quality = result.passed ? 'quality-pass' : 'quality-fail';
  return `${status.padEnd(4)} ${quality.padEnd(12)} ${result.id}`;
}

try {
  const fixtures = loadFixtures(fixtureDir);
  const results = evaluateFixtures(fixtures);
  const summary = summarizeEvaluation(results);

  console.log(`\nTeardown quality eval: ${fixtureDir}`);
  console.log('='.repeat(72));
  results.forEach((result) => {
    console.log(formatResult(result));
    if (!result.matchesExpectation || result.warnings.length > 0) {
      result.warnings.slice(0, 8).forEach((warning) => {
        console.log(`     - ${warning}`);
      });
    }
    if (result.evidenceGaps.length > 0) {
      result.evidenceGaps.slice(0, 4).forEach((gap) => {
        console.log(`     evidence gap: ${gap}`);
      });
    }
  });
  console.log('='.repeat(72));
  console.log(`Expectation matches: ${summary.matched}/${summary.total}`);
  console.log(`Quality-passing fixtures: ${summary.qualityPassed}/${summary.total}`);

  if (summary.total === 0 || summary.matched !== summary.total) {
    process.exitCode = 1;
  }
} catch (error) {
  console.error(`Quality eval failed: ${error.message}`);
  process.exitCode = 1;
}
