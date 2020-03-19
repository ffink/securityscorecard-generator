const core = require('@actions/core');
const {GitHub, context} = require('@actions/github');
const axios = require('axios').default;

async function run() {
  try {
    // Get authenticated GitHub client (Ocktokit): https://github.com/actions/toolkit/tree/master/packages/github#usage
    const github = new GitHub(process.env.GITHUB_TOKEN);

    // Get owner, repo, and event from context of payload that triggered the action
    const {owner, repo} = context.repo;

    // Get the inputs from the workflow file: https://github.com/actions/toolkit/tree/master/packages/core#inputsoutputs
    const command = '/ssc';

    const event_type = context.eventName;
    let issue_pr_number;
    let body;

    // Parse body of issue or PR to look for `/ssc <search_term>` based on event type
    // Pull request event
    // Webhook Documentation: https://developer.github.com/v3/activity/events/types/#pullrequestevent
    if (event_type === 'pull_request') {
      issue_pr_number = context.payload.pull_request.number;
      body = context.payload.pull_request.body;

      core.debug(`${event_type} event triggered action, pr_number: ${issue_pr_number}, body: ${body}`)
      // Issues event
      // Webhook Documentation: https://developer.github.com/v3/activity/events/types/#issuesevent
    } else if (event_type === 'issues') {
      issue_pr_number = context.payload.issue.number;
      body = context.payload.issue.body;

      core.debug(`${event_type} event triggered action, issue_number: ${issue_pr_number}, body: ${body}`)
      // Issue comment event
      // Webhook Documentation: https://developer.github.com/v3/activity/events/types/#issuecommentevent
    } else {
      issue_pr_number = context.payload.issue.number;
      body = context.payload.comment.body;

      core.debug(`${event_type} event triggered action, issue_or_pr_number: ${issue_pr_number}, body: ${body}`)
    }

    if (body.includes(command)) {
      const index = body.lastIndexOf(command);
      const query = body.substring(index + command.length).trim();
      core.debug(`/ssc command found, query = ${query}`);

      // Query SSC for a scorecard!
      // API Documentation: https://platform.securityscorecard.io/docs/index.html
      // eslint-disable-next-line no-await-in-loop
      const headers = {
        'Accept': 'application/json; charset=utf-8',
        'Content-Type': 'application/json',
        'Authorization': `Token ${process.env.SSC_TOKEN}`,
        'cache-control': 'no-cache',
      };

      const vendorJustAdded = false;
      const searchForScorecard = await axios.get(
        `https://api.securityscorecard.io/companies/${query}`, {headers}
      );

      if (searchForScorecard.status = 403) {
        core.debug(`${query} not found in any existing portfolios. Adding to default portfolio...`);
        const addVendortoPortfolio = await axios.post(
          `https://api.securityscorecard.io/portfolios/5c5335b3037e550019647923/companies/${query}`, {headers}
        );
        core.debug(`Successfully added ${query} to default portfolio.`);
        searchForScorecard = await axios.get(
          `https://api.securityscorecard.io/companies/${query}`, {headers}
        );
        vendorJustAdded = true;
      }

      core.debug(`Successfully queried SecurityScorecard for ${query}`);

      const {
        name: companyName,
        domain: companyDomain,
        grade_url: companyGradeUrl,
        industry: companyIndustry,
        size: companySize,
        score: companyScore,
        grade: companyGrade,
        last30day_score_change: companyLast30Change
      } = searchForScorecard.data;

      // Create a comment
      // API Documentation: https://developer.github.com/v3/issues/comments/#create-a-comment
      // Octokit Documentation: https://octokit.github.io/rest.js/#octokit-routes-issues-create-comment
      // eslint-disable-next-line no-await-in-loop
      await github.issues.createComment({
        owner,
        repo,
        issue_number: issue_pr_number,
        body: `<img align="left" width="100" height="100" src="${companyGradeUrl}">

## ${companyName} Scorecard Summary
##### DATA FROM SECURITYSCORECARD
<br/><br/>
| Name | Domain | Industry | Size | Score | Grade | 30-day |
|--|--|--|--|--|--|--|
| ${companyName} | ${companyDomain} | ${companyIndustry} | ${companySize} | ${companyScore} | ${companyGrade} | ${companyLast30Change} |`
      });
      core.debug(`Successfully created comment on #: ${issue_pr_number}`);

      if (vendorJustAdded === true) {
        const removeVendorFromPortfolio = await axios.delete(
          `https://api.securityscorecard.io/portfolios/5c5335b3037e550019647923/companies/${query}`, {headers}
        );
        core.debug(`Successfully removed ${query} from default portfolio.`);
      }

    } else {
      core.debug(`/ssc command not found in body: ${body}, exiting`);
    }
  } catch (error) {
    core.setFailed(error.message);
  }
}

module.exports = run;
