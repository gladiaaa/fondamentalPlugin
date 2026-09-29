import { ResendMailer } from './resend.mailer.js';

describe('ResendMailer', () => {
  const mailer = new ResendMailer('re_cle_secrete', 'Fondamental <noreply@fondamentalplugin.fr>');
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("envoie l'e-mail à l'API de Resend avec la clé en en-tête, jamais dans le corps", async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    await mailer.send({ to: 'ada@example.com', subject: 'Bonjour', text: 'Texte' });

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://api.resend.com/emails');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer re_cle_secrete' });
    expect(JSON.parse(init.body as string)).toEqual({
      from: 'Fondamental <noreply@fondamentalplugin.fr>',
      to: ['ada@example.com'],
      subject: 'Bonjour',
      text: 'Texte',
    });
    expect(init.body).not.toContain('re_cle_secrete');
  });

  it('envoie aussi la version HTML quand elle existe', async () => {
    fetchMock.mockResolvedValue(new Response('{"id":"1"}', { status: 200 }));
    await mailer.send({ to: 'ada@example.com', subject: 'Bonjour', text: 'Texte', html: '<p>Texte</p>' });
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ text: 'Texte', html: '<p>Texte</p>' });
  });

  it("en cas d'échec, l'erreur ne contient que le statut (ni l'adresse ni la clé)", async () => {
    fetchMock.mockResolvedValue(new Response('{"message":"adresse ada@example.com invalide"}', { status: 422 }));
    const error = await mailer.send({ to: 'ada@example.com', subject: 's', text: 't' }).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Resend a répondu 422');
  });
});
