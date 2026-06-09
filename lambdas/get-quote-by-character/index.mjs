import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const TABLE_NAME = process.env.TABLE_NAME;

// Cached per character across warm invocations
const characterCache = new Map();

export const lambdaHandler = async (event) => {
  const raw = event.pathParameters?.character ?? '';
  const character = decodeURIComponent(raw);

  if (!character) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing character parameter' }),
    };
  }

  if (!characterCache.has(character)) {
    const result = await dynamo.send(new QueryCommand({
      TableName: TABLE_NAME,
      IndexName: 'character-index',
      KeyConditionExpression: '#c = :c',
      ExpressionAttributeNames: { '#c': 'character' },
      ExpressionAttributeValues: { ':c': character },
    }));

    if (!result.Items?.length) {
      return {
        statusCode: 404,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: `Character not found: ${character}` }),
      };
    }

    characterCache.set(character, result.Items);
  }

  const items = characterCache.get(character);
  const quote = items[Math.floor(Math.random() * items.length)];

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(quote),
  };
};
