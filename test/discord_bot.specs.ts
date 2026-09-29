import 'dotenv/config';
import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { StatusCodes } from 'http-status-codes';

describe('Discord API Integration Tests', () => {
    const p = pactum;
    const rep = SimpleReporter;

    const baseUrl = 'https://discord.com/api/v10';

    const token = process.env.DISCORD_TOKEN;
    const clientId = process.env.CLIENT_ID;
    const guildId = process.env.GUILD_ID;

    if (!token) {
        throw new Error('DISCORD_TOKEN is not defined');
    }

    if (!clientId) {
        throw new Error('CLIENT_ID is not defined');
    }

    if (!guildId) {
        throw new Error('GUILD_ID is not defined');
    }

    const headers = {
        Authorization: `Bot ${token}`,
    };

    const commandsUrl =
        `${baseUrl}/applications/${clientId}/guilds/${guildId}/commands`;

    p.request.setDefaultTimeout(90000);

    const sleep = (ms: number) =>
        new Promise((resolve) => setTimeout(resolve, ms));

    const requestWithRetry = async (
        method: 'get' | 'post' | 'delete',
        url: string,
        body?: object,
        maxRetries = 5,
    ) => {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            const spec = p
                .spec()
            [method](url)
                .withHeaders(headers);

            if (body) {
                spec.withJson(body);
            }

            const response = await spec.toss();

            if (response.statusCode !== StatusCodes.TOO_MANY_REQUESTS) {
                return response;
            }

            if (attempt === maxRetries) {
                return response;
            }

            const retryAfter =
                Number(response.body?.retry_after ?? 1) * 1000;

            await sleep(retryAfter + 1000);
        }

        throw new Error('Unexpected retry state');
    };

    const uniqueCommandName = () => {
        /*
         * Discord command names must be 1-32 characters,
         * lowercase, and may contain letters, numbers,
         * hyphens and underscores.
         */
        return `test-${Date.now().toString().slice(-10)}`;
    };

    const createCommand = async () => {
        const name = uniqueCommandName();

        const response = await requestWithRetry(
            'post',
            commandsUrl,
            {
                name,
                description: 'integration test command',
                type: 1,
            },
        );

        if (response.statusCode !== StatusCodes.CREATED) {
            throw new Error(
                `Discord rejected command creation.\n` +
                `Status: ${response.statusCode}\n` +
                `Body: ${JSON.stringify(response.body)}`,
            );
        }

        return response.body.id as string;
    };

    const deleteCommand = async (commandId: string) => {
        const response = await requestWithRetry(
            'delete',
            `${commandsUrl}/${commandId}`,
        );

        if (
            response.statusCode !== StatusCodes.NO_CONTENT &&
            response.statusCode !== StatusCodes.OK
        ) {
            throw new Error(
                `Discord rejected command deletion.\n` +
                `Status: ${response.statusCode}\n` +
                `Body: ${JSON.stringify(response.body)}`,
            );
        }
    };

    beforeAll(() => {
        p.reporter.add(rep);
    });

    describe('Application', () => {
        it('GET - Busca informações da aplicação', async () => {
            await p
                .spec()
                .get(`${baseUrl}/applications/${clientId}`)
                .withHeaders(headers)
                .expectStatus(StatusCodes.OK)
                .expectJsonSchema({
                    type: 'object',
                    required: ['id'],
                    properties: {
                        id: {
                            type: 'string',
                        },
                    },
                });
        });

        it('GET - Valida o ID da aplicação', async () => {
            await p
                .spec()
                .get(`${baseUrl}/applications/${clientId}`)
                .withHeaders(headers)
                .expectStatus(StatusCodes.OK)
                .expectJsonLike({
                    id: clientId,
                });
        });
    });

    describe('Commands', () => {
        it('GET - Lista os comandos do servidor', async () => {
            const response = await requestWithRetry(
                'get',
                commandsUrl,
            );

            expect(response.statusCode).toBe(StatusCodes.OK);
            expect(Array.isArray(response.body)).toBe(true);
        });

        it('POST - Cria um novo comando', async () => {
            const commandId = await createCommand();

            expect(commandId).toBeDefined();
            expect(typeof commandId).toBe('string');

            await deleteCommand(commandId);
        });

        it('GET - Busca um comando específico', async () => {
            const commandId = await createCommand();

            try {
                const response = await requestWithRetry(
                    'get',
                    `${commandsUrl}/${commandId}`,
                );

                expect(response.statusCode).toBe(StatusCodes.OK);
                expect(response.body.id).toBe(commandId);
            } finally {
                await deleteCommand(commandId);
            }
        });

        it('DELETE - Remove um comando', async () => {
            const commandId = await createCommand();

            await deleteCommand(commandId);

            const response = await requestWithRetry(
                'get',
                `${commandsUrl}/${commandId}`,
            );

            expect(response.statusCode).toBe(StatusCodes.NOT_FOUND);
        });

        it('GET - Rejeita acesso com token inválido', async () => {
            await p
                .spec()
                .get(commandsUrl)
                .withHeaders(
                    'Authorization',
                    'Bot token-invalido',
                )
                .expectStatus(StatusCodes.UNAUTHORIZED);
        });
    });

    afterAll(() => {
        p.reporter.end();
    });
});
