import { reset, seed } from 'drizzle-seed';
import { db, sql } from './connection.ts';
import { schema } from './schema/index.ts';

await reset(db, schema);

await seed(db, schema).refine((f) => {
  return {
    registerBo: {
      count: 5,
      columns: {
        date_and_time_of_event: f.datetime(),
        place_of_the_fact: f.loremIpsum(),
        type_of_occurrence: f.valuesFromArray({
          values:['Roubo', 'Furto', 'Agressão', 'Violência doméstica', 'Acidente de trânsito', 'Outro'],
        }),
        full_name: f.fullName(),
        cpf_or_rg: f.number(), // Ajeitar formato
        date_of_birth: f.date(),
        gender: f.valuesFromArray({
          values:['Masculino', 'Feminino', 'Outro'],
        }),
        nationality: f.valuesFromArray({
          values:['Brasileiro', 'Estrangeiro'],
        }),
        marital_status: f.valuesFromArray({
          values:['Solteiro', 'Casado', 'Divorciado', 'Viúvo'],
        }),
        profession: f.jobTitle(),
        full_address: f.streetAddress(),
        phone_or_cell_phone: f.phoneNumber(),
        email: f.email(),
        relationship_with_the_fact: f.valuesFromArray({
          values:['Vítima','Testemunha','Denunciante','Outro'],
        }),
        transcription: f.loremIpsum(),
      },
    },
  };
});

await sql.end();

// biome-ignore lint/suspicious/noConsole: only used in dev
console.log('Database seeded');
