import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, PutCommand, DeleteCommand, QueryCommand } from '@aws-sdk/lib-dynamodb';

const client = new DynamoDBClient({});
const dynamo = DynamoDBDocumentClient.from(client);
const FAVORITES_TABLE_NAME = process.env.FAVORITES_TABLE_NAME;

const countLikes = async (quoteId) => {
  const result = await dynamo.send(new QueryCommand({
    TableName: FAVORITES_TABLE_NAME,
    KeyConditionExpression: 'quoteId = :qid',
    ExpressionAttributeValues: { ':qid': quoteId },
    Select: 'COUNT',
  }));
  return result.Count ?? 0;
};

export const lambdaHandler = async (event) => {
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Invalid JSON body' }),
    };
  }

  const { quoteId } = body;
  if (!quoteId) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required field: quoteId' }),
    };
  }

  if (typeof body.favorite !== 'boolean') {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required field: favorite (boolean)' }),
    };
  }

  const alias = body.alias?.trim();
  if (!alias) {
    return {
      statusCode: 400,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Missing required field: alias' }),
    };
  }

  if (body.favorite) {
    await dynamo.send(new PutCommand({
      TableName: FAVORITES_TABLE_NAME,
      Item: { quoteId, alias },
    }));
  } else {
    await dynamo.send(new DeleteCommand({
      TableName: FAVORITES_TABLE_NAME,
      Key: { quoteId, alias },
    }));
  }

  const totalLikes = await countLikes(quoteId);

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ quoteId, alias, totalLikes }),
  };
};
