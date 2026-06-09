import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand, GetCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;
const FAVORITES_TABLE_NAME = process.env.FAVORITES_TABLE_NAME;

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
  const [quoteResult, likesResult] = await Promise.all([
    dynamo.send(new GetCommand({
      TableName: TABLE_NAME,
      Key: { quoteId: randomId },
    })),
    dynamo.send(new QueryCommand({
      TableName: FAVORITES_TABLE_NAME,
      KeyConditionExpression: 'quoteId = :qid',
      ExpressionAttributeValues: { ':qid': randomId },
      Select: 'COUNT',
    })),
  ]);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...quoteResult.Item, likes: likesResult.Count ?? 0 }),
  };
};
