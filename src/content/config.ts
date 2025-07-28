import { defineCollection, z } from 'astro:content';

// Define o schema para a coleção 'ativos'
const ativosCollection = defineCollection({
  type: 'content', // ou 'data' se fossem ficheiros JSON/YAML
  schema: z.object({
    title: z.string(),
    /**
     * CORREÇÃO: Adiciona `subtitle` ao schema como uma string opcional.
     * Isto informa o TypeScript que `data.subtitle` pode existir (ou não).
     * O `.optional()` é a chave para a verificação `data.subtitle && ...` funcionar sem erros.
     */
    subtitle: z.string().optional(),
    
    // Adiciona também os outros campos que mencionaste para manter a consistência
    description: z.string(), // Importante para SEO
    date: z.date().optional(), // Data de publicação ou atualização
    
    // Podes adicionar mais campos aqui no futuro
    // Ex: author: z.string().default('Ativos.pt'),
    // Ex: tags: z.array(z.string()).optional(),
  }),
});

// Exporta a coleção para que o Astro a reconheça
export const collections = {
  'ativos': ativosCollection,
};
