# securityscorecard-generator

![ncc](https://github.com/ffink/securityscorecard-generator/workflows/ncc/badge.svg)

## Usage

1. Install the Action on your repo.
2. In any Issue or PR, comment `/ssc` followed by a company's domain (i.e. `github.com`).
3. `github-actions[bot]` comments back some basic details about the company's scorecard, if it found one.

![github-scorecard](https://user-images.githubusercontent.com/29130874/77120206-7dff2a80-69f5-11ea-816b-b06889c51fd6.png)

## Caveats

- Resulting data comes directly from and is the property of SecurityScorecard.
- Use of this action requires access to SecurityScorecard's API via an access token stored in your repository secret store.
