const analysisRouter = require('../routes/analysis');

const { parseAnalysisResponse, assessAnalysisQuality } = analysisRouter.__test__;

function evaluateFixture(fixture) {
  const expectsDeltaSection = Boolean(fixture.expectsDeltaSection);
  const sources = Array.isArray(fixture.sources) ? fixture.sources : [];
  const evidenceLimitations = Array.isArray(fixture.evidenceLimitations)
    ? fixture.evidenceLimitations
    : [];

  const analysis = fixture.analysisData || parseAnalysisResponse(fixture.analysisText || '', {
    sources,
    evidenceLimitations,
    expectsDeltaSection,
    model: fixture.model,
  });

  const assessment = assessAnalysisQuality(analysis, {
    sources,
    expectsDeltaSection,
  });

  const expectedPassed = typeof fixture.expectedPassed === 'boolean'
    ? fixture.expectedPassed
    : true;

  return {
    id: fixture.id || fixture.name || 'unnamed',
    name: fixture.name || fixture.id || 'Unnamed fixture',
    expectedPassed,
    passed: assessment.passed,
    matchesExpectation: assessment.passed === expectedPassed,
    warnings: assessment.warnings || [],
    evidenceGaps: assessment.evidenceGaps || [],
  };
}

function evaluateFixtures(fixtures) {
  return fixtures.map(evaluateFixture);
}

function summarizeEvaluation(results) {
  const total = results.length;
  const matched = results.filter((result) => result.matchesExpectation).length;
  const qualityPassed = results.filter((result) => result.passed).length;

  return {
    total,
    matched,
    qualityPassed,
    expectationPassRate: total === 0 ? 0 : matched / total,
  };
}

module.exports = {
  evaluateFixture,
  evaluateFixtures,
  summarizeEvaluation,
};
