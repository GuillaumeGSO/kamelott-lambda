import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Cached across warm invocations — refreshed only on cold start
let cachedQuoteIds = null;

export const lambdaHandler = async () => {
  if (!cachedQuoteIds) {
    const result = await dynamo.send(new ScanCommand({
      TableName: TABLE_NAME,
      ProjectionExpression: 'quoteId',
    }));
    cachedQuoteIds = result.Items.map(i => i.quoteId);
  }

  const randomId = cachedQuoteIds[Math.floor(Math.random() * cachedQuoteIds.length)];
  const result = await dynamo.send(new GetCommand({
    TableName: TABLE_NAME,
    Key: { quoteId: randomId },
  }));

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(result.Item),
  };
};
