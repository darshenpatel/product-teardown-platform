const {
  evaluateFixture,
  summarizeEvaluation,
} = require('../analysisEvaluator');

const GOOD_SECTIONS = {
  onboarding: [
    '**Onboarding Flow**',
    '- Observation: Setup uses guided defaults [src_1]. Implication: users reach a useful workspace faster. Action: copy the guided first project.',
    '**Time to Value**',
    '- Observation: First value appears when a project exists [src_1]. Implication: activation can happen before invite loops. Action: measure time to first project.',
    '**Highlights**',
    '- Observation: Defaults reduce blank-page friction. Implication: users stay in motion. Action: make templates the primary path.',
  ].join('\n'),
  pricing: [
    '**Pricing Model**',
    '- Observation: Team-tier SaaS pricing supports bottoms-up adoption [src_1]. Implication: champions can prove value early. Action: keep the entry tier low-friction.',
    '**Tiers**',
    '- Observation: Plans map to team maturity. Implication: upgrade moments become easier to explain. Action: align packaging to maturity.',
    '**Strategy**',
    '- Observation: Expansion follows collaboration depth. Implication: paid conversion depends on team usage. Action: instrument expansion triggers.',
    '**Competitive Position**',
    '- Observation: The product competes on focus and speed [src_1]. Implication: premium value comes from workflow quality. Action: emphasize speed.',
  ].join('\n'),
  valueProps: [
    '**Primary Value**',
    '- Observation: The product reduces execution drag for focused teams [src_1]. Implication: users buy back planning time. Action: lead with operational speed.',
    '**Secondary Benefits**',
    '- Observation: Shared rituals improve visibility. Implication: value expands with team adoption. Action: show team-level outcomes.',
    '**Target Audience**',
    '- Observation: Product-minded teams benefit most. Implication: generic messaging weakens the wedge. Action: keep ICP language specific.',
    '**Differentiators**',
    '- Observation: Speed, taste, and opinionated structure combine. Implication: alternatives feel heavier. Action: copy clarity, not just visuals.',
  ].join('\n'),
  competitive: [
    '**Strengths**',
    '- Fast workflows and strong defaults support adoption [src_1].',
    '**Weaknesses**',
    '- Narrow positioning can limit horizontal use cases.',
    '**Opportunities**',
    '- Deeper planning rituals could expand account value.',
    '**Threats**',
    '- Bundled suites can reduce appetite for a separate tool.',
  ].join('\n'),
  actionPlan: [
    '**What to copy**',
    '- Copy guided setup and opinionated defaults.',
    '**What to avoid**',
    '- Avoid decorative polish without workflow speed.',
    '**Experiments to run**',
    '- Hypothesis: template-led setup increases activation. Metric: project creation rate. Expected decision: ship if activation rises.',
    '**Metrics to watch**',
    '- Track time to first project, invite rate, retention, and conversion.',
    '**Open questions**',
    '- Which first-run action predicts retention?',
  ].join('\n'),
  deltaVsMyProduct: '',
};

describe('analysisEvaluator', () => {
  it('evaluates a passing fixture', () => {
    const result = evaluateFixture({
      name: 'good',
      expectedPassed: true,
      sources: [{ id: 'src_1' }],
      analysisText: JSON.stringify({
        summary: {
          headline: 'Strong teardown.',
          topTakeaways: ['One', 'Two', 'Three'],
          recommendedNextMove: 'Run the activation experiment.',
        },
        sections: GOOD_SECTIONS,
      }),
    });

    expect(result.passed).toBe(true);
    expect(result.matchesExpectation).toBe(true);
  });

  it('evaluates a failing fixture and summarizes expectation matches', () => {
    const failing = evaluateFixture({
      name: 'weak',
      expectedPassed: false,
      sources: [{ id: 'src_1' }],
      analysisText: JSON.stringify({
        sections: {
          onboarding: '**Onboarding Flow**\n- To analyze onboarding, review signup.',
          pricing: '**Pricing Model**\n- Analysis content available.',
          valueProps: '**Primary Value**\n- A specific strength of the product.',
          competitive: '**Strengths**\n- Another specific strength.',
          actionPlan: '**Experiments to run**\n- Test something.',
          deltaVsMyProduct: '',
        },
      }),
    });

    const summary = summarizeEvaluation([failing]);

    expect(failing.passed).toBe(false);
    expect(failing.matchesExpectation).toBe(true);
    expect(summary).toEqual({
      total: 1,
      matched: 1,
      qualityPassed: 0,
      expectationPassRate: 1,
    });
  });
});
