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
- AWS credentials configured (`aws configure`)

## API response

Each GET request returns a JSON object with a random quote:

```json
{
  "id": 725560,
  "quote": "C'est pas faux."
}
```

| Field   | Type    | Description                        |
|---------|---------|------------------------------------|
| `id`    | number  | Unique identifier for the quote    |
| `quote` | string  | The Kaamelott quote                |

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

The project uses two isolated stacks — `kamelott-stage` and `kamelott-prod` — each with its own Lambda and API Gateway. Configuration is managed in `samconfig.toml`.

| Environment | Stack name      | API stage | Command                                  |
|-------------|-----------------|-----------|------------------------------------------|
| Stage       | `kamelott-stage`| `stage`   | `sam deploy --config-env stage`          |
| Prod        | `kamelott-prod` | `prod`    | `sam deploy --config-env prod`           |

## Deploy

Always build before deploying:

```bash
sam build
```

Deploy to **stage**:

```bash
sam deploy --config-env stage
```

Deploy to **prod** (only after validating on stage):

```bash
sam deploy --config-env prod
```

The API Gateway URL is printed in the stack outputs at the end of each deployment:

```
https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/stage/kamelott/
https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/prod/kamelott/
```

## Remote test

```bash
curl https://<api-id>.execute-api.ap-southeast-1.amazonaws.com/stage/kamelott/
```

## Logs

```bash
sam logs -n KamelottFunction --stack-name kamelott-stage --tail
sam logs -n KamelottFunction --stack-name kamelott-prod --tail
```

## Cleanup

Delete a specific stack:

```bash
sam delete --stack-name kamelott-stage
sam delete --stack-name kamelott-prod
```

## Resources

- [AWS SAM developer guide](https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/what-is-sam.html)
- [API Gateway REST API](https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-rest-api.html)
