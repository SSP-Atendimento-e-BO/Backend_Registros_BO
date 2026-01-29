import {
  beforeAll,
  afterAll,
  beforeEach,
  describe,
  it,
  expect,
  vi,
} from "vitest";
import { fastify } from "fastify";
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";
import { registerBoRoute } from "../../src/http/routes/register_bo.ts";
import { db } from "../../src/db/connection.ts";
import { registerBo } from "../../src/db/schema/register_bo.ts";
import { boAuditLog } from "../../src/db/schema/bo_audit_log.ts";
import * as emailServices from "../../src/services/email.ts";
import { eq } from "drizzle-orm";

function createTestApp() {
  const app = fastify({ logger: false }).withTypeProvider<ZodTypeProvider>();
  app.setSerializerCompiler(serializerCompiler);
  app.setValidatorCompiler(validatorCompiler);
  app.register(registerBoRoute);
  return app;
}

let app: ReturnType<typeof createTestApp>;

beforeAll(async () => {
  app = createTestApp();
  await app.ready();
  it("envia email de atualização quando há email cadastrado", async () => {
    // Mock do serviço de email
    const sendBoUpdateEmailSpy = vi
      .spyOn(emailServices, "sendBoUpdateEmail")
      .mockResolvedValue({ success: true, data: {} });

    // Cria BO com email
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Av. Paulista",
        type_of_occurrence: "Roubo",
        full_name: "Maria Santos",
        relationship_with_the_fact: "Vítima",
        email: "maria@test.com",
      },
    });
    const { id } = create.json();

    // Atualiza
    await app.inject({
      method: "PUT",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-0123",
        full_name: "Maria S.",
      },
    });

    expect(sendBoUpdateEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendBoUpdateEmailSpy).toHaveBeenCalledWith(
      "maria@test.com",
      "Maria Santos",
      id,
      expect.anything(), // diff
      "PM-0123"
    );
  });
});

describe("DELETE /register-bo/:id com auditoria e email", () => {
  it("exclui, audita e envia email com motivo", async () => {
    const sendBoDeletionEmailSpy = vi
      .spyOn(emailServices, "sendBoDeletionEmail")
      .mockResolvedValue({ success: true, data: {} });

    // Cria BO
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Rua Augusta",
        type_of_occurrence: "Furto",
        full_name: "Carlos Lima",
        relationship_with_the_fact: "Vítima",
        email: "carlos@test.com",
      },
    });
    const { id } = create.json();

    // Deleta com motivo
    const del = await app.inject({
      method: "DELETE",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-9999",
        reason: "Registro duplicado",
      },
    });

    expect(del.statusCode).toBe(204);

    // Verifica auditoria
    const logs = await db
      .select()
      .from(boAuditLog)
      .where(eq(boAuditLog.boId, id));
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("delete");
    expect((logs[0].details as any).reason).toBe("Registro duplicado");

    // Verifica envio de email
    expect(sendBoDeletionEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendBoDeletionEmailSpy).toHaveBeenCalledWith(
      "carlos@test.com",
      "Carlos Lima",
      id,
      "Registro duplicado",
      "PM-9999"
    );
  });

  it("exclui sem motivo (opcional) e usa texto padrão", async () => {
    const sendBoDeletionEmailSpy = vi
      .spyOn(emailServices, "sendBoDeletionEmail")
      .mockResolvedValue({ success: true, data: {} });

    // Cria BO
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Rua Augusta",
        type_of_occurrence: "Furto",
        full_name: "Sem Motivo",
        relationship_with_the_fact: "Vítima",
        email: "semmotivo@test.com",
      },
    });
    const { id } = create.json();

    // Deleta SEM motivo
    const del = await app.inject({
      method: "DELETE",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-9999",
      },
    });

    expect(del.statusCode).toBe(204);

    // Verifica auditoria
    const logs = await db
      .select()
      .from(boAuditLog)
      .where(eq(boAuditLog.boId, id));
    expect(logs).toHaveLength(1);
    expect((logs[0].details as any).reason).toBe("Motivo não informado");

    // Verifica envio de email com texto padrão
    expect(sendBoDeletionEmailSpy).toHaveBeenCalledWith(
      "semmotivo@test.com",
      "Sem Motivo",
      id,
      "Motivo não informado",
      "PM-9999"
    );
  });
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  // Limpa tabelas entre testes
  await db.delete(boAuditLog);
  // Limpar mocks
  vi.restoreAllMocks();
});

describe("POST /register-bo", () => {
  it("cria um B.O. e retorna id (201)", async () => {
    const res = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Praça da Sé",
        type_of_occurrence: "Furto",
        full_name: "João da Silva",
        relationship_with_the_fact: "Vítima",
        email: "",
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toMatch(/[0-9a-f-]{36}/);
  });
});

describe("PUT /register-bo/:id com auditoria", () => {
  it("exige police_identifier e registra diff (200)", async () => {
    // Cria BO inicial
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Av. Paulista",
        type_of_occurrence: "Roubo",
        full_name: "Maria Santos",
        relationship_with_the_fact: "Vítima",
        email: "",
      },
    });
    const { id } = create.json();

    // Tenta sem identificador -> 400 por schema? nosso schema exige string, então enviar sem body dará 400
    const missing = await app.inject({
      method: "PUT",
      url: `/register-bo/${id}`,
      payload: {},
    });
    expect(missing.statusCode).toBe(400);

    // Identificador inválido -> 403
    const invalid = await app.inject({
      method: "PUT",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "INVALIDO",
        full_name: "Maria S.",
      },
    });
    expect(invalid.statusCode).toBe(403);

    // Atualiza com identificador válido
    const ok = await app.inject({
      method: "PUT",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-0123",
        full_name: "Maria S.",
        email: "",
      },
    });
    expect(ok.statusCode).toBe(200);
    const updated = ok.json();
    expect(updated.full_name).toBe("Maria S.");

    // Verifica auditoria
    const logs = await db.select().from(boAuditLog);
    expect(logs.length).toBe(1);
    expect(logs[0].action).toBe("update");
    const details: any = logs[0].details as any;
    expect(details.changedKeys).toContain("full_name");
    expect(details.diff.full_name.from).toBe("Maria Santos");
    expect(details.diff.full_name.to).toBe("Maria S.");
  });

  it('ignora "" para campos obrigatórios (não-null)', async () => {
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Centro",
        type_of_occurrence: "Estelionato",
        full_name: "Carlos",
        relationship_with_the_fact: "Vítima",
        email: "",
      },
    });
    const { id } = create.json();

    const res = await app.inject({
      method: "PUT",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-0456",
        full_name: "",
      },
    });
    expect(res.statusCode).toBe(200);
    const updated = res.json();
    expect(updated.full_name).toBe("Carlos"); // não mudou

    const logs = await db.select().from(boAuditLog);
    expect(logs.length).toBe(1);
    const details: any = logs[0].details as any;
    expect(details.changedKeys).not.toContain("full_name");
  });
  it("envia email de atualização quando há email cadastrado", async () => {
    // Mock do serviço de email
    const sendBoUpdateEmailSpy = vi
      .spyOn(emailServices, "sendBoUpdateEmail")
      .mockResolvedValue({ success: true, data: {} });

    // Cria BO com email
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Av. Paulista",
        type_of_occurrence: "Roubo",
        full_name: "Maria Santos",
        relationship_with_the_fact: "Vítima",
        email: "maria@test.com",
      },
    });
    const { id } = create.json();

    // Atualiza
    await app.inject({
      method: "PUT",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-0123",
        full_name: "Maria S.",
      },
    });

    expect(sendBoUpdateEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendBoUpdateEmailSpy).toHaveBeenCalledWith(
      "maria@test.com",
      "Maria Santos",
      id,
      expect.anything(), // diff
      "PM-0123"
    );
  });
});

describe("DELETE /register-bo/:id com auditoria e email", () => {
  it("exclui, audita e envia email com motivo", async () => {
    const sendBoDeletionEmailSpy = vi
      .spyOn(emailServices, "sendBoDeletionEmail")
      .mockResolvedValue({ success: true, data: {} });

    // Cria BO
    const create = await app.inject({
      method: "POST",
      url: "/register-bo",
      payload: {
        date_and_time_of_event: new Date().toISOString(),
        place_of_the_fact: "Rua Augusta",
        type_of_occurrence: "Furto",
        full_name: "Carlos Lima",
        relationship_with_the_fact: "Vítima",
        email: "carlos@test.com",
      },
    });
    const { id } = create.json();

    // Deleta com motivo
    const del = await app.inject({
      method: "DELETE",
      url: `/register-bo/${id}`,
      payload: {
        police_identifier: "PM-9999",
        reason: "Registro duplicado",
      },
    });

    expect(del.statusCode).toBe(204);

    // Verifica auditoria
    const logs = await db
      .select()
      .from(boAuditLog)
      .where(eq(boAuditLog.boId, id));
    expect(logs).toHaveLength(1);
    expect(logs[0].action).toBe("delete");
    expect((logs[0].details as any).reason).toBe("Registro duplicado");

    // Verifica envio de email
    expect(sendBoDeletionEmailSpy).toHaveBeenCalledTimes(1);
    expect(sendBoDeletionEmailSpy).toHaveBeenCalledWith(
      "carlos@test.com",
      "Carlos Lima",
      id,
      "Registro duplicado",
      "PM-9999"
    );
  });
});
