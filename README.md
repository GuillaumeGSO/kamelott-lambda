# Kaamelott lorem ipsum — AWS Lambda + API Gateway REST API (Node.js)

Returns a random [Kaamelott](https://fr.wikipedia.org/wiki/Kaamelott) quote on each GET request. 774 quotes bundled directly in the Lambda — no external dependencies.

## Project structure

```
.
├── kamelott/
│   ├── app.mjs          # Lambda handler
│   └── quotes.json      # 774 bundled quotes
├── events/
│   └── event.json       # Sample invocation event for local testing
├── template.yaml        # SAM template (Lambda + API Gateway)
└── samconfig.toml       # Deployment config for stage and prod
```

## Requirements

- [AWS SAM CLI](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-sam-cli-install.html)
- [Docker](https://hub.docker.com/search/?type=edition&offering=community) (for local invocation)
- AWS credentials — refresh them from the IAM Identity Center portal and export as environment variables:
  ```bash
  export AWS_ACCESS_KEY_ID=...
  export AWS_SECRET_ACCESS_KEY=...
  export AWS_SESSION_TOKEN=...
  ```
  Or use a named profile: `--profile <your-profile>`

## API response

Each GET request returns a JSON object with a random quote:

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

| Field       | Type             | Description                              |
|-------------|------------------|------------------------------------------|
| `quoteId`   | string           | Unique identifier for the quote          |
| `character` | string           | Character who says the quote             |
| `text`      | string           | The Kaamelott quote                      |
| `actor`     | string           | Actor who plays the character            |
| `film`      | string \| null   | Film title if from the movie, else null  |
| `season`    | string \| null   | Season if from the series, else null     |
| `episode`   | string \| null   | Episode title if from the series, else null |

## Local testing

Invoke the function directly:

```bash
sam build
sam local invoke KamelottFunction -e events/event.json
```

Or start a local API server:

```bash
sam local start-api
curl http://localhost:3000/kamelott
```

## Environments

The project uses two isolated stacks — `kamelott-staging` and `kamelott-prod` — each with its own Lambda and API Gateway. Configuration is managed in `samconfig.toml`.

| Environment | Stack name        | Config env  | Behaviour                              |
|-------------|-------------------|-------------|----------------------------------------|
| Staging     | `kamelott-staging`| `staging`   | Deploys immediately, no confirmation   |
| Prod        | `kamelott-prod`   | `prod`      | Shows changeset, requires confirmation |

## Deploy

Always build before deploying:

```bash
sam build
```

Deploy to **staging**:

```bash
sam deploy --config-env staging
```

Deploy to **prod** (only after validating on staging):

```bash
sam deploy --config-env prod
```

The API Gateway URL is printed in the stack outputs at the end of each deployment:

```
https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/Prod/kamelott/
```

## Remote test

```bash
curl https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/Prod/kamelott/
```

## Logs

```bash
sam logs -n KamelottFunction --stack-name kamelott-staging --tail
sam logs -n KamelottFunction --stack-name kamelott-prod --tail
```

## Cleanup

Delete a specific stack:

```bash
sam delete --stack-name kamelott-staging
sam delete --stack-name kamelott-prod
```

## Resources

- [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html)
