import quotes from './quotes.json' with { type: 'json' };

export const lambdaHandler = async () => {
    const { id, quote } = quotes[Math.floor(Math.random() * quotes.length)];
    return {
        statusCode: 200,
        body: JSON.stringify({ id, quote }),
    };
};
