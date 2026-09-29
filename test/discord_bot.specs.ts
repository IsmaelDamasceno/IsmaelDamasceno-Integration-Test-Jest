import 'dotenv/config';
import pactum from 'pactum';
import { SimpleReporter } from '../simple-reporter';
import { StatusCodes } from 'http-status-codes';

describe('Discord API Integration Tests', () => {
  const p = pactum;
  const rep = SimpleReporter;

  const baseUrl = 'https://discord.com/api/v10';

  const token = process.env.DISCORD_TOKEN!;
  const clientId = process.env.CLIENT_ID!;

  p.request.setDefaultTimeout(90000);

  beforeAll(() => {
    p.reporter.add(rep);
  });

  describe('Application', () => {
    it('GET - Busca informações da aplicação', async () => {
      await p
        .spec()
        .get(`${baseUrl}/applications/${clientId}`)
        .withHeaders('Authorization', `Bot ${token}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({
          type: 'object',
          required: ['id', 'name'],
          properties: {
            id: {
              type: 'string'
            },
            name: {
              type: 'string'
            }
          }
        });
    });

    it('GET - Valida o ID da aplicação', async () => {
      await p
        .spec()
        .get(`${baseUrl}/applications/${clientId}`)
        .withHeaders('Authorization', `Bot ${token}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: clientId
        });
    });
  });

  describe('Commands', () => {
    it('GET - Lista os comandos globais da aplicação', async () => {
      await p
        .spec()
        .get(`${baseUrl}/applications/${clientId}/commands`)
        .withHeaders('Authorization', `Bot ${token}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonSchema({
          type: 'array'
        });
    });

    it('POST - Cria um novo comando global', async () => {
      await p
        .spec()
        .post(`${baseUrl}/applications/${clientId}/commands`)
        .withHeaders('Authorization', `Bot ${token}`)
        .withJson({
          name: 'integration-test',
          description: 'Comando criado através de um teste de integração'
        })
        .expectStatus(StatusCodes.CREATED)
        .expectJsonSchema({
          type: 'object',
          required: ['id', 'name', 'description'],
          properties: {
            id: {
              type: 'string'
            },
            name: {
              type: 'string'
            },
            description: {
              type: 'string'
            }
          }
        });
    });

    it('POST - Cria outro comando', async () => {
      await p
        .spec()
        .post(`${baseUrl}/applications/${clientId}/commands`)
        .withHeaders('Authorization', `Bot ${token}`)
        .withJson({
          name: 'integration-ping',
          description: 'Comando de teste para integração'
        })
        .expectStatus(StatusCodes.CREATED)
        .expectBodyContains('integration-ping');
    });

    it('GET - Busca um comando específico', async () => {
      const commandId = await p
        .spec()
        .post(`${baseUrl}/applications/${clientId}/commands`)
        .withHeaders('Authorization', `Bot ${token}`)
        .withJson({
          name: 'integration-get-test',
          description: 'Comando para teste GET'
        })
        .expectStatus(StatusCodes.CREATED)
        .returns('id');

      await p
        .spec()
        .get(
          `${baseUrl}/applications/${clientId}/commands/${commandId}`
        )
        .withHeaders('Authorization', `Bot ${token}`)
        .expectStatus(StatusCodes.OK)
        .expectJsonLike({
          id: commandId,
          name: 'integration-get-test'
        });
    });

    it('DELETE - Remove um comando', async () => {
      const commandId = await p
        .spec()
        .post(`${baseUrl}/applications/${clientId}/commands`)
        .withHeaders('Authorization', `Bot ${token}`)
        .withJson({
          name: 'integration-delete-test',
          description: 'Comando para teste DELETE'
        })
        .expectStatus(StatusCodes.CREATED)
        .returns('id');

      await p
        .spec()
        .delete(
          `${baseUrl}/applications/${clientId}/commands/${commandId}`
        )
        .withHeaders('Authorization', `Bot ${token}`)
        .expectStatus(StatusCodes.NO_CONTENT);
    });

    it('POST - Rejeita comando com nome inválido', async () => {
      await p
        .spec()
        .post(`${baseUrl}/applications/${clientId}/commands`)
        .withHeaders('Authorization', `Bot ${token}`)
        .withJson({
          name: 'COMANDO_INVALIDO!',
          description: 'Teste de comando inválido'
        })
        .expectStatus(StatusCodes.BAD_REQUEST);
    });
  });

  afterAll(() => {
    p.reporter.end();
  });
});
