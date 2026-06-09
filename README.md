# Kaamelott Lambda

Serverless REST API returning random quotes from the French comedy series [Kaamelott](https://fr.wikipedia.org/wiki/Kaamelott). Built with AWS CDK (TypeScript), Lambda (Node.js 24.x), API Gateway, DynamoDB, and S3.

## Architecture

```
S3 (quotes.json)
     │
     └─► LoadQuotes Lambda (admin, one-time)
               │
               ▼
          DynamoDB Table
          ┌──────────────────────────────┐
          │  PK: quoteId                 │
          │  GSI: character-index        │
          └──────────────────────────────┘
               │                │
               ▼                ▼
   GetRandomQuote      GetQuoteByCharacter
        Lambda               Lambda
               │                │
               └────────┬───────┘
                        ▼
                  API Gateway
```

**Environments:** `staging` and `prod`, each with their own DynamoDB table, S3 bucket, Lambda functions, and API Gateway stage.

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/quotes` | Random quote from any character |
| `GET` | `/quotes/{character}` | Random quote for a specific character |

### Response format

```json
{
  "quoteId": "7XLMZGpC",
  "character": "Perceval",
  "text": "C'est pas faux.",
  "actor": "Franck Pitiot",
  "film": null,
  "season": "Livre I",
  "episode": "La Quête"
}
```

| Field | Type | Description |
|-------|------|-------------|
| `quoteId` | string | Unique identifier |
| `character` | string | Character who says the quote |
| `text` | string | The quote |
| `actor` | string | Actor who plays the character |
| `film` | string \| null | Film title if from the movie |
| `season` | string \| null | Season if from the series |
| `episode` | string \| null | Episode title if from the series |

### Character names with accents

Some character names contain French accented characters. Use percent-encoding in the URL:

```bash
# Léodagan → L%C3%A9odagan
curl "https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/staging/quotes/L%C3%A9odagan"
```

A `404` is returned when the character name is not found in the dataset.

## Prerequisites

- Node.js 18+
- AWS CLI configured (`aws configure` or a named profile)
- CDK bootstrapped for your account/region (one-time, see below)

## Setup

```bash
npm install
```

Bootstrap CDK for `ap-southeast-1` (one-time per AWS account):

```bash
npx cdk bootstrap aws://YOUR_ACCOUNT_ID/ap-southeast-1
```

## Deploy

```bash
# Staging
npx cdk deploy --context env=staging

# Production (after validating on staging)
npx cdk deploy --context env=prod
```

Both commands upload `kamelott/quotes.json` to S3 automatically via CDK BucketDeployment.

CDK outputs the API URL and the load-quotes function name at the end of each deploy.

### Populate DynamoDB (once per environment)

After the first deploy, invoke the `load-quotes` Lambda to seed DynamoDB with the 1 028 quotes. The exact function name is printed in the CDK outputs.

```bash
aws lambda invoke \
  --function-name kaamelott-load-quotes-staging \
  --region ap-southeast-1 \
  /tmp/load-result.json

cat /tmp/load-result.json
# → {"loaded":1028}
```

Repeat for prod (`kaamelott-load-quotes-prod`). Re-run any time the quotes dataset changes.

## Preview changes before deploy

```bash
npx cdk diff --context env=staging
npx cdk diff --context env=prod
```

## Destroy

```bash
npx cdk destroy --context env=staging
```

> **Note:** The prod DynamoDB table and S3 bucket use `RemovalPolicy.RETAIN`. After `cdk destroy --context env=prod`, delete them manually from the AWS console if needed.

## Project structure

```
├── bin/kaamelott.ts              # CDK app entry point
├── lib/kaamelott-stack.ts        # All infrastructure (S3, DynamoDB, Lambdas, API GW)
├── lambdas/
│   ├── get-random-quote/         # GET /quotes
│   ├── get-quote-by-character/   # GET /quotes/{character}
│   └── load-quotes/              # Admin: load quotes.json from S3 → DynamoDB
├── data/
│   └── quotes.json               # 1 028 Kaamelott quotes (source of truth, uploaded to S3 on deploy)
├── cdk.json
├── package.json
└── tsconfig.json
```
