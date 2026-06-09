import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(new DynamoDBClient({}));
const TABLE_NAME = process.env.TABLE_NAME;

let cachedCharacters = null;

export const lambdaHandler = async () => {
  if (!cachedCharacters) {
    const counts = new Map();
    let lastKey;

    do {
      const result = await dynamo.send(new ScanCommand({
        TableName: TABLE_NAME,
        ProjectionExpression: '#c',
        ExpressionAttributeNames: { '#c': 'character' },
        ExclusiveStartKey: lastKey,
      }));
      for (const item of result.Items) {
        counts.set(item.character, (counts.get(item.character) ?? 0) + 1);
      }
      lastKey = result.LastEvaluatedKey;
    } while (lastKey);

    cachedCharacters = [...counts.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([character, numberOfQuotes]) => ({ character, numberOfQuotes }));
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(cachedCharacters),
  };
};
