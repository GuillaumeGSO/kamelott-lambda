import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import { Construct } from 'constructs';

export interface KaamelottStackProps extends cdk.StackProps {
  environment: 'staging' | 'prod';
}

export class KaamelottStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props: KaamelottStackProps) {
    super(scope, id, props);

    const { environment } = props;
    const isProd = environment === 'prod';

    // S3 bucket — stores quotes.json, uploaded on every cdk deploy
    const bucket = new s3.Bucket(this, 'QuotesBucket', {
      bucketName: `kaamelott-quotes-${environment}-${this.account}`,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
      autoDeleteObjects: !isProd,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      enforceSSL: true,
    });

    new s3deploy.BucketDeployment(this, 'UploadQuotes', {
      sources: [s3deploy.Source.asset('./data')],
      destinationBucket: bucket,
    });

    // DynamoDB table — quoteId PK, character GSI
    const table = new dynamodb.Table(this, 'QuotesTable', {
      tableName: `kaamelott-quotes-${environment}`,
      partitionKey: { name: 'quoteId', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      removalPolicy: isProd ? cdk.RemovalPolicy.RETAIN : cdk.RemovalPolicy.DESTROY,
    });

    table.addGlobalSecondaryIndex({
      indexName: 'character-index',
      partitionKey: { name: 'character', type: dynamodb.AttributeType.STRING },
      projectionType: dynamodb.ProjectionType.ALL,
    });

    const commonEnv = {
      TABLE_NAME: table.tableName,
      ENVIRONMENT: environment,
    };

    const lambdaDefaults: Omit<lambda.FunctionProps, 'code' | 'handler'> = {
      runtime: lambda.Runtime.NODEJS_24_X,
      architecture: lambda.Architecture.X86_64,
      environment: commonEnv,
    };

    // Lambda: GET /quotes
    const getRandomQuote = new lambda.Function(this, 'GetRandomQuote', {
      ...lambdaDefaults,
      functionName: `kaamelott-get-random-quote-${environment}`,
      code: lambda.Code.fromAsset('lambdas/get-random-quote'),
      handler: 'index.lambdaHandler',
      timeout: cdk.Duration.seconds(5),
      description: 'Returns a random Kaamelott quote',
    });
    table.grantReadData(getRandomQuote);

    // Lambda: GET /quotes/{character}
    const getQuoteByCharacter = new lambda.Function(this, 'GetQuoteByCharacter', {
      ...lambdaDefaults,
      functionName: `kaamelott-get-quote-by-character-${environment}`,
      code: lambda.Code.fromAsset('lambdas/get-quote-by-character'),
      handler: 'index.lambdaHandler',
      timeout: cdk.Duration.seconds(5),
      description: 'Returns a random Kaamelott quote filtered by character name',
    });
    table.grantReadData(getQuoteByCharacter);

    // Lambda: GET /characters
    const getCharacters = new lambda.Function(this, 'GetCharacters', {
      ...lambdaDefaults,
      functionName: `kaamelott-get-characters-${environment}`,
      code: lambda.Code.fromAsset('lambdas/get-characters'),
      handler: 'index.lambdaHandler',
      timeout: cdk.Duration.seconds(10),
      description: 'Returns the sorted list of characters present in DynamoDB',
    });
    table.grantReadData(getCharacters);

    // Lambda: admin loader (no API route)
    const loadQuotes = new lambda.Function(this, 'LoadQuotes', {
      ...lambdaDefaults,
      functionName: `kaamelott-load-quotes-${environment}`,
      code: lambda.Code.fromAsset('lambdas/load-quotes'),
      handler: 'index.lambdaHandler',
      timeout: cdk.Duration.seconds(60),
      memorySize: 512,
      environment: {
        ...commonEnv,
        BUCKET_NAME: bucket.bucketName,
      },
      description: 'One-time loader: reads quotes.json from S3 and batch-writes to DynamoDB',
    });
    table.grantWriteData(loadQuotes);
    bucket.grantRead(loadQuotes);

    // API Gateway
    const api = new apigateway.RestApi(this, 'KaamelottApi', {
      restApiName: `kaamelott-api-${environment}`,
      deployOptions: { stageName: environment },
      defaultCorsPreflightOptions: {
        allowOrigins: apigateway.Cors.ALL_ORIGINS,
        allowMethods: ['GET'],
      },
    });

    const quotes = api.root.addResource('quotes');
    quotes.addMethod('GET', new apigateway.LambdaIntegration(getRandomQuote), {
      apiKeyRequired: true,
    });

    const characterResource = quotes.addResource('{character}');
    characterResource.addMethod('GET', new apigateway.LambdaIntegration(getQuoteByCharacter), {
      apiKeyRequired: true,
    });

    const characters = api.root.addResource('characters');
    characters.addMethod('GET', new apigateway.LambdaIntegration(getCharacters), {
      apiKeyRequired: true,
    });

    const apiKey = new apigateway.ApiKey(this, 'ApiKey', {
      apiKeyName: `kaamelott-${environment}`,
      description: `API key for kaamelott-${environment}`,
    });

    const usagePlan = new apigateway.UsagePlan(this, 'UsagePlan', {
      name: `kaamelott-usage-plan-${environment}`,
      apiStages: [{ api, stage: api.deploymentStage }],
      quota: {
        limit: 1000,
        period: apigateway.Period.DAY,
      },
    });
    usagePlan.addApiKey(apiKey);

    // Outputs
    new cdk.CfnOutput(this, 'ApiKeyId', {
      value: apiKey.keyId,
      description: 'Look up key value: aws apigateway get-api-key --api-key <id> --include-value --region ap-southeast-1 --query value --output text',
    });

    new cdk.CfnOutput(this, 'ApiUrl', {
      value: `${api.url}quotes`,
      description: 'Base API URL — append /{character} to filter by character',
    });
    new cdk.CfnOutput(this, 'LoadQuotesFunctionName', {
      value: loadQuotes.functionName,
      description: 'Invoke once per environment to populate DynamoDB: aws lambda invoke --function-name <value> --region ap-southeast-1 /tmp/out.json',
    });
    new cdk.CfnOutput(this, 'TableName', {
      value: table.tableName,
    });
    new cdk.CfnOutput(this, 'BucketName', {
      value: bucket.bucketName,
    });
  }
}
