import { defineCollection, z } from 'astro:content';

// Schema para a coleção 'ativos'
const ativos = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    subtitle: z.string().optional(),
    description: z.string(),
    risco: z.enum(["Baixo", "Médio-Baixo", "Médio", "Médio-Alto", "Alto"]),
    liquidez: z.enum(["Diária", "Alta", "Média", "Baixa", "Muito Baixa"]),
    prazo: z.enum(["Curto", "Médio", "Longo", "Muito Longo"]),
    tributacao: z.object({
        taxa: z.string(),
        anexo_irs: z.string(),
        englobamento: z.boolean(),
    })
  }),
});

// Schema para a coleção 'plataformas'
const plataformas = defineCollection({
    type: 'content',
    schema: z.object({
        nome: z.string(),
        // Adicionamos o campo 'description' que faltava
        description: z.string(), 
        logo: z.string(),
        url_afiliado: z.string().url(),
        pontos_chave: z.array(z.string()),
        info_geral: z.object({
            sede: z.string(),
            regulador: z.string(),
            ano_fundacao: z.number(),
        }),
        info_fiscal: z.object({
            retencao_na_fonte_juros: z.string(),
            retencao_na_fonte_dividendos: z.string(),
            formularios_fiscais: z.string(),
        }),
        taxas_principais: z.object({
            custodia: z.string(),
            levantamento: z.string(),
            inactividade: z.string(),
            cambio: z.string(),
        }),
    }),
});

// Exportamos as duas coleções
export const collections = {
  ativos,
  plataformas,
};
